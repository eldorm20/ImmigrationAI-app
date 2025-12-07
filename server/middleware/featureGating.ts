import { Request, Response, NextFunction } from "express";
import { getUserSubscriptionTier, getTierFeatures, getFeatureLimit } from "../lib/subscriptionTiers";
import { AppError } from "./errorHandler";
import { logger } from "../lib/logger";

export async function checkFeatureLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  feature: keyof any,
  currentUsage: number
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const tier = await getUserSubscriptionTier(userId);
    const tierFeatures = getTierFeatures(tier);
    const limit = tierFeatures.features[feature as any];

    if (typeof limit !== "number") {
      throw new AppError(400, "Invalid feature");
    }

    if (currentUsage >= limit) {
      throw new AppError(
        403,
        `You have reached the limit for ${feature.replace(/_/g, " ")} on your ${tier} plan. Upgrade to continue.`
      );
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      logger.error({ error }, "Feature limit check failed");
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export async function enforceFeatureGating(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, "Unauthorized");
      }

      const tier = await getUserSubscriptionTier(userId);
      const tierFeatures = getTierFeatures(tier).features;
      const hasAccess = tierFeatures[feature as any];

      if (!hasAccess) {
        throw new AppError(
          403,
          `This feature is not available on your ${tier} plan. Upgrade to access it.`
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error({ error }, "Feature gating check failed");
        res.status(500).json({ message: "Internal server error" });
      }
    }
  };
}
