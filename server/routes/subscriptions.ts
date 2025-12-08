import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
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

      if (!subscription) {
        // createSubscription returns null on failure — return a clearer message
        return res.status(500).json({
          success: false,
          message: "Subscription creation failed — see server logs for details",
        });
      }

      res.json({
        success: true,
        message: `Upgraded to ${tierConfig.name} tier`,
        tier,
        subscription: { id: subscription.id, status: subscription.status },
      });
    } catch (error) {
      console.error("Subscription upgrade error:", error);
      res.status(400).json({
        message: "Failed to create subscription",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

// Get current subscription with details
router.get(
  "/current",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    try {
      const subscription = await db
        .selectFrom("subscriptions")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(1)
        .executeTakeFirst();

      if (!subscription) {
        return res.json({
          id: "free",
          userId,
          plan: "starter",
          status: "active",
          amount: 0,
          currency: "USD",
          startDate: new Date().toISOString(),
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      res.json({
        id: subscription.id,
        userId: subscription.user_id,
        plan: subscription.tier || "professional",
        status: subscription.status,
        amount: subscription.amount || 29,
        currency: subscription.currency || "USD",
        startDate: subscription.created_at,
        renewalDate: subscription.renewal_date,
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  })
);

// Get billing history
router.get(
  "/billing-history",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    try {
      // For now, return empty billing history
      // In production, this would fetch from Stripe
      const billingHistory = [];

      res.json(billingHistory);
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  })
);

// Cancel subscription
router.post(
  "/cancel",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    try {
      const subscription = await db
        .selectFrom("subscriptions")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(1)
        .executeTakeFirst();

      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      // Update subscription status to cancelled
      await db
        .updateTable("subscriptions")
        .set({ status: "cancelled" })
        .where("id", "=", subscription.id)
        .execute();

      res.json({
        success: true,
        message: "Subscription cancelled successfully",
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  })
);

export default router;
