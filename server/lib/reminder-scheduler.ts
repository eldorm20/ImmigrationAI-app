/**
 * Reminders Scheduler
 * Background job for processing and sending scheduled reminders
 */

import { db } from "../db";
import { reminders, deadlines, users } from "@shared/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendEmail } from "./email";

interface ReminderJob {
    id: string;
    userId: string;
    title: string;
    message: string | null;
    channel: string;
    userEmail?: string;
}

/**
 * Process pending reminders
 * Should be called periodically (e.g., every 5 minutes via cron)
 */
export async function processReminders(): Promise<number> {
    const now = new Date();
    let sentCount = 0;

    try {
        // Get pending reminders that are due
        const pendingReminders = await db
            .select({
                id: reminders.id,
                userId: reminders.userId,
                title: reminders.title,
                message: reminders.message,
                channel: reminders.channel,
            })
            .from(reminders)
            .where(and(
                eq(reminders.isSent, false),
                lte(reminders.scheduledFor, now)
            ))
            .limit(50); // Process in batches

        if (pendingReminders.length > 0) {
            logger.info({ count: pendingReminders.length }, "Processing pending reminders");
        }

        for (const reminder of pendingReminders) {
            try {
                // Get user email
                const user = await db.query.users.findFirst({
                    where: eq(users.id, reminder.userId),
                    columns: { email: true, firstName: true },
                });

                if (!user) {
                    logger.warn({ reminderId: reminder.id }, "User not found for reminder");
                    continue;
                }

                // Send based on channel
                if (reminder.channel === "email" || !reminder.channel) {
                    await sendReminderEmail(user.email, reminder.title, reminder.message || "", user.firstName);
                }

                // Mark as sent
                await db
                    .update(reminders)
                    .set({
                        isSent: true,
                        sentAt: new Date(),
                    })
                    .where(eq(reminders.id, reminder.id));

                sentCount++;
            } catch (err) {
                logger.error({ err, reminderId: reminder.id }, "Failed to process reminder");
            }
        }

        if (sentCount > 0) {
            logger.info({ sentCount }, "Reminders processed");
        }
        return sentCount;
    } catch (err) {
        logger.error({ err }, "Failed to process reminders batch");
        throw err;
    }
}

/**
 * Generate deadline reminders
 * Should be run daily to create reminder entries for upcoming deadlines
 */
export async function generateDeadlineReminders(): Promise<number> {
    let createdCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // Get upcoming deadlines with reminder days set
        const upcomingDeadlines = await db
            .select()
            .from(deadlines)
            .where(and(
                eq(deadlines.isCompleted, false),
                sql`${deadlines.dueDate} > now()`,
                sql`${deadlines.reminderDays} > 0`
            ));

        for (const deadline of upcomingDeadlines) {
            const dueDate = new Date(deadline.dueDate);
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(reminderDate.getDate() - (deadline.reminderDays || 7));
            reminderDate.setHours(9, 0, 0, 0); // Send at 9 AM

            // Check if reminder already exists
            if (reminderDate <= today) continue; // Too late

            const existing = await db.query.reminders.findFirst({
                where: and(
                    eq(reminders.deadlineId, deadline.id),
                    eq(reminders.isSent, false)
                ),
            });

            if (existing) continue; // Already has pending reminder

            // Create reminder
            await db.insert(reminders).values({
                userId: deadline.userId || deadline.lawyerId || "",
                applicationId: deadline.applicationId,
                deadlineId: deadline.id,
                type: "deadline",
                title: `Upcoming Deadline: ${deadline.title}`,
                message: `You have a deadline in ${deadline.reminderDays} days: ${deadline.title}. Due: ${dueDate.toLocaleDateString()}`,
                scheduledFor: reminderDate,
                channel: "email",
            });

            createdCount++;
        }

        logger.info({ createdCount }, "Deadline reminders generated");
        return createdCount;
    } catch (err) {
        logger.error({ err }, "Failed to generate deadline reminders");
        throw err;
    }
}

/**
 * Send reminder email
 */
async function sendReminderEmail(
    email: string,
    subject: string,
    message: string,
    firstName?: string | null
): Promise<void> {
    const greeting = firstName ? `Dear ${firstName}` : "Hello";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .message { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Reminder</h1>
                </div>
                <div class="content">
                    <p>${greeting},</p>
                    <div class="message">
                        <h3>${subject}</h3>
                        <p>${message}</p>
                    </div>
                    <p style="margin-top: 20px;">Please take action on this item at your earliest convenience.</p>
                    <p>Best regards,<br>ImmigrationAI Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated reminder from ImmigrationAI</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await sendEmail({
        to: email,
        subject: `[Reminder] ${subject}`,
        html: htmlContent,
    });
}

/**
 * Start reminder scheduler (call on server startup)
 */
export function startReminderScheduler(intervalMinutes: number = 5): NodeJS.Timeout {
    logger.info({ intervalMinutes }, "Starting reminder scheduler");

    // Process immediately on startup
    processReminders().catch(err => {
        logger.error({ err }, "Initial reminder processing failed");
    });

    // Set up interval
    const interval = setInterval(() => {
        processReminders().catch(err => {
            logger.error({ err }, "Scheduled reminder processing failed");
        });
    }, intervalMinutes * 60 * 1000);

    return interval;
}

/**
 * Start daily deadline reminder generator
 */
export function startDailyDeadlineReminderJob(): NodeJS.Timeout {
    logger.info("Starting daily deadline reminder generator");

    // Calculate ms until next 6 AM
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(6, 0, 0, 0);
    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    // Run at 6 AM daily
    setTimeout(() => {
        generateDeadlineReminders().catch(err => {
            logger.error({ err }, "Daily deadline reminder generation failed");
        });

        // Set up 24-hour interval after first run
        setInterval(() => {
            generateDeadlineReminders().catch(err => {
                logger.error({ err }, "Daily deadline reminder generation failed");
            });
        }, 24 * 60 * 60 * 1000);
    }, msUntilNextRun);

    return setInterval(() => { }, 0); // Dummy interval for cleanup
}
