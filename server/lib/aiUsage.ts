import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getFeatureLimit } from "./subscriptionTiers";
import { logger } from "./logger";
import { AppError } from "../middleware/errorHandler";
import { sendNotification } from "./notifications";
import { emailQueue } from "./queue";

function currentMonthKey() {
  const d = new Date();
  return d.toISOString().slice(0, 7); // YYYY-MM
}

export async function getUsageForUser(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const metadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};
  const month = currentMonthKey();
  const usage = metadata?.aiUsage || {};
  return (usage[month] || {});
}

// category should be a feature key like 'aiDocumentGenerations' or 'aiMonthlyRequests'
export async function incrementUsage(userId: string, category: string, amount = 1) {
  const month = currentMonthKey();

  // Get user's feature limit for this category
  const limit = await getFeatureLimit(userId, category as any);

  // Read current usage
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new AppError(404, "User not found");
  const metadata = user.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};
  const usage = metadata.aiUsage && typeof metadata.aiUsage === 'object' ? (metadata.aiUsage as any) : {};
  const monthUsage = usage[month] && typeof usage[month] === 'object' ? (usage[month] as any) : {};
  const current = (monthUsage[category] || 0) as number;

  // Check limit
  if (typeof limit === 'number' && limit >= 0) {
    if (current + amount > limit) {
      throw new AppError(403, `You have reached the limit for ${category} (${limit}/month)`);
    }
  }

  // Increment and persist
  monthUsage[category] = current + amount;
  usage[month] = monthUsage;

  const newMetadata = JSON.parse(JSON.stringify({ ...metadata, aiUsage: usage }));

  try {
    await db.update(users).set({ metadata: newMetadata } as any).where(eq(users.id, userId));

    // After successfully persisting, check for near-quota and notify once per month/category
    try {
      const limitNum = typeof limit === 'number' ? limit : NaN;
      if (!isNaN(limitNum) && limitNum > 0) {
        const used = monthUsage[category] as number;
        const remaining = Math.max(0, limitNum - used);
        const threshold = Math.max(10, Math.ceil(limitNum * 0.1)); // notify when <=10 or 10% left

        // Check whether we've already alerted this user for this month/category
        const alerts = newMetadata.aiAlerts && typeof newMetadata.aiAlerts === 'object' ? (newMetadata.aiAlerts as any) : {};
        const monthAlerts = alerts[month] && typeof alerts[month] === 'object' ? alerts[month] as any : {};

        if (remaining <= threshold && !monthAlerts[category]) {
          // mark alerted
          monthAlerts[category] = true;
          alerts[month] = monthAlerts;
          const finalMetadata = JSON.parse(JSON.stringify({ ...newMetadata, aiAlerts: alerts }));
          await db.update(users).set({ metadata: finalMetadata } as any).where(eq(users.id, userId));

          // Queue in-app notification
          try {
            await sendNotification({
              userId,
              title: "AI Usage Almost Reached",
              message: `You have ${remaining} ${category} remaining this month. Consider upgrading your plan to increase limits.`,
              type: "warning",
            });
          } catch (e) {
            logger.error({ e, userId, category }, "Failed to send in-app usage notification");
          }

          // Queue email if user has email configured
          try {
            const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
            if (user && user.email && user.emailVerified) {
              const subject = "Almost at your AI usage limit";
              const html = `<p>Hi ${user.firstName || ""},</p><p>You have <strong>${remaining}</strong> ${category} remaining for ${month}. Consider upgrading your subscription to increase your monthly AI allowance.</p><p>Thank you,<br/>ImmigrationAI</p>`;
              await emailQueue.add({ to: user.email, subject, html }, { priority: 5 });
            }
          } catch (e) {
            logger.error({ e, userId, category }, "Failed to queue email usage notification");
          }
        }
      }
    } catch (e) {
      logger.error({ e, userId, category }, "Post-persist usage notification check failed");
    }

    return monthUsage[category];
  } catch (err) {
    logger.error({ err, userId, category }, "Failed to persist AI usage");
    throw new AppError(500, "Failed to persist usage");
  }
}

export async function getUsageRemaining(userId: string, category: string) {
  const limit = await getFeatureLimit(userId, category as any);
  const month = currentMonthKey();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const metadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};
  const usage = metadata.aiUsage && typeof metadata.aiUsage === 'object' ? (metadata.aiUsage as any) : {};
  const monthUsage = usage[month] && typeof usage[month] === 'object' ? (usage[month] as any) : {};
  const current = (monthUsage[category] || 0) as number;
  return { limit, used: current, remaining: Math.max(0, (typeof limit === 'number' ? limit - current : 0)) };
}
