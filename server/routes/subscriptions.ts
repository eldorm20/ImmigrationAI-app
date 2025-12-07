import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getUserSubscriptionTier,
  getTierFeatures,
  TIER_CONFIGURATIONS,
  checkFeatureAccess,
  getFeatureLimit,
  type SubscriptionTier,
} from "../lib/subscriptionTiers";
import { createSubscription } from "../lib/subscription";

const router = Router();

// Get all subscription plans
router.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const plans = Object.values(TIER_CONFIGURATIONS).map((config) => ({
      tier: config.tier,
      name: config.name,
      monthlyPrice: config.monthlyPrice,
      stripePriceId: config.stripePriceId,
      features: config.features,
    }));

    res.json({ plans });
  })
);

// Get current user subscription
router.get(
  "/current",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const tier = await getUserSubscriptionTier(userId);
    const tierFeatures = getTierFeatures(tier);

    res.json({
      tier,
      name: tierFeatures.name,
      monthlyPrice: tierFeatures.monthlyPrice,
      features: tierFeatures.features,
    });
  })
);

// Check if user has access to a feature
router.get(
  "/check/:feature",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { feature } = req.params;

    const hasAccess = await checkFeatureAccess(userId, feature as any);
    const limit = await getFeatureLimit(userId, feature as any);

    res.json({
      feature,
      hasAccess,
      limit,
    });
  })
);

// Upgrade subscription
router.post(
  "/upgrade",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { tier } = req.body;

    // Validate tier
    if (!Object.keys(TIER_CONFIGURATIONS).includes(tier)) {
      return res.status(400).json({ message: "Invalid subscription tier" });
    }

    // Free tier doesn't need Stripe
    if (tier === "free") {
      return res.json({
        success: true,
        message: "Switched to Free tier",
        tier: "free",
      });
    }

    // For paid tiers, create Stripe subscription
    const user = req.user!;
    const tierConfig = TIER_CONFIGURATIONS[tier as SubscriptionTier];

    try {
      const subscription = await createSubscription(
        userId,
        tierConfig.stripePriceId,
        user.email
      );

      res.json({
        success: true,
        message: `Upgraded to ${tierConfig.name} tier`,
        tier,
        subscription: subscription ? { id: subscription.id, status: subscription.status } : null,
      });
    } catch (error) {
      res.status(400).json({
        message: "Failed to create subscription",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

export default router;
