import { Router } from "express";
import { db } from "../db";
import { applications, consultations, invoices, users, documents, messages } from "@shared/schema";
import { eq, and, or, desc, sql, count } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();

router.use(authenticate);
router.use(requireRole("lawyer", "admin"));

// Get all clients for this lawyer with enriched data
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;

        try {
            // Get unique client IDs from both applications and consultations
            const appClients = await db
                .selectDistinct({ userId: applications.userId })
                .from(applications)
                .where(eq(applications.lawyerId, lawyerId));

            const consultClients = await db
                .selectDistinct({ userId: consultations.userId })
                .from(consultations)
                .where(eq(consultations.lawyerId, lawyerId));

            const allClientIds = [
                ...appClients.map(c => c.userId),
                ...consultClients.map(c => c.userId)
            ];
            const uniqueClientIds = Array.from(new Set(allClientIds));

            // Fetch full client details with stats
            const clients = await Promise.all(
                uniqueClientIds.map(async (clientId) => {
                    const user = await db.query.users.findFirst({
                        where: eq(users.id, clientId),
                        columns: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            createdAt: true,
                            updatedAt: true,
                            metadata: true,
                        }
                    });

                    if (!user) return null;

                    // Get application count
                    const appCount = await db
                        .select({ count: count() })
                        .from(applications)
                        .where(and(eq(applications.userId, clientId), eq(applications.lawyerId, lawyerId)));

                    // Get consultation count
                    const consultCount = await db
                        .select({ count: count() })
                        .from(consultations)
                        .where(and(eq(consultations.userId, clientId), eq(consultations.lawyerId, lawyerId)));

                    // Get document count
                    const docCount = await db
                        .select({ count: count() })
                        .from(documents)
                        .where(eq(documents.userId, clientId));

                    // Get total billed amount
                    const billedAmount = await db
                        .select({ total: sql<number>`COALESCE(SUM(amount::numeric), 0)` })
                        .from(invoices)
                        .where(and(eq(invoices.applicantId, clientId), eq(invoices.lawyerId, lawyerId)));

                    // Get latest application status
                    const latestApp = await db.query.applications.findFirst({
                        where: and(eq(applications.userId, clientId), eq(applications.lawyerId, lawyerId)),
                        orderBy: [desc(applications.createdAt)],
                        columns: { status: true, visaType: true, country: true }
                    });

                    // Get notes from user metadata
                    const notes = (user.metadata as any)?.lawyerNotes?.[lawyerId] || [];
                    const tags = (user.metadata as any)?.lawyerTags?.[lawyerId] || [];

                    return {
                        ...user,
                        applicationCount: appCount[0]?.count || 0,
                        consultationCount: consultCount[0]?.count || 0,
                        documentCount: docCount[0]?.count || 0,
                        totalBilled: billedAmount[0]?.total || 0,
                        latestApplication: latestApp,
                        notes,
                        tags,
                    };
                })
            );

            res.json(clients.filter(Boolean));
        } catch (error) {
            logger.error({ error, lawyerId }, "Failed to fetch clients");
            throw error;
        }
    })
);

// Get single client details
router.get(
    "/:clientId",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId } = req.params;

        const user = await db.query.users.findFirst({
            where: eq(users.id, clientId),
            columns: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                createdAt: true,
                updatedAt: true,
                metadata: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: "Client not found" });
        }

        // Get all applications
        const clientApps = await db.query.applications.findMany({
            where: and(eq(applications.userId, clientId), eq(applications.lawyerId, lawyerId)),
            orderBy: [desc(applications.createdAt)],
        });

        // Get all consultations
        const clientConsults = await db.query.consultations.findMany({
            where: and(eq(consultations.userId, clientId), eq(consultations.lawyerId, lawyerId)),
            orderBy: [desc(consultations.scheduledTime)],
        });

        // Get all invoices
        const clientInvoices = await db.query.invoices.findMany({
            where: and(eq(invoices.applicantId, clientId), eq(invoices.lawyerId, lawyerId)),
            orderBy: [desc(invoices.createdAt)],
        });

        // Get all documents
        const clientDocs = await db.query.documents.findMany({
            where: eq(documents.userId, clientId),
            orderBy: [desc(documents.createdAt)],
        });

        // Get notes
        const notes = (user.metadata as any)?.lawyerNotes?.[lawyerId] || [];
        const tags = (user.metadata as any)?.lawyerTags?.[lawyerId] || [];

        res.json({
            ...user,
            applications: clientApps,
            consultations: clientConsults,
            invoices: clientInvoices,
            documents: clientDocs,
            notes,
            tags,
        });
    })
);

// Add note to client
router.post(
    "/:clientId/notes",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId } = req.params;
        const { content, type = "general" } = z.object({
            content: z.string().min(1).max(2000),
            type: z.enum(["general", "case", "billing", "important"]).optional(),
        }).parse(req.body);

        const user = await db.query.users.findFirst({
            where: eq(users.id, clientId),
        });

        if (!user) {
            return res.status(404).json({ message: "Client not found" });
        }

        const metadata = (user.metadata || {}) as any;
        if (!metadata.lawyerNotes) metadata.lawyerNotes = {};
        if (!metadata.lawyerNotes[lawyerId]) metadata.lawyerNotes[lawyerId] = [];

        const newNote = {
            id: crypto.randomUUID(),
            content,
            type,
            createdAt: new Date().toISOString(),
            createdBy: lawyerId,
        };

        metadata.lawyerNotes[lawyerId].unshift(newNote);

        await db
            .update(users)
            .set({ metadata, updatedAt: new Date() })
            .where(eq(users.id, clientId));

        res.status(201).json(newNote);
    })
);

// Delete note from client
router.delete(
    "/:clientId/notes/:noteId",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId, noteId } = req.params;

        const user = await db.query.users.findFirst({
            where: eq(users.id, clientId),
        });

        if (!user) {
            return res.status(404).json({ message: "Client not found" });
        }

        const metadata = (user.metadata || {}) as any;
        if (metadata.lawyerNotes?.[lawyerId]) {
            metadata.lawyerNotes[lawyerId] = metadata.lawyerNotes[lawyerId].filter(
                (n: any) => n.id !== noteId
            );

            await db
                .update(users)
                .set({ metadata, updatedAt: new Date() })
                .where(eq(users.id, clientId));
        }

        res.json({ message: "Note deleted" });
    })
);

// Update client tags
router.patch(
    "/:clientId/tags",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId } = req.params;
        const { tags } = z.object({
            tags: z.array(z.string().max(50)).max(10),
        }).parse(req.body);

        const user = await db.query.users.findFirst({
            where: eq(users.id, clientId),
        });

        if (!user) {
            return res.status(404).json({ message: "Client not found" });
        }

        const metadata = (user.metadata || {}) as any;
        if (!metadata.lawyerTags) metadata.lawyerTags = {};
        metadata.lawyerTags[lawyerId] = tags;

        await db
            .update(users)
            .set({ metadata, updatedAt: new Date() })
            .where(eq(users.id, clientId));

        res.json({ tags });
    })
);

export default router;
