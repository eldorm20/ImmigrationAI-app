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
import { getUsageRemaining } from "../lib/aiUsage";
import { users, subscriptions, payments } from "@shared/schema";
import { logger } from "../lib/logger";
import { eq, desc, and, or } from "drizzle-orm";

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

// Get current usage and remaining allowances for common AI/document features
router.get(
  "/usage",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    try {
      const aiDocs = await getUsageRemaining(userId, "aiDocumentGenerations");
      const uploads = await getUsageRemaining(userId, "documentUploadLimit");
      const monthly = await getUsageRemaining(userId, "aiMonthlyRequests");

      res.json({
        aiDocumentGenerations: aiDocs,
        documentUploads: uploads,
        aiMonthlyRequests: monthly,
      });
    } catch (err) {
      logger.error({ err, userId }, "Failed to fetch usage for user");
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  })
);

// Upgrade subscription
router.post(
  "/upgrade",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

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


    // For paid tiers, use Stripe Checkout Session to collect payment details
    const user = req.user!;
    const tierConfig = TIER_CONFIGURATIONS[requestedTier as SubscriptionTier];

    // Check if tier has valid Stripe configuration
    if (!tierConfig.stripePriceId || tierConfig.stripePriceId.includes('_placeholder') || tierConfig.stripePriceId.includes('_99')) {
      logger.warn({ tier: requestedTier, priceId: tierConfig.stripePriceId }, "Tier not configured with valid Stripe price ID");
      return res.status(400).json({
        success: false,
        message: `The ${tierConfig.name} plan is not available for direct purchase. Please contact our sales team for custom pricing.`,
        error: "TIER_NOT_CONFIGURED",
        contactEmail: "sales@immigrationai.com"
      });
    }

    try {
      const { getStripeClient } = await import("../lib/subscription");
      const stripe = await getStripeClient();

      if (!stripe) {
        logger.warn({ userId }, "Stripe not configured - cannot create checkout session");
        return res.status(503).json({
          success: false,
          message: "Payment processing is temporarily unavailable. Please try again later or contact support.",
          error: "STRIPE_UNAVAILABLE"
        });
      }

      const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: tierConfig.stripePriceId, quantity: 1 }],
        success_url: `${clientUrl}/subscription?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/subscription`,
        metadata: {
          userId,
          tier: requestedTier // Store tier in metadata for webhook handling
        },
        customer_email: user.email,
      });

      if (!session || !session.url) {
        throw new Error("Failed to create checkout session - no URL returned");
      }

      logger.info({ userId, tier: requestedTier, sessionId: session.id }, "Stripe checkout session created");

      res.json({
        success: true,
        message: "Redirecting to checkout...",
        checkoutUrl: session.url
      });
    } catch (error: any) {
      logger.error({ error: error?.message, stack: error?.stack, userId, tier: requestedTier }, "Subscription upgrade error");

      // Handle "Stripe not configured" gracefully
      if (process.env.NODE_ENV !== "production" && (!process.env.STRIPE_SECRET_KEY)) {
        return res.json({
          success: true,
          message: "Simulated upgrade (Stripe not configured in development)",
          tier: requestedTier,
          fake: true
        });
      }

      // Return specific error messages
      const errorMessage = error?.message || "Unknown error";

      if (errorMessage.includes("No such price")) {
        return res.status(400).json({
          success: false,
          error: "INVALID_PRICE_ID",
          message: "This subscription plan is not properly configured. Please contact support."
        });
      }

      if (errorMessage.includes("Invalid API")) {
        return res.status(503).json({
          success: false,
          error: "STRIPE_CONFIG_ERROR",
          message: "Payment system configuration issue. Please contact support."
        });
      }

      res.status(500).json({
        success: false,
        error: "CHECKOUT_FAILED",
        message: "Failed to initiate checkout. Please try again or contact support if the issue persists."
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
      // Fetch from payments table
      const history = await db.query.payments.findMany({
        where: eq(payments.userId, userId),
        orderBy: [desc(payments.createdAt)],
      });

      res.json(history.map(p => ({
        id: p.id,
        date: p.createdAt,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        description: (p.metadata as any)?.description || (p.amount ? "Service Payment" : "Consultation")
      })));
    } catch (error) {
      logger.error({ error, userId }, "Error fetching billing history");
      res.status(500).json({ message: "Failed to fetch billing history" });
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
      // Find active subscription for user
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, userId),
          or(
            eq(subscriptions.status, "active"),
            eq(subscriptions.status, "trialing")
          )
        ),
        orderBy: [desc(subscriptions.createdAt)],
      });

      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      // If subscription has Stripe ID, cancel via Stripe
      if (subscription.providerSubscriptionId) {
        try {
          const { getStripeClient } = await import("../lib/subscription");
          const stripe = await getStripeClient();
          if (stripe) {
            await stripe.subscriptions.cancel(subscription.providerSubscriptionId);
          }
        } catch (stripeErr) {
          logger.warn({ err: stripeErr, subscriptionId: subscription.providerSubscriptionId }, "Failed to cancel Stripe subscription");
        }
      }

      // Update subscription status to canceled
      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, subscription.id));

      res.json({
        success: true,
        message: "Subscription cancelled successfully",
      });
    } catch (error) {
      logger.error({ error, userId }, "Error cancelling subscription");
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  })
);

export default router;
