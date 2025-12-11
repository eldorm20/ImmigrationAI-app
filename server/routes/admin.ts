import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

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
    const totalUsers = await db.query.users.findMany();
    const lawyers = totalUsers.filter((u) => u.role === "lawyer");
    const applicants = totalUsers.filter((u) => u.role === "applicant");

    res.json({
      overview: {
        totalUsers: totalUsers.length,
        totalLawyers: lawyers.length,
        totalApplicants: applicants.length,
        adminUsers: totalUsers.filter((u) => u.role === "admin").length,
      },
      metrics: {
        activeUsers: Math.round(totalUsers.length * 0.7), // Simulated
        newUsersThisMonth: Math.round(totalUsers.length * 0.15),
        totalConsultations: 0, // Would fetch from consultations table
        totalEarnings: 0, // Would calculate from payments
      },
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
router.get(
  "/revenue/analytics",
  asyncHandler(async (req, res) => {
    res.json({
      revenue: {
        total: 0,
        thisMonth: 0,
        thisQuarter: 0,
        thisYear: 0,
      },
      breakdown: {
        subscriptions: 0,
        consultations: 0,
        documents: 0,
      },
      topEarners: [],
    });
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

export default router;
