import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { applications, consultations, invoices, tasks, users } from "@shared/schema";
import { eq, and, gte, lte, sql, count, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getDashboardStats, getUserAnalytics, getRevenueAnalytics } from "../lib/analytics";
import { logger } from "../lib/logger";

const router = Router();

// Get basic analytics dashboard (for all users)
router.get(
  "/dashboard",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const stats = await getDashboardStats(userId);

    if (!stats) {
      return res.status(404).json({ message: "Analytics not available" });
    }

    res.json(stats);
  })
);

// Get user analytics
router.get(
  "/user",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const analytics = await getUserAnalytics(userId);

    if (!analytics) {
      return res.status(404).json({ message: "User analytics not found" });
    }

    res.json(analytics);
  })
);

// Lawyer-specific comprehensive analytics
router.get(
  "/lawyer/dashboard",
  authenticate,
  requireRole("lawyer", "admin"),
  asyncHandler(async (req, res) => {
    const lawyerId = req.user!.userId;

    try {
      // Get applications stats
      const applicationStats = await db
        .select({
          total: count(),
          pending: sql<number>`CAST(SUM(CASE WHEN status = 'pending' OR status = 'pending_documents' THEN 1 ELSE 0 END) AS integer)`,
          approved: sql<number>`CAST(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS integer)`,
          rejected: sql<number>`CAST(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS integer)`,
          inProgress: sql<number>`CAST(SUM(CASE WHEN status = 'under_review' OR status = 'in_progress' OR status = 'submitted' THEN 1 ELSE 0 END) AS integer)`,
        })
        .from(applications);

      // Get consultation stats
      const consultationStats = await db
        .select({
          total: count(),
          scheduled: sql<number>`CAST(SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS integer)`,
          completed: sql<number>`CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS integer)`,
          cancelled: sql<number>`CAST(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 1 END) AS integer)`,
        })
        .from(consultations);

      // Get task stats
      const taskStats = await db
        .select({
          total: count(),
          pending: sql<number>`CAST(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS integer)`,
          inProgress: sql<number>`CAST(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS integer)`,
          completed: sql<number>`CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS integer)`,
        })
        .from(tasks);

      // Get invoice/revenue stats
      const invoiceStats = await db
        .select({
          total: count(),
          totalAmount: sql<number>`CAST(COALESCE(SUM(amount), 0) AS float)`,
          paid: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS float)`,
          outstanding: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'sent' OR status = 'overdue' THEN amount ELSE 0 END), 0) AS float)`,
          drafts: sql<number>`CAST(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS integer)`,
        })
        .from(invoices);

      // Get upcoming consultations (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const upcomingConsultations = await db.query.consultations.findMany({
        where: and(
          eq(consultations.lawyerId, lawyerId),
          gte(consultations.scheduledTime, now),
          lte(consultations.scheduledTime, nextWeek)
        ),
        orderBy: [consultations.scheduledTime],
        limit: 5,
      });

      // Enrich with user details
      const enrichedConsultations = await Promise.all(
        upcomingConsultations.map(async (c) => {
          const user = await db.query.users.findFirst({
            where: eq(users.id, c.userId),
            columns: { id: true, firstName: true, lastName: true, email: true }
          });
          return { ...c, applicant: user };
        })
      );

      // Get overdue tasks
      const overdueTasks = await db.query.tasks.findMany({
        where: and(
          eq(tasks.lawyerId, lawyerId),
          lte(tasks.dueDate, now),
          sql`${tasks.status} != 'completed'`
        ),
        limit: 5,
      });

      // Get recent activity (tasks completed in last 7 days)
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentCompletedTasks = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.lawyerId, lawyerId),
            eq(tasks.status, "completed"),
            gte(tasks.updatedAt, lastWeek)
          )
        );

      res.json({
        applications: applicationStats[0] || { total: 0, pending: 0, approved: 0, rejected: 0, inProgress: 0 },
        consultations: consultationStats[0] || { total: 0, scheduled: 0, completed: 0, cancelled: 0 },
        tasks: taskStats[0] || { total: 0, pending: 0, inProgress: 0, completed: 0 },
        revenue: invoiceStats[0] || { total: 0, totalAmount: 0, paid: 0, outstanding: 0, drafts: 0 },
        upcomingConsultations: enrichedConsultations,
        overdueTasks,
        weeklyCompletedTasks: recentCompletedTasks[0]?.count || 0,
      });
    } catch (error) {
      logger.error({ error, lawyerId }, "Failed to fetch lawyer dashboard analytics");
      throw error;
    }
  })
);

// Get revenue analytics over time
router.get(
  "/lawyer/revenue",
  authenticate,
  requireRole("lawyer", "admin"),
  asyncHandler(async (req, res) => {
    const lawyerId = req.user!.userId;
    const { period = "month" } = req.query;

    try {
      let startDate: Date;
      const now = new Date();

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (period === "monthly" || !period) {
        const data = await getRevenueAnalytics(); // No ID = Global for Practice
        return res.json({
          period: "monthly",
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          endDate: now,
          data
        });
      }

      const revenueData = await db
        .select({
          date: sql<string>`DATE(created_at)`,
          amount: sql<number>`SUM(amount::numeric)`,
          count: count(),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.lawyerId, lawyerId),
            eq(invoices.status, "paid"),
            gte(invoices.createdAt, startDate)
          )
        )
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at)`);

      res.json({
        period,
        startDate,
        endDate: now,
        data: revenueData,
      });
    } catch (error) {
      logger.error({ error, lawyerId }, "Failed to fetch revenue analytics");
      throw error;
    }
  })
);

// Get top clients insights
router.get(
  "/lawyer/clients",
  authenticate,
  requireRole("lawyer", "admin"),
  asyncHandler(async (req, res) => {
    const lawyerId = req.user!.userId;

    try {
      // Get top clients by revenue
      const topClients = await db
        .select({
          clientId: invoices.applicantId,
          totalRevenue: sql<number>`SUM(amount::numeric)`,
          invoiceCount: count(),
        })
        .from(invoices)
        .where(and(eq(invoices.lawyerId, lawyerId), eq(invoices.status, "paid")))
        .groupBy(invoices.applicantId)
        .orderBy(desc(sql`SUM(amount::numeric)`))
        .limit(10);

      // Enrich with user details
      const enrichedClients = await Promise.all(
        topClients.map(async (client) => {
          const user = await db.query.users.findFirst({
            where: eq(users.id, client.clientId),
            columns: { id: true, firstName: true, lastName: true, email: true }
          });
          return { ...client, user };
        })
      );

      // Get new clients this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const newClientsThisMonth = await db
        .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
        .from(applications)
        .where(
          and(
            eq(applications.lawyerId, lawyerId),
            gte(applications.createdAt, monthStart)
          )
        );

      res.json({
        topClients: enrichedClients,
        newClientsThisMonth: newClientsThisMonth[0]?.count || 0,
      });
    } catch (error) {
      logger.error({ error, lawyerId }, "Failed to fetch client insights");
      throw error;
    }
  })
);

// Track event
router.post(
  "/track",
  authenticate,
  asyncHandler(async (req, res) => {
    const { eventType, eventData } = z
      .object({
        eventType: z.string(),
        eventData: z.record(z.any()).optional(),
      })
      .parse(req.body);

    logger.info({ userId: req.user!.userId, eventType }, "Event tracked");
    res.json({ message: "Event tracked successfully" });
  })
);

export default router;
