import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { invoices, invoiceItems, timeEntries, applications, users } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();

// Middleware: All routes require authentication
router.use(authenticate);

// === INVOICES ===

// Get all invoices (Lawyer: all created by them, Client: all received)
router.get(
    "/invoices",
    asyncHandler(async (req, res) => {
        const user = req.user!;

        // Filters
        const status = req.query.status as string;
        const clientId = req.query.clientId as string;

        let conditions = [];

        if (user.role === "lawyer") {
            conditions.push(eq(invoices.lawyerId, user.userId));
            if (clientId) conditions.push(eq(invoices.clientId, clientId));
        } else {
            conditions.push(eq(invoices.clientId, user.userId));
        }

        if (status && status !== "all") {
            conditions.push(eq(invoices.status, status));
        }

        const results = await db.query.invoices.findMany({
            where: and(...conditions),
            orderBy: desc(invoices.issueDate),
            with: {
                items: true, // Fetch line items too
            }
        });

        res.json(results);
    })
);

// Create Invoice (Lawyer only)
const createInvoiceSchema = z.object({
    clientId: z.string().min(1, "Client ID required"),
    applicationId: z.string().optional(),
    number: z.string().min(1, "Invoice number required"),
    issueDate: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
        description: z.string().min(1, "Description required"),
        quantity: z.number().min(0.1),
        rate: z.number().min(0),
        amount: z.number().min(0),
    })).min(1, "At least one item required"),
});

router.post(
    "/invoices",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        if (user.role !== "lawyer") throw new AppError(403, "Only lawyers can create invoices");

        const body = createInvoiceSchema.parse(req.body);

        // Calculate total amount
        const totalAmount = body.items.reduce((sum, item) => sum + item.amount, 0);

        // Transaction to create invoice and items
        const result = await db.transaction(async (tx) => {
            // Create Invoice
            const [invoice] = await tx.insert(invoices).values({
                lawyerId: user.userId,
                clientId: body.clientId,
                applicationId: body.applicationId,
                number: body.number,
                status: "draft",
                amount: totalAmount.toFixed(2),
                issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
                dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                notes: body.notes,
            }).returning();

            // Create Items
            for (const item of body.items) {
                await tx.insert(invoiceItems).values({
                    invoiceId: invoice.id,
                    description: item.description,
                    quantity: item.quantity.toString(),
                    rate: item.rate.toString(),
                    amount: item.amount.toString(),
                });
            }

            return invoice;
        });

        res.status(201).json(result);
    })
);

// Update Invoice Status (e.g., mark as paid)
router.patch(
    "/invoices/:id",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        const { id } = req.params;
        const { status } = req.body;

        if (!status) throw new AppError(400, "Status required");

        // Check ownership
        const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, id),
        });

        if (!invoice) throw new AppError(404, "Invoice not found");
        if (user.role === "lawyer" && invoice.lawyerId !== user.userId) throw new AppError(403, "Access denied");

        // Clients can't update status directly properly in this MVP (handled via Stripe usually), 
        // but we'll allow lawyers to mark as paid manually
        if (user.role !== "lawyer") throw new AppError(403, "Only lawyers can update invoice status");

        const updates: any = { status };
        if (status === "paid") {
            updates.paidDate = new Date();
        }

        const [updated] = await db.update(invoices)
            .set(updates)
            .where(eq(invoices.id, id))
            .returning();

        res.json(updated);
    })
);

// === TIME ENTRIES ===

// Get time entries
router.get(
    "/time-entries",
    asyncHandler(async (req, res) => {
        const user = req.user!;

        // Filters
        const clientId = req.query.clientId as string;
        const status = req.query.status as string; // 'unbilled', 'billed'

        const filters = [eq(timeEntries.lawyerId, user.userId)];

        // If not lawyer, maybe allow seeing own time spent on? 
        // Usually only lawyers see detailed time logs internally, but client might want to see.
        // For now restrict to lawyer only for management.
        if (user.role !== "lawyer") throw new AppError(403, "Only lawyers can view time entries");

        if (clientId) filters.push(eq(timeEntries.clientId, clientId));
        if (status) filters.push(eq(timeEntries.status, status));

        const results = await db.query.timeEntries.findMany({
            where: and(...filters),
            orderBy: desc(timeEntries.date),
        });

        res.json(results);
    })
);

// Log Time
const logTimeSchema = z.object({
    clientId: z.string().optional(),
    applicationId: z.string().optional(),
    description: z.string().min(1, "Description required"),
    duration: z.number().int().min(1, "Duration must be at least 1 minute"),
    isBillable: z.boolean().default(true),
    rate: z.number().min(0).optional(),
    date: z.string().optional(),
});

router.post(
    "/time-entries",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        if (user.role !== "lawyer") throw new AppError(403, "Only lawyers can log time");

        const body = logTimeSchema.parse(req.body);

        // Calculate amount if billable
        const rate = body.rate || 150; // Default rate if not set, should be fetched from lawyer settings ideally
        const amount = body.isBillable ? (body.duration / 60) * rate : 0;

        const [entry] = await db.insert(timeEntries).values({
            lawyerId: user.userId,
            clientId: body.clientId,
            applicationId: body.applicationId,
            description: body.description,
            duration: body.duration,
            isBillable: body.isBillable,
            rate: rate.toString(),
            amount: amount.toFixed(2),
            date: body.date ? new Date(body.date) : new Date(),
            status: "unbilled",
        }).returning();

        res.status(201).json(entry);
    })
);

// === STATS ===

router.get(
    "/stats/revenue",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        if (user.role !== "lawyer") throw new AppError(403, "Access denied");

        // Total billed
        const [totalBilledResult] = await db
            .select({ value: sql<number>`sum(amount)` })
            .from(invoices)
            .where(and(eq(invoices.lawyerId, user.userId), eq(invoices.status, "paid")));

        // Unbilled time
        const [unbilledTimeResult] = await db
            .select({ value: sql<number>`sum(amount)` })
            .from(timeEntries)
            .where(and(eq(timeEntries.lawyerId, user.userId), eq(timeEntries.status, "unbilled")));

        // Overdue invoices
        const [overdueResult] = await db
            .select({ value: sql<number>`sum(amount)` })
            .from(invoices)
            .where(and( // overdue = sent status + due date < now
                eq(invoices.lawyerId, user.userId),
                eq(invoices.status, "sent"),
                sql`due_date < now()`
            ));

        res.json({
            totalRevenue: Number(totalBilledResult?.value || 0),
            unbilledAmount: Number(unbilledTimeResult?.value || 0),
            overdueAmount: Number(overdueResult?.value || 0),
        });
    })
);

export default router;
