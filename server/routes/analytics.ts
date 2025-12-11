import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getDashboardStats, getUserAnalytics } from "../lib/analytics";
import { logger } from "../lib/logger";

const router = Router();

// Get analytics dashboard
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

    // TODO: Implement event tracking storage
    logger.info({ userId: req.user!.userId, eventType }, "Event tracked");

    res.json({ message: "Event tracked successfully" });
  })
);

export default router;
