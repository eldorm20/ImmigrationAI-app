import { Router } from "express";
import { db } from "../db";
import { applications, payments, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
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
      // Admin/Lawyer stats: show all applications for overall dashboard consistency
      const where = undefined; // Show global stats for practice management
      const allApps = await db.query.applications.findMany({ where });
      let totalRevenue = 0;
      let monthlyRevenue: { name: string; value: number }[] = [];

      if (role === "lawyer") {
        totalRevenue = allApps
          .filter((app) => app.fee && app.status === "approved")
          .reduce((sum, app) => sum + parseFloat(app.fee || "0"), 0);

        // Estimate monthly revenue for lawyer based on apps (simplified)
        monthlyRevenue = allApps
          .filter(app => app.fee && app.status === "approved")
          .reduce((acc, app) => {
            const month = new Date(app.createdAt).toLocaleString('default', { month: 'short' });
            const amount = parseFloat(app.fee || "0");
            const existing = acc.find(m => m.name === month);
            if (existing) {
              existing.value += amount;
            } else {
              acc.push({ name: month, value: amount });
            }
            return acc;
          }, [] as { name: string; value: number }[]);

      } else {
        const allPayments = await db.query.payments.findMany({
          where: eq(payments.status, "completed"),
        });
        totalRevenue = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

        // Monthly Revenue for Admin from payments
        monthlyRevenue = allPayments.reduce((acc, p) => {
          const month = new Date(p.createdAt).toLocaleString('default', { month: 'short' });
          const amount = parseFloat(p.amount || "0");
          const existing = acc.find(m => m.name === month);
          if (existing) {
            existing.value += amount;
          } else {
            acc.push({ name: month, value: amount });
          }
          return acc;
        }, [] as { name: string; value: number }[]);
      }

      const totalLeads = allApps.length;
      const pendingLeads = allApps.filter((app) => app.status === "new" || app.status === "in_progress").length;
      const approvedLeads = allApps.filter((app) => app.status === "approved").length;
      const successRate = totalLeads > 0 ? Math.round((approvedLeads / totalLeads) * 100) : 0;
      const newThisWeek = allApps.filter((app) => new Date(app.createdAt) > oneWeekAgo).length;
      const totalFees = allApps.reduce((sum, app) => sum + parseFloat(app.fee || "0"), 0);

      // Sort by month (simple approch for now)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthlyRevenue.sort((a, b) => months.indexOf(a.name) - months.indexOf(b.name));

      res.json({
        totalRevenue,
        totalLeads,
        pendingLeads,
        approvedLeads,
        successRate,
        newThisWeek,
        totalFees,
        revenueChart: monthlyRevenue, // Alias Stash's robust data to HEAD's expected key
        monthlyRevenue // Keep original key just in case
      });
    }
  })
);

export default router;







