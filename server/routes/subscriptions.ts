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
import { createSubscription, getSubscriptionStatus } from "../lib/subscription";
import { users } from "@shared/schema";
import { logger } from "../lib/logger";
import { eq } from "drizzle-orm";

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
    const now = new Date();

    res.json({
      id: `sub_${userId}`,
      userId,
      plan: tier,
      status: "active",
      amount: tierFeatures.monthlyPrice,
      currency: "USD",
      startDate: now.toISOString(),
      renewalDate: tier === "starter" ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
    const { tier, planId } = req.body;

    // Accept both 'tier' and 'planId' for compatibility
    const requestedTier = tier || planId;

    if (!requestedTier) {
      return res.status(400).json({ message: "Please specify a tier or planId" });
    }

    // Validate tier
    if (!Object.keys(TIER_CONFIGURATIONS).includes(requestedTier)) {
      return res.status(400).json({ 
        message: `Invalid subscription tier: ${requestedTier}. Valid options: ${Object.keys(TIER_CONFIGURATIONS).join(", ")}`
      });
    }

    // Starter (free) tier doesn't need Stripe
    if (requestedTier === "starter") {
      return res.json({
        success: true,
        message: "Switched to Starter tier",
        tier: "starter",
      });
    }

    // For paid tiers, create Stripe subscription
    const user = req.user!;
    const tierConfig = TIER_CONFIGURATIONS[requestedTier as SubscriptionTier];

    try {
      const subscription = await createSubscription(
        userId,
        tierConfig.stripePriceId,
        user.email
      );

      if (!subscription) {
        return res.status(503).json({
          success: false,
          message: "Stripe integration is not available. Please contact support.",
        });
      }

      res.json({
        success: true,
        message: `Upgraded to ${tierConfig.name} tier`,
        tier: requestedTier,
        subscription: { id: subscription.id, status: subscription.status },
      });
    } catch (error) {
      logger.error({ error, userId }, "Subscription upgrade error");
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Subscription upgrade failed",
      });
    }
  })
);

// Rich subscription details: tier + (optional) provider-backed subscription status
router.get(
  "/details",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const tier = await getUserSubscriptionTier(userId);
    const tierFeatures = getTierFeatures(tier);

    // Attempt to return Stripe-backed subscription status if available in user metadata
    let subscriptionStatus = null;
    try {
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      const metadata = user?.metadata && typeof user.metadata === "object" ? (user.metadata as any) : {};
      const stripeSubscriptionId = metadata?.stripeSubscriptionId || metadata?.stripe_subscription_id || null;

      if (stripeSubscriptionId) {
        const status = await getSubscriptionStatus(stripeSubscriptionId as string);
        subscriptionStatus = status;
      }
    } catch (err) {
      // non-fatal — return tier info even if provider lookup fails
    }

    res.json({
      tier,
      name: tierFeatures.name,
      monthlyPrice: tierFeatures.monthlyPrice,
      features: tierFeatures.features,
      subscription: subscriptionStatus,
    });
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
