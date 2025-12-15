import { Router } from "express";
import { db } from "../db";
import { roadmapItems, applications, documents } from "@shared/schema";
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

    // Fetch uploaded documents
    const uploadedDocs = await db.query.documents.findMany({
      where: eq(documents.applicationId, applicationId),
    });

    // Keyword mapping for auto-completion
    const docKeywords: Record<string, string[]> = {
      "passport": ["passport"],
      "cv": ["cv", "resume", "curriculum vitae"],
      "resume": ["cv", "resume", "curriculum vitae"],
      "bank": ["bank", "financial", "statement"],
      "financial": ["bank", "financial", "statement"],
      "police": ["police", "report", "clearance"],
      "medical": ["medical", "health", "exam"],
      "photo": ["photo", "picture"],
      "motivation": ["motivation", "letter", "intent"],
    };

    let hasUpdates = false;

    // 1. Update status based on documents
    for (const item of items) {
      // Skip if already completed to avoid overwriting (unless we want to enforce it?)
      // Let's enforce completion if doc exists
      if (item.status === "completed") continue;

      const lowerTitle = item.title.toLowerCase();
      let isCompleted = false;

      // Check keywords
      for (const [key, variants] of Object.entries(docKeywords)) {
        if (variants.some(v => lowerTitle.includes(v))) {
          // Check if corresponding document exists
          // We check if any uploaded doc's type matches or fileName (loosely)
          const hasDoc = uploadedDocs.some(d => {
            const dType = d.documentType?.toLowerCase() || "";
            const dName = d.fileName.toLowerCase();
            return dType.includes(key) || dName.includes(key) || variants.some(v => dType.includes(v) || dName.includes(v));
          });

          if (hasDoc) {
            isCompleted = true;
            break;
          }
        }
      }

      if (isCompleted) {
        await db.update(roadmapItems)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(roadmapItems.id, item.id));
        item.status = "completed";
        hasUpdates = true;
      }
    }

    // 2. Logic to maintain "Pending" -> "Current" flow.
    // Find the first non-completed item and make it "current". All previous must be completed.
    // Actually, usually we just set the first non-completed to current.

    // Refresh items if updated (or just modify in memory for calculation, but we want to persist "current" status too)
    if (hasUpdates) {
      items = await db.query.roadmapItems.findMany({
        where: eq(roadmapItems.applicationId, applicationId),
        orderBy: (items, { asc }) => asc(items.order),
      });
    }

    // Find first non-completed
    const firstPendingIndex = items.findIndex(i => i.status !== "completed");

    if (firstPendingIndex !== -1) {
      const currentItem = items[firstPendingIndex];
      // If it's pending, mark it as current
      if (currentItem.status === "pending") {
        await db.update(roadmapItems)
          .set({ status: "current" })
          .where(eq(roadmapItems.id, currentItem.id));
        currentItem.status = "current";
        hasUpdates = true;
      }

      // Ensure subsequent items are pending (if they were somehow current?)
      for (let i = firstPendingIndex + 1; i < items.length; i++) {
        if (items[i].status === "current") {
          await db.update(roadmapItems)
            .set({ status: "pending" })
            .where(eq(roadmapItems.id, items[i].id));
          items[i].status = "pending";
          hasUpdates = true;
        }
      }
    }

    // Helper functions
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
