import { Router } from "express";
import { db } from "../db";
import { notifications, insertNotificationSchema } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all notifications for the current user
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.userId;

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    res.json(userNotifications);
  } catch (error) {
    logger.error({ error }, "Error fetching notifications");
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark a notification as read
router.patch("/:id/read", async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user!.userId;

  try {
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(updated);
  } catch (error) {
    logger.error({ error }, "Error marking notification as read");
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// Mark all notifications as read
router.post("/read-all", async (req, res) => {
  const userId = req.user!.userId;

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    logger.error({ error }, "Error marking all notifications as read");
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

// Delete a notification
router.delete("/:id", async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user!.userId;

  try {
    const [deleted] = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    logger.error({ error }, "Error deleting notification");
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

// Create a new notification (Internal/Admin usage mostly, but useful for testing)
router.post("/", async (req, res) => {
  try {
    const data = insertNotificationSchema.parse({
      ...req.body,
      userId: req.body.userId || req.user!.userId, // Allow specifying userId for admin, else default to self
    });

    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();

    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error.errors);
    }
    logger.error({ error }, "Error creating notification");
    res.status(500).json({ message: "Failed to create notification" });
  }
});

export default router;
