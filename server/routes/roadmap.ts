import { Router } from "express";
import { db } from "../db";
import { roadmapItems, applications } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

const router = Router();

// Get roadmap items for an application
router.get(
  "/application/:applicationId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Verify the application exists and user has access
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check permissions
    if (userRole === "applicant" && application.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    // Fetch roadmap items
    const items = await db.query.roadmapItems.findMany({
      where: eq(roadmapItems.applicationId, applicationId),
      orderBy: (items, { asc }) => asc(items.order),
    });

    res.json(items);
  })
);

// Get progress data for roadmap
router.get(
  "/application/:applicationId/progress",
  authenticate,
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Verify the application exists and user has access
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check permissions
    if (userRole === "applicant" && application.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    // Fetch roadmap items
    const items = await db.query.roadmapItems.findMany({
      where: eq(roadmapItems.applicationId, applicationId),
    });

    // Calculate progress
    const total = items.length;
    const completed = items.filter(item => item.status === "completed").length;
    const currentItem = items.find(item => item.status === "current");
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      total,
      completed,
      percentComplete,
      currentItem,
      items,
    });
  })
);

export default router;
