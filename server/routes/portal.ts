import { Router } from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { users, applications, documents, messages, smartChecklists, smartChecklistItems } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Middleware to authenticate via portal token
const authenticatePortal = asyncHandler(async (req, res, next) => {
    const token = req.header("X-Portal-Token") || req.query.token as string;

    if (!token) {
        throw new AppError(401, "Portal token required");
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.portalToken, token));

    if (!user) {
        throw new AppError(401, "Invalid portal token");
    }

    // Check expiry if needed (optional implementation)
    if (user.portalTokenExpiry && new Date(user.portalTokenExpiry) < new Date()) {
        throw new AppError(401, "Portal token expired");
    }

    req.user = { userId: user.id, role: user.role } as any;
    next();
});

// GET /api/portal/status - Get overview of case status
router.get(
    "/status",
    authenticatePortal,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;

        // Get user details (masked)
        const [user] = await db
            .select({
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email
            })
            .from(users)
            .where(eq(users.id, userId));

        // Get active application
        const [application] = await db
            .select()
            .from(applications)
            .where(eq(applications.userId, userId))
            .orderBy(desc(applications.createdAt))
            .limit(1);

        // Get smart checklists progress
        const checklists = await db
            .select()
            .from(smartChecklists)
            .where(eq(smartChecklists.userId, userId));

        let totalDocs = 0;
        let completedDocs = 0;

        for (const cl of checklists) {
            const items = await db
                .select()
                .from(smartChecklistItems)
                .where(eq(smartChecklistItems.checklistId, cl.id));

            totalDocs += items.length;
            completedDocs += items.filter(i => i.status === 'completed' || i.status === 'approved').length;
        }

        const progress = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

        res.json({
            client: user,
            application: application ? {
                type: application.visaType,
                status: application.status,
                country: application.country,
                updatedAt: application.updatedAt
            } : null,
            documents: {
                total: totalDocs,
                completed: completedDocs,
                progress
            }
        });
    })
);

// GET /api/portal/timeline - Get application timeline/updates
router.get(
    "/timeline",
    authenticatePortal,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;

        // Fetch messages from lawyer
        const lawyerMessages = await db
            .select()
            .from(messages)
            .where(and(
                eq(messages.userId, userId),
                eq(messages.sender, "lawyer")
            ))
            .orderBy(desc(messages.createdAt))
            .limit(10);

        // Timeline events could be constructed from various sources
        // For now, returning messages as timeline updates
        const timeline = lawyerMessages.map(msg => ({
            id: msg.id,
            type: "message",
            title: "Update from Lawyer",
            description: msg.content,
            date: msg.createdAt
        }));

        res.json({ timeline });
    })
);

// GET /api/portal/documents - Get required documents list
router.get(
    "/documents",
    authenticatePortal,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;

        const checklists = await db
            .select()
            .from(smartChecklists)
            .where(eq(smartChecklists.userId, userId))
            .orderBy(desc(smartChecklists.createdAt));

        const enrichedChecklists = await Promise.all(checklists.map(async (cl) => {
            const items = await db
                .select()
                .from(smartChecklistItems)
                .where(eq(smartChecklistItems.checklistId, cl.id));

            return {
                ...cl,
                items
            };
        }));

        res.json({ checklists: enrichedChecklists });
    })
);

// POST /api/portal/documents/upload/:itemId - Upload document for checklist item
router.post(
    "/documents/upload/:itemId",
    authenticatePortal,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const itemId = req.params.itemId;
        const { documentUrl, notes } = req.body; // In real app, would handle file upload here

        if (!documentUrl) {
            throw new AppError(400, "Document URL required");
        }

        // Verify ownership via checklist
        const [item] = await db
            .select()
            .from(smartChecklistItems)
            .where(eq(smartChecklistItems.id, itemId));

        if (!item) throw new AppError(404, "Item not found");

        const [checklist] = await db
            .select()
            .from(smartChecklists)
            .where(eq(smartChecklists.id, item.checklistId));

        if (!checklist || checklist.userId !== userId) {
            throw new AppError(403, "Unauthorized access to this item");
        }

        // Update item
        const [updated] = await db
            .update(smartChecklistItems)
            .set({
                status: "uploaded",
                documentUrl,
                notes,
                updatedAt: new Date()
            })
            .where(eq(smartChecklistItems.id, itemId))
            .returning();

        res.json(updated);
    })
);

// POST /api/portal/message - Send message to lawyer
router.post(
    "/message",
    authenticatePortal,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { content } = req.body;

        if (!content) throw new AppError(400, "Message content required");

        // Get assigned lawyer from application
        const [application] = await db
            .select()
            .from(applications)
            .where(eq(applications.userId, userId))
            .orderBy(desc(applications.createdAt))
            .limit(1);

        if (!application || !application.lawyerId) {
            // If no direct lawyer, maybe send to admin or store without receiver (if nullable - check schema)
            // Schema says receiverId is NOT NULL. So we need a receiver.
            // We'll search for an admin user as fallback
            const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
            if (!admin) {
                throw new AppError(400, "No lawyer or admin assigned to receive message");
            }

            const [msg] = await db.insert(messages).values({
                senderId: userId,
                receiverId: admin.id,
                content,
                isRead: false
            }).returning();

            return res.json({ success: true, message: msg });
        }

        const [msg] = await db.insert(messages).values({
            senderId: userId,
            receiverId: application.lawyerId,
            applicationId: application.id,
            content,
            isRead: false
        }).returning();

        res.json({ success: true, message: msg });
    })
);

export default router;
