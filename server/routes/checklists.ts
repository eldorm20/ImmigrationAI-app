/**
 * Checklists Routes
 * API endpoints for managing document checklists per visa type
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { documentChecklists, checklistItems, documents, applications } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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

// Default checklist templates per visa type
const DEFAULT_CHECKLISTS: Record<string, { name: string; items: Array<{ name: string; required: boolean; category: string }> }> = {
    "uk_skilled_worker": {
        name: "UK Skilled Worker Visa Checklist",
        items: [
            { name: "Valid Passport (min 6 months)", required: true, category: "Identity" },
            { name: "Passport-sized Photos (2)", required: true, category: "Identity" },
            { name: "Certificate of Sponsorship (CoS)", required: true, category: "Sponsorship" },
            { name: "English Language Certificate (IELTS/equivalent)", required: true, category: "Language" },
            { name: "TB Test Certificate", required: true, category: "Medical" },
            { name: "Bank Statements (last 28 days)", required: true, category: "Financial" },
            { name: "Employment Contract", required: true, category: "Employment" },
            { name: "Academic Qualifications", required: false, category: "Education" },
            { name: "Previous UK Visa (if any)", required: false, category: "Immigration" },
            { name: "Criminal Record Certificate", required: false, category: "Legal" },
        ]
    },
    "uk_student": {
        name: "UK Student Visa Checklist",
        items: [
            { name: "Valid Passport", required: true, category: "Identity" },
            { name: "CAS (Confirmation of Acceptance)", required: true, category: "Education" },
            { name: "IELTS/English Test Results", required: true, category: "Language" },
            { name: "Financial Evidence (28 days)", required: true, category: "Financial" },
            { name: "TB Test Certificate", required: true, category: "Medical" },
            { name: "Academic Transcripts", required: true, category: "Education" },
            { name: "ATAS Certificate (if STEM)", required: false, category: "Education" },
            { name: "Parent Consent (if under 18)", required: false, category: "Legal" },
        ]
    },
    "uzbekistan_work": {
        name: "Uzbekistan Work Visa Checklist",
        items: [
            { name: "Valid Passport (min 1 year)", required: true, category: "Identity" },
            { name: "Passport Photos (4x5cm, 4 pieces)", required: true, category: "Identity" },
            { name: "Work Permit from Ministry of Labor", required: true, category: "Employment" },
            { name: "Invitation Letter from Employer", required: true, category: "Employment" },
            { name: "Medical Certificate (HIV negative)", required: true, category: "Medical" },
            { name: "Employment Contract (notarized)", required: true, category: "Employment" },
            { name: "Company Registration Documents", required: true, category: "Legal" },
            { name: "Education Diploma (apostilled)", required: false, category: "Education" },
        ]
    },
    "uzbekistan_business": {
        name: "Uzbekistan Business Visa Checklist",
        items: [
            { name: "Valid Passport", required: true, category: "Identity" },
            { name: "Business Invitation from UZ Company", required: true, category: "Business" },
            { name: "Company Letter of Introduction", required: true, category: "Business" },
            { name: "Passport Photos (2)", required: true, category: "Identity" },
            { name: "Application Form", required: true, category: "Application" },
            { name: "Bank Statement", required: false, category: "Financial" },
        ]
    },
};

// Get all checklist templates
router.get(
    "/templates",
    authenticate,
    asyncHandler(async (req, res) => {
        const templates = await db
            .select()
            .from(documentChecklists)
            .where(eq(documentChecklists.isTemplate, true))
            .orderBy(documentChecklists.visaType);

        // Include default templates if not in DB
        const defaultTemplates = Object.entries(DEFAULT_CHECKLISTS).map(([visaType, data]) => ({
            id: `default_${visaType}`,
            visaType,
            country: visaType.startsWith("uk_") ? "UK" : visaType.startsWith("uzbekistan_") ? "UZ" : "XX",
            name: data.name,
            items: data.items,
            isTemplate: true,
            isDefault: true,
        }));

        res.json({ templates: [...templates, ...defaultTemplates] });
    })
);

// Get checklist for a specific application
router.get(
    "/application/:applicationId",
    authenticate,
    asyncHandler(async (req, res) => {
        const { applicationId } = req.params;

        // Get application to determine visa type
        const app = await db.query.applications.findFirst({
            where: eq(applications.id, applicationId),
        });

        if (!app) {
            return res.status(404).json({ message: "Application not found" });
        }

        // Get checklist items for this application
        const items = await db
            .select()
            .from(checklistItems)
            .where(eq(checklistItems.applicationId, applicationId))
            .orderBy(checklistItems.order);

        // Calculate progress
        const totalRequired = items.filter(i => i.isRequired).length;
        const completedRequired = items.filter(i => i.isRequired && i.isCompleted).length;
        const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

        res.json({
            applicationId,
            visaType: app.visaType,
            items,
            progress,
            stats: {
                total: items.length,
                completed: items.filter(i => i.isCompleted).length,
                required: totalRequired,
                requiredCompleted: completedRequired,
            },
        });
    })
);

// Initialize checklist for application (from template)
router.post(
    "/application/:applicationId/init",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { applicationId } = req.params;
        const { templateId } = req.body;

        // Get application
        const app = await db.query.applications.findFirst({
            where: eq(applications.id, applicationId),
        });

        if (!app) {
            return res.status(404).json({ message: "Application not found" });
        }

        // Check if already has checklist
        const existing = await db.query.checklistItems.findFirst({
            where: eq(checklistItems.applicationId, applicationId),
        });

        if (existing) {
            return res.status(400).json({ message: "Application already has a checklist" });
        }

        // Get template items
        let templateItems: Array<{ name: string; required: boolean; category: string }>;
        let checklistId: string | null = null;

        if (templateId?.startsWith("default_")) {
            const key = templateId.replace("default_", "");
            templateItems = DEFAULT_CHECKLISTS[key]?.items || [];
        } else if (templateId) {
            const template = await db.query.documentChecklists.findFirst({
                where: eq(documentChecklists.id, templateId),
            });
            templateItems = (template?.items as any) || [];
            checklistId = template?.id || null;
        } else {
            // Try to find matching template
            const visaKey = app.visaType.toLowerCase().replace(/\s+/g, "_");
            templateItems = DEFAULT_CHECKLISTS[visaKey]?.items || [];
        }

        // Create checklist items
        const newItems = templateItems.map((item, index) => ({
            applicationId,
            checklistId,
            name: item.name,
            category: item.category,
            isRequired: item.required,
            isCompleted: false,
            order: index,
        }));

        if (newItems.length > 0) {
            await db.insert(checklistItems).values(newItems);
        }

        logger.info({ applicationId, itemCount: newItems.length }, "Checklist initialized");

        res.json({
            message: "Checklist initialized",
            itemCount: newItems.length,
        });
    })
);

// Update checklist item
router.patch(
    "/items/:itemId",
    authenticate,
    asyncHandler(async (req, res) => {
        const { itemId } = req.params;
        const { isCompleted, documentId, notes } = req.body;
        const userId = req.user!.userId;

        const updates: any = { updatedAt: new Date() };

        if (typeof isCompleted === "boolean") {
            updates.isCompleted = isCompleted;
            if (isCompleted) {
                updates.completedAt = new Date();
                updates.completedBy = userId;
            } else {
                updates.completedAt = null;
                updates.completedBy = null;
            }
        }

        if (documentId !== undefined) {
            updates.documentId = documentId;
        }

        if (notes !== undefined) {
            updates.notes = notes;
        }

        const [updated] = await db
            .update(checklistItems)
            .set(updates)
            .where(eq(checklistItems.id, itemId))
            .returning();

        if (!updated) {
            return res.status(404).json({ message: "Checklist item not found" });
        }

        res.json(updated);
    })
);

// Auto-check items based on uploaded documents
router.post(
    "/application/:applicationId/auto-check",
    authenticate,
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { applicationId } = req.params;

        // Get all documents for this application
        const docs = await db
            .select()
            .from(documents)
            .where(eq(documents.applicationId, applicationId));

        // Get all checklist items
        const items = await db
            .select()
            .from(checklistItems)
            .where(eq(checklistItems.applicationId, applicationId));

        let matchedCount = 0;

        // Simple keyword matching
        for (const item of items) {
            if (item.isCompleted) continue;

            const keywords = item.name.toLowerCase().split(/\s+/);

            for (const doc of docs) {
                const docName = (doc.fileName || "").toLowerCase();
                const docType = (doc.documentType || "").toLowerCase();

                // Check if document matches checklist item
                const matches = keywords.some(kw =>
                    kw.length > 3 && (docName.includes(kw) || docType.includes(kw))
                );

                if (matches) {
                    await db
                        .update(checklistItems)
                        .set({
                            isCompleted: true,
                            completedAt: new Date(),
                            documentId: doc.id,
                            updatedAt: new Date(),
                        })
                        .where(eq(checklistItems.id, item.id));

                    matchedCount++;
                    break;
                }
            }
        }

        res.json({
            message: `Auto-checked ${matchedCount} items`,
            matchedCount,
        });
    })
);

export default router;
