import express from "express";
import { authenticate } from "../middleware/auth";
import { errorHandler } from "../middleware/errorHandler";
import * as db from "../db";
import { logger } from "../lib/logger";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";

const router = express.Router();

// Get user settings
router.get("/settings", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const user = await db.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        avatar: users.avatar,
        role: users.role,
        metadata: users.metadata,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user[0]);
  } catch (err) {
    logger.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// Update profile information
router.put("/settings", authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;
    const userId = req.user!.userId;

    // Build update object dynamically
    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;

    if (Object.keys(updates).length === 0) {
      return res.json({
        success: true,
        message: "No updates provided",
        updates: {},
      });
    }

    // Update user
    const result = await db.db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    res.json({
      success: true,
      message: "Profile updated successfully",
      updates,
      user: result[0],
    });
  } catch (err) {
    logger.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Change password
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Get user with current password
    const userResult = await db.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult[0];

    // Verify current password
    const isPasswordValid = await verifyPassword(user.hashedPassword, currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db.db
      .update(users)
      .set({ hashedPassword })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    logger.error({ err }, "Failed to change password");
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Update privacy settings
router.put("/privacy-settings", authenticate, async (req, res) => {
  try {
    const { privacySettings } = req.body;
    const userId = req.user!.userId;

    if (!privacySettings) {
      return res.status(400).json({ error: "Privacy settings required" });
    }

    // Get current metadata
    const userResult = await db.db
      .select({ metadata: users.metadata })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const metadata = (userResult[0].metadata || {}) as any;

    // Update privacy settings in metadata
    const updatedMetadata = {
      ...metadata,
      privacySettings,
      updatedAt: new Date().toISOString(),
    };

    // Update user
    await db.db
      .update(users)
      .set({ metadata: updatedMetadata })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: "Privacy settings updated successfully",
      privacySettings,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update privacy settings");
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
});

// Update notification settings
router.put("/notification-settings", authenticate, async (req, res) => {
  try {
    const { notificationSettings } = req.body;
    const userId = req.user!.userId;

    if (!notificationSettings) {
      return res.status(400).json({ error: "Notification settings required" });
    }

    // Get current metadata
    const userResult = await db.db
      .select({ metadata: users.metadata })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const metadata = (userResult[0].metadata || {}) as any;

    // Update notification settings in metadata
    const updatedMetadata = {
      ...metadata,
      notificationSettings,
      updatedAt: new Date().toISOString(),
    };

    // Update user
    await db.db
      .update(users)
      .set({ metadata: updatedMetadata })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: "Notification settings updated successfully",
      notificationSettings,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update notification settings");
    res.status(500).json({ error: "Failed to update notification settings" });
  }
});

// Update user preferences
router.put("/preferences", authenticate, async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user!.userId;

    if (!preferences) {
      return res.status(400).json({ error: "Preferences required" });
    }

    // Get current metadata
    const userResult = await db.db
      .select({ metadata: users.metadata })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const metadata = (userResult[0].metadata || {}) as any;

    // Update preferences in metadata
    const updatedMetadata = {
      ...metadata,
      preferences: {
        language: preferences.language || "en",
        fontSize: preferences.fontSize || "medium",
        theme: preferences.theme || "light",
        ...preferences,
      },
      updatedAt: new Date().toISOString(),
    };

    // Update user
    await db.db
      .update(users)
      .set({ metadata: updatedMetadata })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: "Preferences updated successfully",
      preferences: updatedMetadata.preferences,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update preferences");
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// Update language (shorthand for PATCH /settings/language)
router.patch("/language", authenticate, async (req, res) => {
  try {
    const { language } = req.body;
    const userId = req.user!.userId;

    if (!language) {
      return res.status(400).json({ error: "Language required" });
    }

    // Get current metadata
    const userResult = await db.db
      .select({ metadata: users.metadata })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const metadata = (userResult[0].metadata || {}) as any;
    const updatedMetadata = {
      ...metadata,
      preferences: {
        ...(metadata.preferences || {}),
        language,
      },
      updatedAt: new Date().toISOString(),
    };

    await db.db
      .update(users)
      .set({ metadata: updatedMetadata })
      .where(eq(users.id, userId));

    res.json({ success: true, language });
  } catch (err) {
    logger.error({ err }, "Failed to update language");
    res.status(500).json({ error: "Failed to update language" });
  }
});

export default router;
export { router as settingsRouter };
