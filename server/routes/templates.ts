import { Router } from "express";
import { db } from "../db";
import { templates, insertTemplateSchema, users } from "@shared/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler, AppError, ErrorCode } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);

// Extract placeholders from content (look for {{placeholder}} patterns)
function extractPlaceholders(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1].trim())));
}

// Get all templates (System templates + User's own templates)
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { documentType, category } = req.query;

        try {
            // Robust selection using the table directly instead of db.query
            const results = await db.select()
                .from(templates)
                .where(or(
                    eq(templates.isSystem, true),
                    eq(templates.userId, userId)
                ))
                .orderBy(sql`${templates.createdAt} DESC`);

            let filtered = results;
            if (documentType) {
                filtered = filtered.filter(t => t.documentType === (documentType as string));
            }
            if (category) {
                filtered = filtered.filter(t => t.category === (category as string));
            }

            res.json(filtered);
        } catch (error: any) {
            logger.error({
                msg: "Failed to fetch templates",
                error: error.message,
                stack: error.stack,
                userId,
                query: req.query
            });
            res.status(500).json({
                error: "Failed to fetch templates",
                details: error.message
            });
        }
    })
);

// Get single template
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;

        const template = await db.query.templates.findFirst({
            where: eq(templates.id, id)
        });

        if (!template) {
            throw new AppError(404, "Template not found", ErrorCode.NOT_FOUND);
        }

        if (!template.isSystem && template.userId !== userId) {
            throw new AppError(403, "Access denied", ErrorCode.FORBIDDEN);
        }

        res.json(template);
    })
);

// Create template (Lawyers only)
router.post(
    "/",
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const data = insertTemplateSchema.parse(req.body);
        const placeholders = extractPlaceholders(data.content);

        const [template] = await db
            .insert(templates)
            .values({
                ...data,
                userId,
                placeholders,
            })
            .returning();

        logger.info({ templateId: template.id, userId }, "Template created");
        res.status(201).json(template);
    })
);

// Update template
router.patch(
    "/:id",
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;
        const updates = insertTemplateSchema.partial().parse(req.body);

        const [existing] = await db.select().from(templates)
            .where(eq(templates.id, id))
            .limit(1);

        if (!existing) {
            throw new AppError(404, "Template not found", ErrorCode.NOT_FOUND);
        }

        if (existing.userId !== userId && !req.user!.role.includes('admin')) {
            throw new AppError(403, "Access denied", ErrorCode.FORBIDDEN);
        }

        const placeholders = updates.content ? extractPlaceholders(updates.content) : existing.placeholders;

        const [updated] = await db
            .update(templates)
            .set({
                ...updates,
                placeholders,
                updatedAt: new Date(),
            })
            .where(eq(templates.id, id))
            .returning();

        res.json(updated);
    })
);

// Use template
router.post(
    "/:id/use",
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;
        const { values } = req.body;

        const [template] = await db.select().from(templates)
            .where(eq(templates.id, id))
            .limit(1);

        if (!template) {
            throw new AppError(404, "Template not found", ErrorCode.NOT_FOUND);
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
            missingPlaceholders: template.placeholders.filter(p => !values?.[p]),
        });
    })
);

// Seed specialized templates if they don't exist
export async function seedSpecializedTemplates(lawyerId: string) {
    const specialized = [
        {
            name: "Affidavit of Support (I-864)",
            description: "Financial sponsorship verification for immigration cases.",
            category: "contract",
            documentType: "legal_affidavit",
            content: "I, {{sponsor_name}}, residing at {{sponsor_address}}, do hereby swear and affirm that I will support {{applicant_name}} during their stay in the United States...",
            isSystem: true
        },
        {
            name: "Employment Verification Letter",
            description: "Standardized format for verifying current employment status.",
            category: "letter",
            documentType: "employment_record",
            content: "To whom it may concern,\n\nThis letter is to confirm that {{employee_name}} is currently employed at {{company_name}} as a {{job_title}} since {{start_date}}...",
            isSystem: true
        }
    ];

    for (const tpl of specialized) {
        const [existing] = await db.select().from(templates)
            .where(and(eq(templates.name, tpl.name), eq(templates.isSystem, true)))
            .limit(1);

        if (!existing) {
            await db.insert(templates).values({
                ...tpl,
                userId: lawyerId,
                placeholders: extractPlaceholders(tpl.content)
            });
        }
    }
}

export default router;
