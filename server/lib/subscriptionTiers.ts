import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type SubscriptionTier = "starter" | "professional" | "premium" | "enterprise";

export interface TierFeatures {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  stripePriceId: string;
  features: {
    documentUploadLimit: number; // per month
    aiDocumentGenerations: number; // per month
    aiMonthlyRequests: number; // AI chat/translate requests per month
    consultationsPerMonth: number;
    researchLibraryAccess: boolean;
    prioritySupport: boolean;
    advancedAnalytics: boolean;
    customReports: boolean;
    lawyerDirectory: boolean;
    commissionRate?: number; // Extra for lawyers
  };
}

export const TIER_CONFIGURATIONS: Record<SubscriptionTier, TierFeatures> = {
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyPrice: 0,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    features: {
      documentUploadLimit: 50,
      aiDocumentGenerations: 20,
      aiMonthlyRequests: 500,
      consultationsPerMonth: 5,
      researchLibraryAccess: true,
      prioritySupport: false,
      advancedAnalytics: false,
      customReports: false,
      lawyerDirectory: true,
      commissionRate: 15,
    },
  },
  professional: {
    tier: "professional",
    name: "Professional",
    monthlyPrice: 375000, // Balanced for applicants
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "price_professional_uzs_375k",
    features: {
      documentUploadLimit: 150,
      aiDocumentGenerations: 75,
      aiMonthlyRequests: 7500,
      consultationsPerMonth: 30,
      researchLibraryAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customReports: false,
      lawyerDirectory: true,
      commissionRate: 12,
    },
  },
  premium: {
    tier: "premium",
    name: "Premium",
    monthlyPrice: 1200000, // Matches Lawyer Professional price
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || "price_premium_uzs_1m2",
    features: {
      documentUploadLimit: 500,
      aiDocumentGenerations: 250,
      aiMonthlyRequests: 25000,
      consultationsPerMonth: 100,
      researchLibraryAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customReports: true,
      lawyerDirectory: true,
      commissionRate: 10,
    },
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPrice: 3850000, // Heavy/Firm tier
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise_uzs_3m8",
    features: {
      documentUploadLimit: 10000,
      aiDocumentGenerations: 10000,
      aiMonthlyRequests: 1000000,
      consultationsPerMonth: 10000,
      researchLibraryAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customReports: true,
      lawyerDirectory: true,
      commissionRate: 5,
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

    // If user has explicit tier in metadata, respect it
    if (tier && Object.keys(TIER_CONFIGURATIONS).includes(tier)) {
      return tier;
    }

    // If user is a lawyer and doesn't have an explicit tier, default to starter
    // (removed temporary enterprise fallback now that migration applied)
    if (user.role === "lawyer") {
      return "starter";
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
