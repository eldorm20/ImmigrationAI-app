import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { applications, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendApplicationStatusNotification, notifyAdmins } from "../lib/notifications";

const router = Router();

// Send custom notification (admin only)
router.post(
  "/send",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { userId, subject, message } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    logger.info({ userId, subject }, "Notification sent");
    res.json({ message: "Notification sent" });
  })
);

// Notify application status change
router.post(
  "/application-status/:applicationId",
  authenticate,
  requireRole("admin", "lawyer"),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { status } = req.body;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    const applicant = await db.query.users.findFirst({
      where: eq(users.id, application.userId),
    });

    await sendApplicationStatusNotification(
      application.userId,
      applicationId,
      status,
      applicant?.firstName || ""
    );

    logger.info({ applicationId, status }, "Status notification sent");
    res.json({ message: "Notification sent to applicant" });
  })
);

// Notify all admins
router.post(
  "/notify-admins",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { subject, message } = req.body;

    await notifyAdmins(subject, message);

    logger.info({ subject }, "Admin notification sent");
    res.json({ message: "Admins notified" });
  })
);

export default router;