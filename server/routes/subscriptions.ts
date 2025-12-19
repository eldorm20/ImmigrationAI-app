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
import { users, subscriptions } from "@shared/schema";
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
<<<<<<< HEAD
    const { tier, planId, companyId } = req.body;
=======
    const { tier, planId } = req.body;
>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c

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

<<<<<<< HEAD
    // For paid tiers, create Stripe subscription using Checkout Flow
=======
    // For paid tiers, use Stripe Checkout Session to collect payment details
>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c
    const user = req.user!;
    const tierConfig = TIER_CONFIGURATIONS[requestedTier as SubscriptionTier];

    try {
<<<<<<< HEAD
      // Import dynamically to avoid circular dependency issues if any
      const { createCheckoutSession } = await import("../lib/subscription");

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      // If company upgrade, verify ownership
      if (companyId) {
        const company = await db.query.companies.findFirst({
          where: eq(require("@shared/schema").companies.id, companyId)
        });
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }
        if (company.userId !== userId) {
          return res.status(403).json({ message: "Only the company owner can upgrade the subscription" });
        }
      }

      const checkoutUrl = await createCheckoutSession(
        userId,
        tierConfig.stripePriceId,
        user.email,
        `${baseUrl}/dashboard?payment=success&tier=${requestedTier}${companyId ? '&companyId=' + companyId : ''}`,
        `${baseUrl}/subscription?payment=cancelled`,
        companyId
      );

      if (!checkoutUrl) {
=======
      const { getStripeClient } = await import("../lib/subscription");
      const stripe = await getStripeClient();

      if (!stripe) {
>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c
        return res.status(503).json({
          success: false,
          message: "Stripe integration is not available or failed. Please contact support.",
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
        throw new Error("Failed to create checkout session");
      }

      res.json({
        success: true,
<<<<<<< HEAD
        message: `Redirecting to checkout for ${tierConfig.name}`,
        checkoutUrl,
      });
    } catch (error) {
      logger.error({ error, userId }, "Subscription upgrade error");
      // ... error handling
=======
        message: "Redirecting to checkout...",
        checkoutUrl: session.url
      });
    } catch (error) {
      logger.error({ error, userId }, "Subscription upgrade error");
      // Handle "Stripe not configured" gracefully
      if (process.env.NODE_ENV !== "production" && (!process.env.STRIPE_SECRET_KEY)) {
        return res.json({
          success: true,
          message: "Simulated upgrade (Stripe not configured)",
          tier: requestedTier,
          fake: true
        })
      }

>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c
      res.status(500).json({
        success: false,
        error: "Failed to initiate checkout"
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
      const billingHistory: any[] = [];

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
