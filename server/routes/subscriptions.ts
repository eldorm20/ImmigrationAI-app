<<<<<<< HEAD
import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
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
    const userId = req.user!.userId;
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
    const userId = req.user!.userId;
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
    const userId = req.user!.userId;
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

      // If Stripe returned a payment intent (incomplete subscription flow), expose the client_secret
      const paymentIntentClientSecret =
        (subscription as any)?.latest_invoice?.payment_intent?.client_secret || null;

      res.json({
        success: true,
        message: `Upgraded to ${tierConfig.name} tier`,
        tier,
        subscription: { id: subscription.id, status: subscription.status },
        paymentIntentClientSecret,
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

// Rich subscription details: tier + (optional) provider-backed subscription status
router.get(
  "/details",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

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
    const userId = req.user!.userId;
    
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

// Admin: list subscriptions (debugging)
router.get(
  "/admin/list",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    try {
      const subs = await db.query.subscriptions.findMany();
      res.json({ subscriptions: subs });
    } catch (err) {
      console.error("Failed to list subscriptions:", err);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  })
);

// Cancel subscription
router.post(
  "/cancel",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    
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

=======
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
      logger.error({ error }, "Error fetching billing history");
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
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
>>>>>>> 3358f8f (feat: Implement all 5 growth optimizations - pricing redesign, eligibility quiz, partner program, feature badges, mobile optimization)
