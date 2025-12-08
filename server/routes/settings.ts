import express from "express";
import { authenticate } from "../middleware/auth";
import { errorHandler } from "../middleware/errorHandler";
import * as db from "../db";
import { logger } from "../lib/logger";

const router = express.Router();

// Get user settings
router.get("/settings", authenticate, async (req, res) => {
  try {
    const user = req.user!;
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      metadata: user.metadata,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// Update profile information
router.put("/settings", authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;
    const userId = req.user!.id;

    // Update user with provided fields
    const updates: Record<string, any> = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;

    // Execute update query
    const result = await db.db.execute(
      `UPDATE users SET ${Object.keys(updates).map((k) => `${k} = ?`).join(", ")}, updated_at = NOW() WHERE id = ?`,
      [...Object.values(updates), userId]
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      updates,
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
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    // Get user from database
    const user = await db.db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (!user || !user[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password (simplified - in production use bcrypt)
    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(currentPassword, user[0].password);

    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.db.execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);

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
    const { profilePublic, showEmail, allowMessages, dataSharing } = req.body;
    const userId = req.user!.id;

    const privacySettings = {
      profilePublic: Boolean(profilePublic),
      showEmail: Boolean(showEmail),
      allowMessages: Boolean(allowMessages),
      dataSharing: Boolean(dataSharing),
    };

    // Get current metadata
    const user = await db.db.query("SELECT metadata FROM users WHERE id = ?", [
      userId,
    ]);

    const metadata = user[0]?.metadata ? JSON.parse(user[0].metadata) : {};
    metadata.privacy = privacySettings;

    // Update user metadata
    await db.db.execute("UPDATE users SET metadata = ? WHERE id = ?", [
      JSON.stringify(metadata),
      userId,
    ]);

    res.json({
      success: true,
      message: "Privacy settings updated",
      settings: privacySettings,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update privacy settings");
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
});

// Update notification settings
router.put("/notification-settings", authenticate, async (req, res) => {
  try {
    const {
      emailNotifications,
      applicationUpdates,
      documentReminders,
      consultationReminders,
      newsAndUpdates,
    } = req.body;
    const userId = req.user!.id;

    const notificationSettings = {
      emailNotifications: Boolean(emailNotifications),
      applicationUpdates: Boolean(applicationUpdates),
      documentReminders: Boolean(documentReminders),
      consultationReminders: Boolean(consultationReminders),
      newsAndUpdates: Boolean(newsAndUpdates),
    };

    // Get current metadata
    const user = await db.db.query("SELECT metadata FROM users WHERE id = ?", [
      userId,
    ]);

    const metadata = user[0]?.metadata ? JSON.parse(user[0].metadata) : {};
    metadata.notifications = notificationSettings;

    // Update user metadata
    await db.db.execute("UPDATE users SET metadata = ? WHERE id = ?", [
      JSON.stringify(metadata),
      userId,
    ]);

    res.json({
      success: true,
      message: "Notification settings updated",
      settings: notificationSettings,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update notification settings");
    res
      .status(500)
      .json({ error: "Failed to update notification settings" });
  }
});

// Update preferences (language, theme, etc.)
router.put("/preferences", authenticate, async (req, res) => {
  try {
    const { language, theme, fontSize } = req.body;
    const userId = req.user!.id;

    const preferences = {
      language: language || "en",
      theme: theme || "light",
      fontSize: fontSize || "normal",
    };

    // Get current metadata
    const user = await db.db.query("SELECT metadata FROM users WHERE id = ?", [
      userId,
    ]);

    const metadata = user[0]?.metadata ? JSON.parse(user[0].metadata) : {};
    metadata.preferences = preferences;

    // Update user metadata
    await db.db.execute("UPDATE users SET metadata = ? WHERE id = ?", [
      JSON.stringify(metadata),
      userId,
    ]);

    res.json({
      success: true,
      message: "Preferences updated",
      preferences,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update preferences");
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

export const settingsRouter = router;
