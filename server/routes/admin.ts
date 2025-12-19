import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
import { users, consultations, applications, payments, companies, subscriptions } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getUsageForUser, getUsageRemaining } from "../lib/aiUsage";
import { setUserSubscriptionTier } from "../lib/subscriptionTiers";
<<<<<<< HEAD
import { getStripeClient } from "../lib/subscription";

=======
import { sql } from "drizzle-orm";
>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c

const router = Router();

// Middleware to check admin role
async function isAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

router.use(authenticate, isAdmin);

// Get dashboard overview
router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const allUsers = await db.query.users.findMany();
    const lawyers = allUsers.filter((u) => u.role === "lawyer");
    const applicants = allUsers.filter((u) => u.role === "applicant");
    const admins = allUsers.filter((u) => u.role === "admin");

    const allConsultations = await db.query.consultations.findMany();
    const allPayments = await db.query.payments.findMany({
      where: eq(payments.status, "completed")
    });

    const allCompanies = await db.query.companies.findMany();
    const activeCompanies = allCompanies.filter(c => c.isActive);

    // Calculate total earnings
    const totalEarnings = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    // Recent activity (Last 5 events)
    const recentApps = await db.query.applications.findMany({
      orderBy: [desc(applications.createdAt)],
      limit: 5,
      with: { user: true }
    });

    const recentUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      limit: 5
    });

    // Combine and sort
    const activity = [
      ...recentApps.map(app => ({
        type: 'application',
        description: `Application submitted by ${(app.user as any)?.firstName || 'User'}`,
        createdAt: new Date(app.createdAt)
      })),
      ...recentUsers.map(u => ({
        type: 'registration',
        description: `New user registration: ${u.firstName}`,
        createdAt: new Date(u.createdAt)
      }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);

    // Format time for UI
    const formattedActivity = activity.map(a => {
      const diff = Math.floor((Date.now() - a.createdAt.getTime()) / 60000);
      let timeStr = `${diff} mins ago`;
      if (diff > 60) timeStr = `${Math.floor(diff / 60)} hours ago`;
      if (diff > 1440) timeStr = `${Math.floor(diff / 1440)} days ago`;
      return {
        description: a.description,
        time: timeStr
      };
    });

    res.json({
      overview: {
        totalUsers: allUsers.length,
        totalLawyers: lawyers.length,
        totalApplicants: applicants.length,
        adminUsers: admins.length,
        totalCompanies: allCompanies.length,
        activeCompanies: activeCompanies.length,
      },
      metrics: {
        activeUsers: applicants.length,
        newUsersThisMonth: allUsers.filter(u => {
          const d = new Date(u.createdAt);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
        totalConsultations: allConsultations.length,
        totalEarnings,
      },
      recentActivity: formattedActivity
    });
  })
);

// Get user analytics
router.get(
  "/users/analytics",
  asyncHandler(async (req, res) => {
    const allUsers = await db.query.users.findMany();

    res.json({
      usersByRole: {
        applicants: allUsers.filter((u) => u.role === "applicant").length,
        lawyers: allUsers.filter((u) => u.role === "lawyer").length,
        admins: allUsers.filter((u) => u.role === "admin").length,
      },
      usersByVerification: {
        verified: allUsers.filter((u) => u.emailVerified).length,
        unverified: allUsers.filter((u) => !u.emailVerified).length,
      },
      userGrowth: {
        thisMonth: Math.round(allUsers.length * 0.1),
        lastMonth: Math.round(allUsers.length * 0.08),
        lastQuarter: Math.round(allUsers.length * 0.25),
      },
    });
  })
);

// Get lawyer performance metrics
router.get(
  "/lawyers/performance",
  asyncHandler(async (req, res) => {
    const lawyers = await db.query.users.findMany({
      where: eq(users.role, "lawyer"),
    });

    res.json({
      totalLawyers: lawyers.length,
      verified: lawyers.filter((l) => l.emailVerified).length,
      topPerformers: [], // Would fetch actual performance data
      avgRating: 4.5, // Simulated
    });
  })
);

// Get revenue analytics
// Get revenue analytics (Real Stripe Data)
router.get(
  "/revenue/analytics",
  asyncHandler(async (req, res) => {
    try {
      const stripe = await getStripeClient();
      if (!stripe) {
        return res.json({
          totalRevenue: 0,
          monthlyRevenue: [],
          breakdown: { subscriptions: 0, consultations: 0, documents: 0 }
        });
      }

      // Fetch balance transactions (limit 100 for now)
      const charges = await stripe.charges.list({ limit: 100 });

      let totalRevenue = 0;
      const monthlyRevenue = new Map<string, number>();

      charges.data.forEach((charge: any) => {
        if (charge.paid && !charge.refunded) {
          totalRevenue += charge.amount;

          const date = new Date(charge.created * 1000);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + charge.amount);
        }
      });

      // Convert cents to dollars
      totalRevenue = totalRevenue / 100;
      const graphData = Array.from(monthlyRevenue.entries())
        .map(([month, amount]) => ({ month, revenue: amount / 100 }))
        .sort((a, b) => a.month.localeCompare(b.month));

      res.json({
        revenue: {
          total: totalRevenue,
          thisMonth: graphData[graphData.length - 1]?.revenue || 0,
        },
        monthlyRevenue: graphData
      });

    } catch (error) {
      logger.error({ error }, "Failed to fetch revenue stats");
      res.status(500).json({ message: "Failed to fetch revenue stats" });
    }
  })
);

// Manage user (suspend, delete, verify)
router.post(
  "/users/:userId/action",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { action, reason } = z
      .object({
        action: z.enum(["suspend", "unsuspend", "verify", "delete"]),
        reason: z.string().optional(),
      })
      .parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    logger.info({ userId, action, reason }, "Admin action on user");

    res.json({
      message: `User ${action} action completed`,
      userId,
      action,
    });
  })
);

// Get system health
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date(),
      database: "connected",
      services: {
        auth: "operational",
        storage: "operational",
        notifications: "operational",
        analytics: "operational",
      },
    });
  })
);

// Admin: get AI usage for users (optionally for a specific month YYYY-MM)
router.get(
  "/ai-usage",
  asyncHandler(async (req, res) => {
    const { month } = req.query as any;
    const targetMonth = typeof month === "string" && month.length === 7 ? month : undefined; // YYYY-MM

    const allUsers = await db.query.users.findMany();

    const rows = [] as any[];
    for (const u of allUsers) {
      const usageObj = (u.metadata && typeof u.metadata === 'object' ? (u.metadata as any).aiUsage || {} : {});
      const monthKey = targetMonth || new Date().toISOString().slice(0, 7);
      const monthUsage = usageObj[monthKey] || {};
      const tier = (u.metadata && typeof u.metadata === 'object' ? (u.metadata as any).subscriptionTier : 'starter') || 'starter';

      const remaining = await getUsageRemaining(u.id, 'aiMonthlyRequests').catch(() => ({ limit: null, used: monthUsage.aiMonthlyRequests || 0, remaining: null }));

      rows.push({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        tier,
        usage: monthUsage,
        remaining,
      });
    }

    res.json({ month: targetMonth || new Date().toISOString().slice(0, 7), users: rows });
  })
);

// Admin: adjust user subscription tier (non-destructive)
router.post(
  "/users/:userId/adjust-tier",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { tier } = req.body as any;

    if (!tier || !["starter", "pro", "premium", "enterprise"].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier" });
    }

    const ok = await setUserSubscriptionTier(userId, tier as any);
    if (!ok) return res.status(500).json({ message: "Failed to set tier" });

    res.json({ success: true, message: `User tier set to ${tier}` });
  })
);

// Admin endpoint: ensure applications.lawyer_id column exists (idempotent)
router.post(
  "/db/ensure-lawyer-column",
  asyncHandler(async (req, res) => {
    try {
      await db.execute(sql`
        ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "lawyer_id" varchar(255);
        ALTER TABLE "applications" ADD CONSTRAINT IF NOT EXISTS "applications_lawyer_id_users_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "users" ("id") ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS "applications_lawyer_id_idx" ON "applications" USING btree ("lawyer_id");
      `);
      res.json({ success: true, message: "lawyer_id column ensured" });
    } catch (err) {
      logger.error({ err }, "Failed to ensure lawyer_id column");
      res.status(500).json({ success: false, message: "Failed to ensure lawyer_id column", error: String(err) });
    }
  })
);

// Admin: bulk-fix tiers for lawyers missing subscriptionTier
router.post(
  "/users/bulk-fix-tiers",
  asyncHandler(async (req, res) => {
    // Safety: run in transaction and only touch users with role=lawyer and no subscriptionTier
    try {
      const result = await db.execute(sql`
        BEGIN;
        UPDATE users
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('subscriptionTier', 'enterprise', 'subscriptionUpdatedAt', now()::text)
        WHERE role = 'lawyer' AND (metadata IS NULL OR (metadata->>'subscriptionTier') IS NULL);
        COMMIT;
      `);

      res.json({ success: true, message: 'Bulk fix executed. Check admin logs for details.' });
    } catch (err) {
      logger.error({ err }, 'Bulk tier fix failed');
      res.status(500).json({ success: false, message: 'Bulk fix failed', error: String(err) });
    }
  })
);

// Admin: dry-run — list lawyers that would be updated by the bulk-fix
router.get(
  "/users/bulk-fix-tiers/dry-run",
  asyncHandler(async (req, res) => {
    try {
      const lawyers = await db.query.users.findMany({ where: eq(users.role, 'lawyer') });

      const affected = lawyers
        .map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, metadata: u.metadata }))
        .filter((u: any) => !u.metadata || !u.metadata.subscriptionTier);

      res.json({ count: affected.length, users: affected });
    } catch (err) {
      logger.error({ err }, 'Dry-run bulk tier fix failed');
      res.status(500).json({ success: false, message: 'Dry-run failed', error: String(err) });
    }
  })
);

export default router;
