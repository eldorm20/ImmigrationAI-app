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
      // Admin/Lawyer stats
      const where = role === "lawyer" ? eq(applications.lawyerId, userId) : undefined;
      const allApps = await db.query.applications.findMany({ where });
      const allPayments = await db.query.payments.findMany({
        where: eq(payments.status, "completed"),
      });

      const totalRevenue = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
      const totalLeads = allApps.length;
      const pendingLeads = allApps.filter((app) => app.status === "new" || app.status === "in_progress").length;
      const approvedLeads = allApps.filter((app) => app.status === "approved").length;
      const successRate = totalLeads > 0 ? Math.round((approvedLeads / totalLeads) * 100) : 0;
      const newThisWeek = allApps.filter((app) => new Date(app.createdAt) > oneWeekAgo).length;
      const totalFees = allApps.reduce((sum, app) => sum + parseFloat(app.fee || "0"), 0);

      res.json({
        totalRevenue,
        totalLeads,
        pendingLeads,
        approvedLeads,
        successRate,
        newThisWeek,
        totalFees,
      });
    }
  })
);

export default router;







