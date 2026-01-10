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

export const CLIENT_TIERS: Record<SubscriptionTier, TierFeatures> = {
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyPrice: 0,
    stripePriceId: "price_starter_free",
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
    },
  },
  professional: {
    tier: "professional",
    name: "Professional",
    monthlyPrice: 15000, // 15,000 UZS for Clients
    stripePriceId: process.env.STRIPE_CLIENT_PRO_PRICE_ID || "price_client_pro_15k",
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
    },
  },
  premium: {
    tier: "premium",
    name: "Premium",
    monthlyPrice: 50000, // 50,000 UZS for Clients
    stripePriceId: process.env.STRIPE_CLIENT_PREMIUM_PRICE_ID || "price_client_premium_50k",
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
    },
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPrice: 200000, // Balanced for power clients/family
    stripePriceId: process.env.STRIPE_CLIENT_ENTERPRISE_PRICE_ID || "price_client_ent_200k",
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
    },
  },
};

export const LAWYER_TIERS: Record<SubscriptionTier, TierFeatures> = {
  starter: {
    tier: "starter",
    name: "Lawyer Starter",
    monthlyPrice: 0,
    stripePriceId: "price_lawyer_starter_free",
    features: {
      documentUploadLimit: 100,
      aiDocumentGenerations: 50,
      aiMonthlyRequests: 1000,
      consultationsPerMonth: 10,
      researchLibraryAccess: true,
      prioritySupport: false,
      advancedAnalytics: true,
      customReports: false,
      lawyerDirectory: true,
      commissionRate: 15,
    },
  },
  professional: {
    tier: "professional",
    name: "Lawyer Professional",
    monthlyPrice: 375000, // 375,000 UZS for Lawyers
    stripePriceId: process.env.STRIPE_LAWYER_PRO_PRICE_ID || "price_lawyer_pro_375k",
    features: {
      documentUploadLimit: 500,
      aiDocumentGenerations: 200,
      aiMonthlyRequests: 15000,
      consultationsPerMonth: 50,
      researchLibraryAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customReports: true,
      lawyerDirectory: true,
      commissionRate: 12,
    },
  },
  premium: {
    tier: "premium",
    name: "Lawyer Premium",
    monthlyPrice: 1200000, // 1,200,000 UZS for Lawyers
    stripePriceId: process.env.STRIPE_LAWYER_PREMIUM_PRICE_ID || "price_lawyer_premium_1m2",
    features: {
      documentUploadLimit: 2000,
      aiDocumentGenerations: 1000,
      aiMonthlyRequests: 50000,
      consultationsPerMonth: 200,
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
    name: "Lawyer Enterprise",
    monthlyPrice: 3850000, // 3,850,000 UZS for Law Firms
    stripePriceId: process.env.STRIPE_LAWYER_ENTERPRISE_PRICE_ID || "price_lawyer_ent_3m8",
    features: {
      documentUploadLimit: 50000,
      aiDocumentGenerations: 10000,
      aiMonthlyRequests: -1, // Unlimited
      consultationsPerMonth: -1, // Unlimited
      researchLibraryAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customReports: true,
      lawyerDirectory: true,
      commissionRate: 5,
    },
  },
};

// For backward compatibility and shared logic, we provide a getter based on role
export function getTierConfig(role: string = "applicant"): Record<SubscriptionTier, TierFeatures> {
  return role === "lawyer" ? LAWYER_TIERS : CLIENT_TIERS;
}

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
    const config = getTierConfig(user.role);

    // If user has explicit tier in metadata, respect it
    if (tier && Object.keys(config).includes(tier)) {
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

export async function getTierFeaturesForUser(userId: string): Promise<TierFeatures> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  const tier = await getUserSubscriptionTier(userId);
  const config = getTierConfig(user?.role || "applicant");
  return config[tier] || config.starter;
}

export function getTierFeatures(tier: SubscriptionTier, role: string = "applicant"): TierFeatures {
  const config = getTierConfig(role);
  return config[tier] || config.starter;
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof TierFeatures["features"]
): Promise<boolean> {
  try {
    const features = (await getTierFeaturesForUser(userId)).features;

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
    const features = (await getTierFeaturesForUser(userId)).features;
    const featureValue = features[feature];

    if (typeof featureValue === "number") {
      return featureValue;
    }

    return featureValue === true ? 1 : 0;
  } catch (error) {
    logger.error({ error, userId, feature }, "Failed to get feature limit");
    return 0;
  }
}
