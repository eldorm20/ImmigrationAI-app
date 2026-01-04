import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { enqueueJob } from "./queue";
import {
  generateApplicationStatusEmail,
  generateConsultationEmail,
} from "./email";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
}

// Send notification (queued)
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      logger.warn({ userId: payload.userId }, "User not found for notification");
      return;
    }

    // Queue notification
    await enqueueJob(payload.userId, "notification", payload);

    logger.info({ userId: payload.userId }, "Notification queued");
  } catch (error) {
    logger.error({ error, payload }, "Failed to queue notification");
  }
}

// Send application status update
export async function sendApplicationStatusNotification(
  userId: string,
  applicationId: string,
  status: string,
  applicantName: string = ""
): Promise<void> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.emailVerified) {
      logger.warn({ userId }, "User not found or email not verified");
      return;
    }

    const name = applicantName || user.firstName || "Applicant";
    const html = generateApplicationStatusEmail(status, name, applicationId);

    await enqueueJob(userId, "email", {
      to: user.email,
      subject: `Application Status Updated - ${status}`,
      html,
    });

    logger.info({ userId, applicationId }, "Status notification queued");
  } catch (error) {
    logger.error({ error }, "Failed to send status notification");
  }
}

// Send consultation booking notification
export async function sendConsultationNotification(
  userId: string,
  lawyerName: string,
  scheduledTime: Date,
  meetingLink?: string
): Promise<void> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.emailVerified) {
      logger.warn({ userId }, "User not found or email not verified");
      return;
    }

    const html = generateConsultationEmail(lawyerName, scheduledTime, meetingLink);

    await enqueueJob(userId, "email", {
      to: user.email,
      subject: "Consultation Scheduled - ImmigrationAI",
      html,
    });

    logger.info({ userId }, "Consultation notification queued");
  } catch (error) {
    logger.error({ error }, "Failed to send consultation notification");
  }
}

// Bulk notification to admins
export async function notifyAdmins(subject: string, message: string): Promise<void> {
  try {
    const admins = await db.query.users.findMany({
      where: eq(users.role, "admin"),
    });

    for (const admin of admins) {
      if (admin.emailVerified) {
        await enqueueJob(admin.id, "email", {
          to: admin.email,
          subject: `[ADMIN] ${subject}`,
          html: `<p>${message}</p>`,
        });
      }
    }

    logger.info({ count: admins.length }, "Admin notifications queued");
  } catch (error) {
    logger.error({ error }, "Failed to notify admins");
  }
}

// Send SMS notification (placeholder for local providers)
export async function sendSmsNotification(
  userId: string,
  message: string
): Promise<void> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.phone) {
      logger.warn({ userId }, "User not found or has no phone number for SMS");
      return;
    }

    // This is a placeholder for local SMS providers like Eskiz.uz or SMS.uz
    // In a real production environment, we would call their API here.
    logger.info({
      userId,
      phoneNumber: user.phone,
      messageLength: message.length
    }, "[SMS PROVIDER PLACEHOLDER] SMS would be sent now");

    // Add to notification queue for history tracking
    await enqueueJob(userId, "notification", {
      userId,
      title: "SMS Sent",
      message: message,
      type: "info"
    });
  } catch (error) {
    logger.error({ error, userId }, "Failed to process SMS notification");
  }
}