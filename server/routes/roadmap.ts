import { Router } from "express";
import { db } from "../db";
import { roadmapItems, applications, documents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { updateRoadmapProgress } from "../lib/roadmap";

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

// Get progress data for roadmap (and auto-update based on documents)
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

    // Fetch roadmap items (ordered)
    let items = await db.query.roadmapItems.findMany({
      where: eq(roadmapItems.applicationId, applicationId),
      orderBy: (items, { asc }) => asc(items.order),
    });

    // If no roadmap items exist, create default stages based on visa type
    if (items.length === 0) {
      const { createDefaultRoadmap } = await import("../lib/roadmap");
      await createDefaultRoadmap(applicationId, application.visaType);

      // Re-fetch after creation
      items = await db.query.roadmapItems.findMany({
        where: eq(roadmapItems.applicationId, applicationId),
        orderBy: (items, { asc }) => asc(items.order),
      });
    }

    // Update progress logic now centralized
    await updateRoadmapProgress(applicationId);

    // Re-fetch items after update
    const finalItems = await db.query.roadmapItems.findMany({
      where: eq(roadmapItems.applicationId, applicationId),
      orderBy: (items, { asc }) => asc(items.order),
    });

    // Calculate progress stats
    const total = finalItems.length;
    const completed = finalItems.filter(item => item.status === "completed").length;
    const currentItem = finalItems.find(item => item.status === "current");
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate estimated completion date
    const remainingDays = finalItems
      .filter(item => item.status !== "completed")
      .reduce((sum, item) => sum + ((item as any).estimatedDays || 7), 0);
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + remainingDays);

    res.json({
      total,
      completed,
      percentComplete,
      currentItem,
      items: finalItems,
      estimatedCompletion: estimatedCompletion.toISOString(),
    });

  })
);

export default router;
