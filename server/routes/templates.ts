/**
 * Templates Routes
 * API for managing document templates with placeholders
 */

import { Router } from "express";
import { db } from "../db";
import { eq, and, or } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError, ErrorCode } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();

// In-memory templates table (can be moved to database later)
interface Template {
    id: string;
    userId: string;
    name: string;
    documentType: string;
    visaType?: string;
    content: string;
    placeholders: string[];
    language: string;
    createdAt: Date;
    updatedAt: Date;
}

const templates = new Map<string, Template>();

// Validation schemas
const createTemplateSchema = z.object({
    name: z.string().min(1).max(255),
    documentType: z.string().min(1).max(100),
    visaType: z.string().max(100).optional(),
    content: z.string().min(10),
    language: z.string().length(2).default("en"),
});

const updateTemplateSchema = createTemplateSchema.partial();

// Extract placeholders from content (look for {{placeholder}} patterns)
function extractPlaceholders(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1].trim())));
}

// Get all templates for user
router.get(
    "/",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { documentType, visaType } = req.query;

        let userTemplates = Array.from(templates.values()).filter(
            t => t.userId === userId
        );

        if (documentType) {
            userTemplates = userTemplates.filter(t => t.documentType === documentType);
        }

        if (visaType) {
            userTemplates = userTemplates.filter(t => !t.visaType || t.visaType === visaType);
        }

        res.json(userTemplates);
    })
);

// Get single template
router.get(
    "/:id",
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;

        const template = templates.get(id);

        if (!template) {
            throw new AppError(404, "Template not found", ErrorCode.NOT_FOUND);
        }

        if (template.userId !== userId) {
            throw new AppError(403, "Access denied", ErrorCode.FORBIDDEN);
        }

        res.json(template);
    })
);

// Create template
router.post(
    "/",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const data = createTemplateSchema.parse(req.body);

        const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const placeholders = extractPlaceholders(data.content);

        const template: Template = {
            id,
            userId,
            name: data.name,
            documentType: data.documentType,
            visaType: data.visaType,
            content: data.content,
            placeholders,
            language: data.language,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        templates.set(id, template);

        logger.info({ templateId: id, userId }, "Template created");

        res.status(201).json(template);
    })
);

// Update template
router.patch(
    "/:id",
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;
        const updates = updateTemplateSchema.parse(req.body);

        const template = templates.get(id);

        if (!template) {
            throw new AppError(404, "Template not found", ErrorCode.NOT_FOUND);
        }

        if (template.userId !== userId) {
            throw new AppError(403, "Access denied", ErrorCode.FORBIDDEN);
        }

        const updated = {
            ...template,
            ...updates,
            updatedAt: new Date(),
        };

        if (updates.content) {
            updated.placeholders = extractPlaceholders(updates.content);
        }

        templates.set(id, updated);

        logger.info({ templateId: id, userId }, "Template updated");

        res.json(updated);
    })
);

// Delete template
router.delete(
    "/:id",
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;

        const template = templates.get(id);

        if (!template) {
            throw new AppError(404, "Template not found", ErrorCode.NOT_FOUND);
        }

        if (template.userId !== userId) {
            throw new AppError(403, "Access denied", ErrorCode.FORBIDDEN);
        }

        templates.delete(id);

        logger.info({ templateId: id, userId }, "Template deleted");

        res.json({ message: "Template deleted successfully" });
    })
);

// Use template (fill placeholders and generate document)
router.post(
    "/:id/use",
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;
        const { values } = req.body; // { placeholder: value }

        const template = templates.get(id);

        if (!template) {
            throw new AppError(404, "Template not found", ErrorCode.NOT_FOUND);
        }

        if (template.userId !== userId) {
            throw new AppError(403, "Access denied", ErrorCode.FORBIDDEN);
        }

        // Replace placeholders
        let content = template.content;
        for (const [key, value] of Object.entries(values || {})) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
            content = content.replace(regex, String(value));
        }

        res.json({
            content,
            originalTemplate: template.name,
            missingPlaceholders: template.placeholders.filter(p => !values[p]),
        });
    })
);

export default router;
