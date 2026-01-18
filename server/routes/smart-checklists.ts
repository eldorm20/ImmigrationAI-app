import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { smartChecklists, smartChecklistItems, users, applications } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { agentsManager } from "../lib/agents";

const router = Router();

router.use(authenticate);

// Document requirements by visa type
const VISA_DOCUMENT_REQUIREMENTS: Record<string, { category: string; items: string[]; validation?: string }[]> = {
    "uk_skilled_worker": [
        { category: "Identity", items: ["Valid Passport (min 6 months validity)", "Passport-size photos (2x)", "Previous visa grants/stamps"], validation: "Check expiry date > 6 months" },
        { category: "Sponsorship", items: ["Certificate of Sponsorship (CoS)", "Sponsor License Number confirmation"], validation: "Verify CoS reference is active" },
        { category: "Financial", items: ["Bank statements (last 28 days)", "Evidence of salary if already employed"], validation: "Balance must show £1,270+ held for 28 consecutive days" },
        { category: "Qualifications", items: ["Degree certificates", "NARIC/ENIC equivalency (if non-UK degree)", "Professional certificates"], validation: "Match to SOC code requirements" },
        { category: "English", items: ["IELTS/TOEFL certificate or exempt evidence"], validation: "CEFR B1 minimum or exempt nationality" }
    ],
    "uk_student": [
        { category: "Identity", items: ["Valid Passport", "Passport photos", "Previous UK visas if any"], validation: "min 6 months validity" },
        { category: "Academic", items: ["CAS letter from university", "Unconditional offer letter", "Academic transcripts", "ATAS certificate (if required)"], validation: "CAS must be valid and unused" },
        { category: "Financial", items: ["Bank statements (28 days)", "Sponsor letter if funded by third party"], validation: "Course fees + 9 months living costs" },
        { category: "TB Test", items: ["TB test certificate (if from listed country)"], validation: "Must be from approved clinic" }
    ],
    "uk_family": [
        { category: "Identity", items: ["Applicant passport", "Sponsor passport copy", "Birth certificates"], validation: "All must be certified copies" },
        { category: "Relationship", items: ["Marriage certificate", "Civil partnership certificate", "Photos of relationship", "Communication records"], validation: "Evidence of genuine relationship" },
        { category: "Accommodation", items: ["Tenancy agreement or property deed", "Letter from landlord"], validation: "Must be adequate without public funds" },
        { category: "Financial", items: ["Sponsor bank statements (6 months)", "Employment contract", "Payslips (6 months)", "P60"], validation: "£18,600+ gross annual income" },
        { category: "English", items: ["English test certificate (A1 for entry, A2 for extension)"], validation: "From approved test provider" }
    ],
    "schengen_tourist": [
        { category: "Identity", items: ["Passport (valid 3+ months beyond stay)", "Passport photos"], validation: "2 blank pages required" },
        { category: "Travel", items: ["Flight itinerary", "Hotel bookings", "Travel insurance (€30,000 coverage)"], validation: "Insurance must cover medical repatriation" },
        { category: "Financial", items: ["Bank statements (3 months)", "Sponsorship letter if applicable"], validation: "€100/day rule of thumb" },
        { category: "Employment", items: ["Employment letter with leave approval", "Business registration if self-employed"], validation: "Must show ties to home country" }
    ]
};

// GET /api/smart-checklists/templates - Get checklist templates by visa type
router.get(
    "/templates",
    asyncHandler(async (req, res) => {
        const templates = Object.entries(VISA_DOCUMENT_REQUIREMENTS).map(([visaType, categories]) => ({
            visaType,
            totalItems: categories.reduce((acc, cat) => acc + cat.items.length, 0),
            categories: categories.length
        }));
        res.json({ templates });
    })
);

// POST /api/smart-checklists/generate - AI-generate a checklist for a client
router.post(
    "/generate",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId, visaType, customContext } = req.body;

        if (!clientId || !visaType) {
            throw new AppError(400, "clientId and visaType are required");
        }

        const requirements = VISA_DOCUMENT_REQUIREMENTS[visaType];
        if (!requirements) {
            throw new AppError(404, "No template found for this visa type");
        }

        // Fetch client data
        const [client] = await db.select().from(users).where(eq(users.id, clientId));
        if (!client) {
            throw new AppError(404, "Client not found");
        }

        // Try to get AI recommendations for additional/personalized items
        let aiRecommendations: string[] = [];
        try {
            const prompt = `You are an immigration document specialist. Based on the following client profile and visa type, suggest any ADDITIONAL documents that might strengthen this application beyond the standard requirements.

Client: ${client.firstName} ${client.lastName}
Visa Type: ${visaType}
Additional Context: ${customContext || "None provided"}

Standard requirements are already covered. Only suggest ADDITIONAL items that could help, such as:
- Evidence of ties to home country
- Family/relationship evidence
- Professional endorsements
- Character references

Return a JSON array of strings with 3-5 suggestions. Example: ["Letter from community leader", "Property ownership documents"]`;

            const aiResponse = await agentsManager.processRequest(
                "immigration-law",
                "handleUserQuery",
                [prompt, { context: "checklist-generation" }]
            );

            if (aiResponse.success && aiResponse.data) {
                try {
                    const match = aiResponse.data.match(/\[[\s\S]*\]/);
                    if (match) {
                        aiRecommendations = JSON.parse(match[0]);
                    }
                } catch (e) {
                    logger.warn("Failed to parse AI checklist recommendations");
                }
            }
        } catch (err) {
            logger.warn({ err }, "AI recommendations failed, using defaults");
        }

        // Create checklist in database
        const [checklist] = await db.insert(checklists).values({
            userId: clientId,
            lawyerId,
            title: `${visaType.replace(/_/g, ' ').toUpperCase()} Document Checklist`,
            description: `AI-generated checklist for ${client.firstName} ${client.lastName}`,
            visaType,
            isAIGenerated: true,
            status: "active"
        }).returning();

        // Create checklist items
        const allItems: any[] = [];

        for (const category of requirements) {
            for (const item of category.items) {
                allItems.push({
                    checklistId: checklist.id,
                    title: item,
                    category: category.category,
                    isRequired: true,
                    validationRule: category.validation || null,
                    status: "pending"
                });
            }
        }

        // Add AI recommendations
        for (const rec of aiRecommendations) {
            allItems.push({
                checklistId: checklist.id,
                title: rec,
                category: "AI Recommended",
                isRequired: false,
                status: "pending"
            });
        }

        if (allItems.length > 0) {
            await db.insert(checklistItems).values(allItems);
        }

        // Fetch complete checklist with items
        const items = await db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklist.id));

        logger.info({ lawyerId, clientId, visaType, itemCount: items.length }, "Smart checklist generated");

        res.status(201).json({
            success: true,
            checklist,
            items,
            aiRecommendationsCount: aiRecommendations.length
        });
    })
);

// GET /api/smart-checklists/client/:clientId - Get all checklists for a client
router.get(
    "/client/:clientId",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const clientId = req.params.clientId;

        const clientChecklists = await db
            .select()
            .from(checklists)
            .where(and(
                eq(checklists.userId, clientId),
                eq(checklists.lawyerId, lawyerId)
            ))
            .orderBy(desc(checklists.createdAt));

        // Get item counts for each checklist
        const enriched = await Promise.all(clientChecklists.map(async (cl) => {
            const items = await db.select().from(checklistItems).where(eq(checklistItems.checklistId, cl.id));
            const completed = items.filter(i => i.status === "completed").length;
            return {
                ...cl,
                totalItems: items.length,
                completedItems: completed,
                progress: items.length > 0 ? Math.round((completed / items.length) * 100) : 0
            };
        }));

        res.json({ checklists: enriched });
    })
);

// GET /api/smart-checklists/:id - Get checklist with items
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const checklistId = req.params.id;

        const [checklist] = await db.select().from(checklists).where(eq(checklists.id, checklistId));
        if (!checklist) {
            throw new AppError(404, "Checklist not found");
        }

        const items = await db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId));

        // Group by category
        const groupedItems = items.reduce((acc, item) => {
            const cat = item.category || "General";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {} as Record<string, typeof items>);

        res.json({ checklist, items, groupedItems });
    })
);

// PATCH /api/smart-checklists/item/:id - Update checklist item status
router.patch(
    "/item/:id",
    asyncHandler(async (req, res) => {
        const itemId = req.params.id;
        const { status, documentUrl, notes } = req.body;

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (documentUrl) updateData.documentUrl = documentUrl;
        if (notes) updateData.notes = notes;
        if (status === "completed") updateData.completedAt = new Date();

        const [updated] = await db
            .update(checklistItems)
            .set(updateData)
            .where(eq(checklistItems.id, itemId))
            .returning();

        if (!updated) {
            throw new AppError(404, "Item not found");
        }

        res.json(updated);
    })
);

// POST /api/smart-checklists/:id/remind - Send reminder to client for pending items
router.post(
    "/:id/remind",
    asyncHandler(async (req, res) => {
        const checklistId = req.params.id;

        const [checklist] = await db.select().from(checklists).where(eq(checklists.id, checklistId));
        if (!checklist) {
            throw new AppError(404, "Checklist not found");
        }

        const pendingItems = await db
            .select()
            .from(checklistItems)
            .where(and(
                eq(checklistItems.checklistId, checklistId),
                eq(checklistItems.status, "pending")
            ));

        // Update reminder count on checklist
        await db.update(checklists)
            .set({
                reminderCount: (checklist.reminderCount || 0) + 1,
                updatedAt: new Date()
            })
            .where(eq(checklists.id, checklistId));

        // TODO: Send email with pending items list
        logger.info({ checklistId, pendingCount: pendingItems.length }, "Checklist reminder sent");

        res.json({
            success: true,
            pendingItems: pendingItems.length,
            reminderCount: (checklist.reminderCount || 0) + 1
        });
    })
);

export default router;
