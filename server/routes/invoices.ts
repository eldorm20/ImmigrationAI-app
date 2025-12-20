import { Router } from "express";
import { db } from "../db";
import { invoices, insertInvoiceSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(authenticate);

// Get invoices (Lawyers get all they created, applicants get theirs)
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const role = req.user!.role;

        let where;
        if (role === "applicant") {
            where = eq(invoices.applicantId, userId);
        } else {
            where = eq(invoices.lawyerId, userId);
        }

        const allInvoices = await db.query.invoices.findMany({
            where,
            orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
        });
        res.json(allInvoices);
    })
);

// Create a new invoice (Lawyers only)
router.post(
    "/",
    requireRole("lawyer", "admin"),
    validateBody(insertInvoiceSchema),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const [invoice] = await db
            .insert(invoices)
            .values({
                ...req.body,
                lawyerId,
            })
            .returning();
        res.status(201).json(invoice);
    })
);

// Update an invoice status (Lawyer or Admin)
router.patch(
    "/:id",
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

        const [updatedInvoice] = await db
            .update(invoices)
            .set({
                ...req.body,
                updatedAt: new Date(),
            })
            .where(and(eq(invoices.id, id), eq(invoices.lawyerId, lawyerId)))
            .returning();

        if (!updatedInvoice) {
            return res.status(404).json({ message: "Invoice not found or access denied" });
        }

        res.json(updatedInvoice);
    })
);

export default router;
