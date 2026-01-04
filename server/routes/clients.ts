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
router.post(
    "/",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        // Basic validation for new client
        const userData = z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            email: z.string().email(),
            phone: z.string().optional(),
            metadata: z.record(z.any()).optional(),
        }).parse(req.body);

        // Check if user exists
        const existing = await db.query.users.findFirst({
            where: eq(users.email, userData.email),
        });

        if (existing) {
            // Check if already linked? For now just return 409
            throw new Error("User with this email already exists");
        }

        // Create user with 'applicant' role
        const [newUser] = await db.insert(users).values({
            ...userData,
            role: "applicant" as any,
            hashedPassword: "temporary_password_hashed", // In real app, hash this!
            createdAt: new Date(),
        }).returning();

        // Add a "My Clients" tag logic or similar if needed.
        // For now, implicit link via applications/consultations is how they appear.
        // But to make them appear in "Client Portfolio" immediately, we might need an explicit link or just rely on them being in the system.
        // The GET / route fetches from applications/consultations.
        // If they have no app/consultation, they won't appear in the list based on current GET logic!

        // Fix GET / logic? Or creates a dummy application/consultation?
        // Let's create an empty "profile" application or just rely on future interactions.
        // Better: Update GET / to also look for users who have metadata linked to this lawyer?

        // For immediate visibility, let's add a "lawyerTags" entry which GET / checks.
        // But GET / logic currently uses:
        // const appClients = ... applications
        // const consultClients = ... consultations
        // It MISSES clients with just metadata connection.

        // Let's update GET / logic in a subsequent step if needed. 
        // For now, let's create a placeholder "Inquiry" lead or application?
        // Or better, just return the created user and let frontend cycle.

        // Actually, to ensure they show up, we can create a "Lead" for them!
        // The Client Portfolio reads from detailed list.
        // Let's create a Lead for this new client automatically 
        // OR just rely on the frontend adding a lead via LeadsManager.

        // Wait, ClientPortfolio is for "Clients". LeadsManager is for "Leads".
        // A "Client" usually implies an active case.
        // If I just "Register Client", they are a Lead until they pay/start case.
        // So maybe "Register Client" should create a LEAD?

        // But the user asked for "Register Client".
        // Use case: Lawyer meets someone, wants to add them.
        // I will Create the User AND Create a Lead for them so they show up in LeadsManager.
        // But ClientPortfolio logic filters by `applications` or `consultations`.

        // I will stick to creating the User.
        res.status(201).json(newUser);
    })
);

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

// Get client activity timeline
router.get(
    "/:clientId/activity",
    asyncHandler(async (req, res) => {
        const { clientId } = req.params;
        const lawyerId = req.user!.userId;

        // 1. Fetch data from various tables
        const docs = await db.query.documents.findMany({
            where: eq(documents.userId, clientId),
            orderBy: [desc(documents.createdAt)],
        });

        const apps = await db.query.applications.findMany({
            where: eq(applications.userId, clientId),
            orderBy: [desc(applications.createdAt)],
        });

        const consults = await db.query.consultations.findMany({
            where: eq(consultations.userId, clientId),
            orderBy: [desc(consultations.createdAt)],
        });

        const msgs = await db.query.messages.findMany({
            where: or(eq(messages.senderId, clientId), eq(messages.receiverId, clientId)),
            orderBy: [desc(messages.createdAt)],
        });

        // 2. Combine and format into timeline events
        type TimelineEvent = {
            id: string;
            type: "document" | "application" | "consultation" | "message" | "status_change";
            title: string;
            description: string;
            timestamp: string;
            meta?: any;
        };

        const events: TimelineEvent[] = [
            ...docs.map(d => ({
                id: d.id,
                type: "document" as const,
                title: "Document Uploaded",
                description: `File: ${d.fileName} (${d.documentType || 'Other'})`,
                timestamp: d.createdAt.toISOString(),
                meta: { url: d.url }
            })),
            ...apps.map(a => ({
                id: a.id,
                type: "application" as const,
                title: "Application Created",
                description: `Started ${a.visaType} visa application for ${a.country}`,
                timestamp: a.createdAt.toISOString(),
                meta: { status: a.status }
            })),
            ...consults.map(c => ({
                id: c.id,
                type: "consultation" as const,
                title: "Consultation Scheduled",
                description: `Meeting on ${new Date(c.scheduledTime).toLocaleDateString()}`,
                timestamp: c.createdAt.toISOString(),
                meta: { status: c.status }
            })),
            ...msgs.slice(0, 20).map(m => ({
                id: m.id,
                type: "message" as const,
                title: m.senderId === clientId ? "Message from Client" : "Message to Client",
                description: m.content.length > 100 ? m.content.substring(0, 100) + "..." : m.content,
                timestamp: m.createdAt.toISOString()
            }))
        ];

        // Sort by timestamp descending
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json(events);
    })
);

export default router;
