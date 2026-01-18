import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { deadlines, users, applications, insertDeadlineSchema } from "@shared/schema";
import { eq, and, lt, gte, desc, asc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);

// GET /api/lawyer-deadlines - Get all deadlines for the lawyer
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const status = req.query.status as string | undefined;

        const results = await db
            .select({
                id: deadlines.id,
                clientId: deadlines.userId, // Map userId to clientId for frontend
                applicationId: deadlines.applicationId,
                type: deadlines.type,
                title: deadlines.title,
                description: deadlines.description,
                dueDate: deadlines.dueDate,
                status: deadlines.status,
                priority: deadlines.priority,
                remindersSent: deadlines.remindersSent,
                notes: deadlines.notes,
                createdAt: deadlines.createdAt,
                clientName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
                clientEmail: users.email,
            })
            .from(deadlines)
            .leftJoin(users, eq(deadlines.userId, users.id))
            .where(eq(deadlines.lawyerId, lawyerId))
            .orderBy(asc(deadlines.dueDate));

        // Calculate days remaining and zone for each deadline
        const now = new Date();
        const enrichedResults = results.map((d) => {
            const dueDate = new Date(d.dueDate);
            const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            let zone: "red" | "amber" | "green" | "overdue" = "green";

            if (daysRemaining < 0) zone = "overdue";
            else if (daysRemaining <= 30) zone = "red";
            else if (daysRemaining <= 60) zone = "amber";

            return { ...d, daysRemaining, zone };
        });

        // Filter by status if provided
        const filtered = status
            ? enrichedResults.filter(d => d.status === status)
            : enrichedResults;

        res.json({ deadlines: filtered });
    })
);

// GET /api/lawyer-deadlines/critical - Get critical deadlines (within 30 days)
router.get(
    "/critical",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const criticalDeadlines = await db
            .select({
                id: deadlines.id,
                clientId: deadlines.userId,
                type: deadlines.type,
                title: deadlines.title,
                dueDate: deadlines.dueDate,
                priority: deadlines.priority,
                clientName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
            })
            .from(deadlines)
            .leftJoin(users, eq(deadlines.userId, users.id))
            .where(
                and(
                    eq(deadlines.lawyerId, lawyerId),
                    eq(deadlines.status, "active"),
                    lt(deadlines.dueDate, thirtyDaysFromNow)
                )
            )
            .orderBy(asc(deadlines.dueDate));

        const now = new Date();
        const enriched = criticalDeadlines.map((d) => {
            const dueDate = new Date(d.dueDate);
            const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return { ...d, daysRemaining, zone: daysRemaining < 0 ? "overdue" : "red" };
        });

        res.json({ critical: enriched, count: enriched.length });
    })
);

// GET /api/lawyer-deadlines/stats - Get deadline statistics
router.get(
    "/stats",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        const allDeadlines = await db
            .select()
            .from(deadlines)
            .where(and(eq(deadlines.lawyerId, lawyerId), eq(deadlines.status, "active")));

        const stats = {
            total: allDeadlines.length,
            overdue: allDeadlines.filter(d => new Date(d.dueDate) < now).length,
            red: allDeadlines.filter(d => {
                const due = new Date(d.dueDate);
                return due >= now && due <= thirtyDays;
            }).length,
            amber: allDeadlines.filter(d => {
                const due = new Date(d.dueDate);
                return due > thirtyDays && due <= sixtyDays;
            }).length,
            green: allDeadlines.filter(d => new Date(d.dueDate) > sixtyDays).length,
        };

        res.json(stats);
    })
);

// POST /api/lawyer-deadlines - Create a new deadline
router.post(
    "/",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId, ...otherData } = req.body;
        const body = { ...otherData, userId: clientId, lawyerId };

        // Validate
        const validated = insertDeadlineSchema.parse(body);

        const [newDeadline] = await db
            .insert(deadlines)
            .values(validated)
            .returning();

        logger.info({ lawyerId, deadlineId: newDeadline.id }, "Deadline created");
        res.status(201).json(newDeadline);
    })
);

// PATCH /api/lawyer-deadlines/:id - Update a deadline
router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const deadlineId = req.params.id;

        // Verify ownership
        const [existing] = await db
            .select()
            .from(deadlines)
            .where(and(eq(deadlines.id, deadlineId), eq(deadlines.lawyerId, lawyerId)));

        if (!existing) {
            throw new AppError(404, "Deadline not found");
        }

        const updateData: any = {};
        const allowedFields = ["title", "description", "dueDate", "status", "priority", "notes", "type"];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }
        updateData.updatedAt = new Date();

        const [updated] = await db
            .update(deadlines)
            .set(updateData)
            .where(eq(deadlines.id, deadlineId))
            .returning();

        res.json(updated);
    })
);

// DELETE /api/lawyer-deadlines/:id - Delete a deadline
router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const deadlineId = req.params.id;

        const result = await db
            .delete(deadlines)
            .where(and(eq(deadlines.id, deadlineId), eq(deadlines.lawyerId, lawyerId)))
            .returning();

        if (result.length === 0) {
            throw new AppError(404, "Deadline not found");
        }

        res.json({ success: true, message: "Deadline deleted" });
    })
);

// POST /api/lawyer-deadlines/:id/remind - Send reminder for a deadline
router.post(
    "/:id/remind",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const deadlineId = req.params.id;

        const [deadline] = await db
            .select()
            .from(deadlines)
            .where(and(eq(deadlines.id, deadlineId), eq(deadlines.lawyerId, lawyerId)));

        if (!deadline) {
            throw new AppError(404, "Deadline not found");
        }

        // Get client info
        const [client] = await db.select().from(users).where(eq(users.id, deadline.userId));

        // TODO: Send email reminder via email service
        // For now, just increment reminder count
        const [updated] = await db
            .update(deadlines)
            .set({
                remindersSent: (deadline.remindersSent || 0) + 1,
                lastReminderAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(deadlines.id, deadlineId))
            .returning();

        logger.info({ deadlineId, clientId: deadline.userId }, "Reminder sent for deadline");
        res.json({ success: true, remindersSent: updated.remindersSent });
    })
);

// POST /api/lawyer-deadlines/bulk-create - Create multiple deadlines
router.post(
    "/bulk-create",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId, applicationId, deadlines: deadlinesList } = req.body;

        if (!Array.isArray(deadlinesList) || deadlinesList.length === 0) {
            throw new AppError(400, "deadlines array is required");
        }

        const toInsert = deadlinesList.map((d: any) => ({
            userId: clientId,
            lawyerId,
            applicationId,
            type: d.type || "custom",
            title: d.title,
            description: d.description,
            dueDate: new Date(d.dueDate),
            priority: d.priority || "medium",
        }));

        const created = await db.insert(deadlines).values(toInsert).returning();
        res.status(201).json({ created: created.length, deadlines: created });
    })
);

export default router;
