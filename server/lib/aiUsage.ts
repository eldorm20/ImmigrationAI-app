import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getFeatureLimit } from "./subscriptionTiers";
import { logger } from "./logger";
import { AppError } from "../middleware/errorHandler";

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
