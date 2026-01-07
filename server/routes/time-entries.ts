/**
 * Time Entries Routes
 * API endpoints for tracking billable hours on cases
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { timeEntries, insertTimeEntrySchema, invoices } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, sum } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { z } from "zod";

// Validation middleware
const validateBody = (schema: z.ZodSchema) => (req: Request, res: Response, next: Function) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation error", errors: err.errors });
        }
        throw err;
    }
};

const router = Router();

// Get all time entries for the lawyer
router.get(
    "/",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { applicationId, clientId, isBilled, from, to, page = "1", pageSize = "50" } = req.query;
        const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

        let conditions = [eq(timeEntries.userId, userId)];

        if (applicationId) {
            conditions.push(eq(timeEntries.applicationId, applicationId as string));
        }
        if (clientId) {
            conditions.push(eq(timeEntries.clientId, clientId as string));
        }
        if (isBilled === "true") {
            conditions.push(eq(timeEntries.isBilled, true));
        } else if (isBilled === "false") {
            conditions.push(eq(timeEntries.isBilled, false));
        }
        if (from) {
            conditions.push(gte(timeEntries.date, new Date(from as string)));
        }
        if (to) {
            conditions.push(lte(timeEntries.date, new Date(to as string)));
        }

        const entries = await db
            .select()
            .from(timeEntries)
            .where(and(...conditions))
            .orderBy(desc(timeEntries.date))
            .limit(parseInt(pageSize as string))
            .offset(offset);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(timeEntries)
            .where(and(...conditions));

        // Calculate totals
        const [totals] = await db
            .select({
                totalMinutes: sql<number>`sum(minutes)`,
                billableMinutes: sql<number>`sum(case when is_billable then minutes else 0 end)`,
                unbilledMinutes: sql<number>`sum(case when is_billable and not is_billed then minutes else 0 end)`,
            })
            .from(timeEntries)
            .where(and(...conditions));

        res.json({
            entries,
            total: Number(count),
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            totals: {
                totalHours: Math.round((totals.totalMinutes || 0) / 60 * 100) / 100,
                billableHours: Math.round((totals.billableMinutes || 0) / 60 * 100) / 100,
                unbilledHours: Math.round((totals.unbilledMinutes || 0) / 60 * 100) / 100,
            },
        });
    })
);

// Create time entry
router.post(
    "/",
    authenticate,
    requireRole("lawyer", "admin"),
    validateBody(insertTimeEntrySchema),
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;

        const [entry] = await db
            .insert(timeEntries)
            .values({
                ...req.body,
                userId,
            })
            .returning();

        logger.info({ entryId: entry.id, minutes: entry.minutes }, "Time entry created");
        res.status(201).json(entry);
    })
);

// Update time entry
router.patch(
    "/:id",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Verify ownership
        const existing = await db.query.timeEntries.findFirst({
            where: and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ message: "Time entry not found" });
        }

        if (existing.isBilled) {
            return res.status(400).json({ message: "Cannot edit a billed time entry" });
        }

        const [updated] = await db
            .update(timeEntries)
            .set({
                ...req.body,
                updatedAt: new Date(),
            })
            .where(eq(timeEntries.id, id))
            .returning();

        res.json(updated);
    })
);

// Delete time entry
router.delete(
    "/:id",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Verify ownership
        const existing = await db.query.timeEntries.findFirst({
            where: and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ message: "Time entry not found" });
        }

        if (existing.isBilled) {
            return res.status(400).json({ message: "Cannot delete a billed time entry" });
        }

        await db.delete(timeEntries).where(eq(timeEntries.id, id));
        res.json({ message: "Time entry deleted successfully" });
    })
);

// Mark entries as billed (link to invoice)
router.post(
    "/mark-billed",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { entryIds, invoiceId } = req.body;
        const userId = req.user!.userId;

        if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
            return res.status(400).json({ message: "entryIds array required" });
        }

        // Update all specified entries
        const updated = await db
            .update(timeEntries)
            .set({
                isBilled: true,
                invoiceId: invoiceId || null,
                updatedAt: new Date(),
            })
            .where(and(
                eq(timeEntries.userId, userId),
                sql`${timeEntries.id} = ANY(${entryIds})`
            ))
            .returning();

        res.json({
            message: `${updated.length} entries marked as billed`,
            entries: updated,
        });
    })
);

// Get time summary by client/application
router.get(
    "/summary",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { from, to } = req.query;

        let conditions = [eq(timeEntries.userId, userId)];
        if (from) {
            conditions.push(gte(timeEntries.date, new Date(from as string)));
        }
        if (to) {
            conditions.push(lte(timeEntries.date, new Date(to as string)));
        }

        const byApplication = await db
            .select({
                applicationId: timeEntries.applicationId,
                totalMinutes: sql<number>`sum(minutes)`,
                billableMinutes: sql<number>`sum(case when is_billable then minutes else 0 end)`,
                unbilledMinutes: sql<number>`sum(case when is_billable and not is_billed then minutes else 0 end)`,
                entryCount: sql<number>`count(*)`,
            })
            .from(timeEntries)
            .where(and(...conditions))
            .groupBy(timeEntries.applicationId);

        const byCategory = await db
            .select({
                category: timeEntries.category,
                totalMinutes: sql<number>`sum(minutes)`,
            })
            .from(timeEntries)
            .where(and(...conditions))
            .groupBy(timeEntries.category);

        res.json({ byApplication, byCategory });
    })
);

export default router;
