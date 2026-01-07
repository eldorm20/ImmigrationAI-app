import { Router } from "express";
import { db } from "../db";
import { applications, payments, users, consultations, invoices, tasks } from "@shared/schema";
import { eq, sql, and, gte, lte, count } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.use(authenticate);

// Get dashboard stats
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const oneWeekAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

    if (role === "applicant") {
      // Applicant stats
      const userApps = await db.query.applications.findMany({
        where: eq(applications.userId, userId),
      });

      const totalApplications = userApps.length;
      const pendingApps = userApps.filter((app) => app.status === "new" || app.status === "in_progress").length;
      const approvedApps = userApps.filter((app) => app.status === "approved").length;
      const successRate = totalApplications > 0 ? Math.round((approvedApps / totalApplications) * 100) : 0;
      const newThisWeek = userApps.filter((app) => new Date(app.createdAt) > oneWeekAgo).length;
      const totalFees = userApps.reduce((sum, app) => sum + parseFloat(app.fee || "0"), 0);

      res.json({
        totalApplications,
        pendingApplications: pendingApps,
        approvedApplications: approvedApps,
        successRate,
        newThisWeek,
        totalFees,
      });
    } else {
      // Admin/Lawyer stats
      const lawyerId = userId;
      const where = role === 'lawyer' ? eq(applications.lawyerId, lawyerId) : undefined;
      const allApps = await db.query.applications.findMany({ where });

      let monthlyRevenue: { name: string; value: number }[] = [];
      let revenueStats = { total: 0, totalAmount: 0, paid: 0, outstanding: 0, drafts: 0 };
      let extendedStats = {};

      if (role === "lawyer" || role === "admin") {
        // --- Detailed Analytics for Lawyer/Admin ---

        // 1. Applications Detailed Stats
        const appStatsRes = await db
          .select({
            total: count(),
            pending: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'pending' OR status = 'pending_documents' OR status = 'new' THEN 1 ELSE 0 END), 0) AS integer)`,
            approved: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS integer)`,
            rejected: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS integer)`,
            inProgress: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'under_review' OR status = 'in_progress' OR status = 'submitted' THEN 1 ELSE 0 END), 0) AS integer)`,
          })
          .from(applications)
          .where(role === 'lawyer' ? eq(applications.lawyerId, lawyerId) : undefined);

        const appStats = appStatsRes[0] || { total: 0, pending: 0, approved: 0, rejected: 0, inProgress: 0 };

        // 2. Consultations Stats
        const consultStatsRes = await db
          .select({
            total: count(),
            scheduled: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END), 0) AS integer)`,
            completed: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS integer)`,
            cancelled: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS integer)`,
          })
          .from(consultations)
          .where(role === 'lawyer' ? eq(consultations.lawyerId, lawyerId) : undefined);

        const consultStats = consultStatsRes[0] || { total: 0, scheduled: 0, completed: 0, cancelled: 0 };

        // 3. Tasks Stats
        const taskStatsRes = await db
          .select({
            total: count(),
            pending: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS integer)`,
            inProgress: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) AS integer)`,
            completed: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS integer)`,
          })
          .from(tasks)
          .where(role === 'lawyer' ? eq(tasks.lawyerId, lawyerId) : undefined);

        const taskStats = taskStatsRes[0] || { total: 0, pending: 0, inProgress: 0, completed: 0 };

        // 4. Revenue Stats (from Invoices)
        const invStatsRes = await db
          .select({
            total: count(),
            totalAmount: sql<number>`CAST(COALESCE(SUM(amount), 0) AS float)`,
            paid: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS float)`,
            outstanding: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'sent' OR status = 'overdue' THEN amount ELSE 0 END), 0) AS float)`,
            drafts: sql<number>`CAST(COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS integer)`,
          })
          .from(invoices)
          .where(role === 'lawyer' ? eq(invoices.lawyerId, lawyerId) : undefined);

        revenueStats = invStatsRes[0] || { total: 0, totalAmount: 0, paid: 0, outstanding: 0, drafts: 0 };

        // 5. Upcoming Consultations
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingConsultations = await db.query.consultations.findMany({
          where: and(
            role === 'lawyer' ? eq(consultations.lawyerId, lawyerId) : undefined,
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

        // 6. Overdue Tasks
        const overdueTasks = await db.query.tasks.findMany({
          where: and(
            role === 'lawyer' ? eq(tasks.lawyerId, lawyerId) : undefined,
            lte(tasks.dueDate, now),
            sql`${tasks.status} != 'completed'`
          ),
          limit: 5,
        });

        // 7. Weekly Completed Tasks
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentCompletedTasks = await db
          .select({ count: count() })
          .from(tasks)
          .where(
            and(
              role === 'lawyer' ? eq(tasks.lawyerId, lawyerId) : undefined,
              eq(tasks.status, "completed"),
              gte(tasks.updatedAt, lastWeek)
            )
          );

        extendedStats = {
          applications: appStats,
          consultations: consultStats,
          tasks: taskStats,
          revenue: revenueStats,
          upcomingConsultations: enrichedConsultations,
          overdueTasks,
          weeklyCompletedTasks: recentCompletedTasks[0]?.count || 0,
        };

        // Calculate Monthly Revenue (from Invoices for accuracy)
        const revenueData = await db
          .select({
            date: sql<string>`DATE(created_at)`,
            amount: sql<number>`SUM(amount::numeric)`,
          })
          .from(invoices)
          .where(
            and(
              role === 'lawyer' ? eq(invoices.lawyerId, lawyerId) : undefined,
              eq(invoices.status, "paid")
            )
          )
          .groupBy(sql`DATE(created_at)`)
          .orderBy(sql`DATE(created_at)`);

        // Aggregate by month name for chart
        monthlyRevenue = revenueData.reduce((acc, curr) => {
          const date = new Date(curr.date);
          const month = date.toLocaleString('default', { month: 'short' });
          const existing = acc.find(m => m.name === month);
          if (existing) {
            existing.value += curr.amount; // amount is float
          } else {
            acc.push({ name: month, value: curr.amount });
          }
          return acc;
        }, [] as { name: string; value: number }[]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        monthlyRevenue.sort((a, b) => months.indexOf(a.name) - months.indexOf(b.name));

      } else {
        // Fallback for non-lawyer roles if any (e.g. unexpected)
        // Assuming Auth/Role middleware handles this, but just in case.
      }

      const totalLeads = allApps.length;
      const pendingLeads = allApps.filter((app) => app.status === "new" || app.status === "in_progress").length;
      const approvedLeads = allApps.filter((app) => app.status === "approved").length;
      const successRate = totalLeads > 0 ? Math.round((approvedLeads / totalLeads) * 100) : 0;
      const newThisWeek = allApps.filter((app) => new Date(app.createdAt) > oneWeekAgo).length;
      const totalFees = allApps.reduce((sum, app) => sum + parseFloat(app.fee || "0"), 0);

      res.json({
        totalRevenue: revenueStats.paid || 0, // Prefer invoice paid amount
        totalLeads,
        pendingLeads,
        approvedLeads,
        successRate,
        newThisWeek,
        totalFees,
        revenueChart: monthlyRevenue,
        monthlyRevenue,
        ...extendedStats // Spread nested objects for LawyerAnalytics compatibility
      });
    }
  })
);

export default router;







