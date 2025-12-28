/**
 * Leads / CRM Routes
 * API endpoints for managing the lead pipeline
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { leads, insertLeadSchema, applications } from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
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

// Get all leads (with filtering)
router.get(
    "/",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { stage, source, page = "1", pageSize = "20" } = req.query;
        const lawyerId = req.user!.userId;
        const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

        let conditions = [eq(leads.lawyerId, lawyerId)];

        if (stage && stage !== "all") {
            conditions.push(eq(leads.stage, stage as any));
        }

        const allLeads = await db
            .select()
            .from(leads)
            .where(and(...conditions))
            .orderBy(desc(leads.createdAt))
            .limit(parseInt(pageSize as string))
            .offset(offset);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(and(...conditions));

        res.json({
            leads: allLeads,
            total: Number(count),
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
        });
    })
);

// Get lead by ID
router.get(
    "/:id",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const lead = await db.query.leads.findFirst({
            where: eq(leads.id, req.params.id),
        });

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.json(lead);
    })
);

// Create new lead
router.post(
    "/",
    authenticate,
    requireRole("lawyer", "admin"),
    validateBody(insertLeadSchema),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;

        const [newLead] = await db
            .insert(leads)
            .values({
                ...req.body,
                lawyerId,
            })
            .returning();

        logger.info({ leadId: newLead.id, lawyerId }, "New lead created");
        res.status(201).json(newLead);
    })
);

// Update lead
router.patch(
    "/:id",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        const [updated] = await db
            .update(leads)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.json(updated);
    })
);

// Convert lead to application
router.post(
    "/:id/convert",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const lawyerId = req.user!.userId;

        const lead = await db.query.leads.findFirst({
            where: eq(leads.id, id),
        });

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        if (lead.convertedToApplicationId) {
            return res.status(400).json({ message: "Lead already converted" });
        }

        // Create application from lead data
        const [newApp] = await db
            .insert(applications)
            .values({
                userId: lawyerId, // Placeholder - should create user or use existing
                visaType: lead.visaInterest || "Unknown",
                country: lead.country || "UK",
                lawyerId,
                status: "new",
                notes: `Converted from lead. Original notes: ${lead.notes || "None"}`,
                metadata: {
                    leadId: lead.id,
                    applicantName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
                    email: lead.email,
                    phone: lead.phone,
                },
            })
            .returning();

        // Update lead with converted application ID
        await db
            .update(leads)
            .set({
                stage: "converted",
                convertedToApplicationId: newApp.id,
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id));

        logger.info({ leadId: id, applicationId: newApp.id }, "Lead converted to application");

        res.json({
            message: "Lead converted successfully",
            lead: { ...lead, stage: "converted", convertedToApplicationId: newApp.id },
            application: newApp,
        });
    })
);

// Delete lead
router.delete(
    "/:id",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const [deleted] = await db
            .delete(leads)
            .where(eq(leads.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.json({ message: "Lead deleted successfully" });
    })
);

// Get lead pipeline stats
router.get(
    "/stats/pipeline",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;

        const stats = await db
            .select({
                stage: leads.stage,
                count: sql<number>`count(*)`,
                totalValue: sql<number>`sum(estimated_value)`,
            })
            .from(leads)
            .where(eq(leads.lawyerId, lawyerId))
            .groupBy(leads.stage);

        res.json({ stats });
    })
);

export default router;
