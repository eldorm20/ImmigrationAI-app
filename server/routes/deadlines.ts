import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
import { roadmapItems, consultations, applications, users } from "@shared/schema";
import { and, eq, gte, lte, or, sql, desc, asc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

interface Deadline {
    id: string;
    type: "roadmap" | "consultation" | "visa_expiry" | "document" | "custom";
    title: string;
    description?: string;
    dueDate: string;
    priority: "low" | "medium" | "high" | "urgent";
    status: "upcoming" | "due_today" | "overdue" | "completed";
    relatedTo?: string; // application ID or other reference
    metadata?: Record<string, unknown>;
}

// Get all deadlines for a user
router.get(
    "/",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { from, to, includeCompleted } = req.query;

        const now = new Date();
        const startDate = from ? new Date(from as string) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last week
        const endDate = to ? new Date(to as string) : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // Next 90 days

        const deadlines: Deadline[] = [];

        // 1. Get roadmap items with due dates for user's applications
        try {
            const userApps = await db.query.applications.findMany({
                where: eq(applications.userId, userId),
                columns: { id: true, visaType: true, country: true },
            });

            const appIds = userApps.map(a => a.id);

            if (appIds.length > 0) {
                const roadmapDeadlines = await db.query.roadmapItems.findMany({
                    where: and(
                        sql`${roadmapItems.applicationId} IN (${sql.join(appIds.map(id => sql`${id}`), sql`, `)})`,
                        roadmapItems.dueDate ? gte(roadmapItems.dueDate, startDate) : undefined,
                        roadmapItems.dueDate ? lte(roadmapItems.dueDate, endDate) : undefined,
                        includeCompleted !== 'true' ? sql`${roadmapItems.status} != 'completed'` : undefined,
                    ),
                    orderBy: [asc(roadmapItems.dueDate)],
                });

                for (const item of roadmapDeadlines) {
                    if (!item.dueDate) continue;

                    const app = userApps.find(a => a.id === item.applicationId);
                    const dueDate = new Date(item.dueDate);
                    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    deadlines.push({
                        id: item.id,
                        type: "roadmap",
                        title: item.title,
                        description: item.description || undefined,
                        dueDate: item.dueDate.toISOString(),
                        priority: daysUntil <= 3 ? "urgent" : daysUntil <= 7 ? "high" : daysUntil <= 14 ? "medium" : "low",
                        status: item.status === "completed" ? "completed" : daysUntil < 0 ? "overdue" : daysUntil === 0 ? "due_today" : "upcoming",
                        relatedTo: `${app?.visaType || "Visa"} Application - ${app?.country || ""}`,
                    });
                }
            }
        } catch (err) {
            logger.warn({ err }, "Failed to fetch roadmap deadlines");
        }

        // 2. Get upcoming consultations
        try {
            const userConsultations = await db.query.consultations.findMany({
                where: and(
                    eq(consultations.userId, userId),
                    gte(consultations.scheduledTime, startDate),
                    lte(consultations.scheduledTime, endDate),
                    includeCompleted !== 'true' ? sql`${consultations.status} = 'scheduled'` : undefined,
                ),
                orderBy: [asc(consultations.scheduledTime)],
            });

            for (const consult of userConsultations) {
                const dueDate = new Date(consult.scheduledTime);
                const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                deadlines.push({
                    id: consult.id,
                    type: "consultation",
                    title: "Lawyer Consultation",
                    description: consult.notes || `${consult.duration} minute consultation`,
                    dueDate: consult.scheduledTime.toISOString(),
                    priority: daysUntil <= 1 ? "urgent" : daysUntil <= 3 ? "high" : "medium",
                    status: consult.status === "completed" ? "completed" : daysUntil < 0 ? "overdue" : daysUntil === 0 ? "due_today" : "upcoming",
                    metadata: { meetingLink: consult.meetingLink, duration: consult.duration },
                });
            }
        } catch (err) {
            logger.warn({ err }, "Failed to fetch consultation deadlines");
        }

        // 3. Add common visa milestone reminders based on application type
        // These are auto-generated suggestions not stored in DB
        try {
            const userApps = await db.query.applications.findMany({
                where: and(
                    eq(applications.userId, userId),
                    sql`${applications.status} NOT IN ('approved', 'rejected', 'cancelled')`,
                ),
            });

            for (const app of userApps) {
                // Check if there are upcoming auto reminder deadlines
                const appCreated = new Date(app.createdAt);
                const reminderMilestones = [
                    { days: 30, title: "Document Submission Deadline", desc: "Ensure all required documents are submitted" },
                    { days: 60, title: "Application Review Check", desc: "Follow up on application status" },
                    { days: 90, title: "Application Status Update", desc: "Check for any required additional information" },
                ];

                for (const milestone of reminderMilestones) {
                    const milestoneDate = new Date(appCreated.getTime() + milestone.days * 24 * 60 * 60 * 1000);
                    if (milestoneDate >= startDate && milestoneDate <= endDate && milestoneDate >= now) {
                        const daysUntil = Math.ceil((milestoneDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                        deadlines.push({
                            id: `auto-${app.id}-${milestone.days}`,
                            type: "custom",
                            title: milestone.title,
                            description: milestone.desc,
                            dueDate: milestoneDate.toISOString(),
                            priority: daysUntil <= 7 ? "high" : "medium",
                            status: "upcoming",
                            relatedTo: `${app.visaType} - ${app.country}`,
                        });
                    }
                }
            }
        } catch (err) {
            logger.warn({ err }, "Failed to generate auto milestones");
        }

        // Sort all deadlines by date
        deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        // Calculate summary stats
        const stats = {
            total: deadlines.length,
            overdue: deadlines.filter(d => d.status === "overdue").length,
            dueToday: deadlines.filter(d => d.status === "due_today").length,
            upcoming: deadlines.filter(d => d.status === "upcoming").length,
            completed: deadlines.filter(d => d.status === "completed").length,
            urgent: deadlines.filter(d => d.priority === "urgent").length,
        };

        res.json({ deadlines, stats });
    })
);

// Get deadline summary for dashboard widget
router.get(
    "/summary",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Count deadlines in various time ranges
        let urgent = 0;
        let thisWeek = 0;
        let thisMonth = 0;
        let overdue = 0;

        try {
            // Get user's applications
            const userApps = await db.query.applications.findMany({
                where: eq(applications.userId, userId),
                columns: { id: true },
            });
            const appIds = userApps.map(a => a.id);

            if (appIds.length > 0) {
                // Count roadmap items by due date
                const allRoadmapItems = await db.query.roadmapItems.findMany({
                    where: and(
                        sql`${roadmapItems.applicationId} IN (${sql.join(appIds.map(id => sql`${id}`), sql`, `)})`,
                        sql`${roadmapItems.status} != 'completed'`,
                        roadmapItems.dueDate ? lte(roadmapItems.dueDate, next30Days) : undefined,
                    ),
                });

                for (const item of allRoadmapItems) {
                    if (!item.dueDate) continue;
                    const dueDate = new Date(item.dueDate);

                    if (dueDate < now) overdue++;
                    else if (dueDate <= next7Days) {
                        thisWeek++;
                        if (Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 3) {
                            urgent++;
                        }
                    } else if (dueDate <= next30Days) thisMonth++;
                }
            }

            // Count upcoming consultations
            const upcomingConsults = await db.query.consultations.findMany({
                where: and(
                    eq(consultations.userId, userId),
                    eq(consultations.status, "scheduled"),
                    gte(consultations.scheduledTime, now),
                    lte(consultations.scheduledTime, next30Days),
                ),
            });

            for (const c of upcomingConsults) {
                const daysUntil = Math.ceil((new Date(c.scheduledTime).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntil <= 1) urgent++;
                if (daysUntil <= 7) thisWeek++;
                thisMonth++;
            }
        } catch (err) {
            logger.warn({ err }, "Failed to get deadline summary");
        }

        res.json({
            urgent,
            thisWeek,
            thisMonth,
            overdue,
            alerts: overdue > 0 ? [`${overdue} overdue deadline${overdue > 1 ? 's' : ''}`] : [],
        });
    })
);

// Mark a roadmap deadline as completed
router.patch(
    "/:id/complete",
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Verify ownership
        const item = await db.query.roadmapItems.findFirst({
            where: eq(roadmapItems.id, id),
            with: {
                application: true,
            },
        });

        if (!item || (item as any).application?.userId !== userId) {
            return res.status(404).json({ error: "Deadline not found" });
        }

        await db.update(roadmapItems)
            .set({
                status: "completed",
                completedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(roadmapItems.id, id));

        res.json({ success: true, message: "Deadline marked as completed" });
    })
);

export default router;
