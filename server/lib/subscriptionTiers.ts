import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type SubscriptionTier = "starter" | "pro" | "premium";

export interface TierFeatures {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  stripePriceId: string;
  features: {
    documentUploadLimit: number; // per month
    aiDocumentGenerations: number; // per month
    consultationsPerMonth: number;
    researchLibraryAccess: boolean;
    prioritySupport: boolean;
    advancedAnalytics: boolean;
    customReports: boolean;
    lawyerDirectory: boolean;
  };
}

export const TIER_CONFIGURATIONS: Record<SubscriptionTier, TierFeatures> = {
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyPrice: 0,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    features: {
      documentUploadLimit: 5,
      aiDocumentGenerations: 2,
      aiMonthlyRequests: 100,
      consultationsPerMonth: 1,
      researchLibraryAccess: true,
      prioritySupport: false,
      advancedAnalytics: false,
      customReports: false,
      lawyerDirectory: true,
    },
  },
  pro: {
    tier: "pro",
    name: "Pro",
    monthlyPrice: 29,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_1234567890",
    features: {
      documentUploadLimit: 50,
      aiDocumentGenerations: 20,
      aiMonthlyRequests: 2000,
      consultationsPerMonth: 10,
      researchLibraryAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customReports: false,
      lawyerDirectory: true,
    },
  },
  premium: {
    tier: "premium",
    name: "Premium",
    monthlyPrice: 79,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || "price_0987654321",
    features: {
      documentUploadLimit: 200,
      aiDocumentGenerations: 100,
      aiMonthlyRequests: 10000,
      consultationsPerMonth: 50,
      researchLibraryAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customReports: true,
      lawyerDirectory: true,
    },
  },
};

export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
        return "starter";
    }

    const metadata = user.metadata && typeof user.metadata === "object" ? (user.metadata as any) : {};
    const tier = metadata?.subscriptionTier as SubscriptionTier | undefined;

    if (tier && Object.keys(TIER_CONFIGURATIONS).includes(tier)) {
      return tier;
    }

    return "starter";
  } catch (error) {
    logger.error({ error, userId }, "Failed to get user subscription tier");
    return "starter";
  }
}

export async function setUserSubscriptionTier(
  userId: string,
  tier: SubscriptionTier
): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return false;
    }

    const existingMetadata = user.metadata && typeof user.metadata === "object" ? (user.metadata as any) : {};

    await db
      .update(users)
      .set({
        metadata: JSON.parse(
          JSON.stringify({
            ...existingMetadata,
            subscriptionTier: tier,
            subscriptionUpdatedAt: new Date().toISOString(),
          })
        ),
      } as any)
      .where(eq(users.id, userId));

    logger.info({ userId, tier }, "User subscription tier updated");
    return true;
  } catch (error) {
    logger.error({ error, userId, tier }, "Failed to set subscription tier");
    return false;
  }
}

export function getTierFeatures(tier: SubscriptionTier): TierFeatures {
  // Default to starter if tier not found
  return TIER_CONFIGURATIONS[tier] || TIER_CONFIGURATIONS.starter;
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof TierFeatures["features"]
): Promise<boolean> {
  try {
    const tier = await getUserSubscriptionTier(userId);
    const features = getTierFeatures(tier).features;
    
    // For boolean features
    if (typeof features[feature] === "boolean") {
      return (features[feature] as boolean) === true;
    }

    // For numeric features (always allow if > 0)
    if (typeof features[feature] === "number") {
      return (features[feature] as number) > 0;
    }

    return false;
  } catch (error) {
    logger.error({ error, userId, feature }, "Failed to check feature access");
    return false;
  }
}

export async function getFeatureLimit(
  userId: string,
  feature: keyof TierFeatures["features"]
): Promise<number> {
  try {
    const tier = await getUserSubscriptionTier(userId);
    const featureValue = getTierFeatures(tier).features[feature];

    if (typeof featureValue === "number") {
      return featureValue;
    }

    return featureValue === true ? 1 : 0;
  } catch (error) {
    logger.error({ error, userId, feature }, "Failed to get feature limit");
    return 0;
  }
}
