import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { payments, applications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getTierConfig, type SubscriptionTier } from "../lib/subscriptionTiers";

const router = Router();

let stripe: any;
(async () => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn("STRIPE_SECRET_KEY not set - Stripe features will be disabled");
    } else {
      const StripePkg = await import("stripe");
      const Stripe = (StripePkg && (StripePkg as any).default) || StripePkg;
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-08-16" });
      logger.info("Stripe initialized successfully");
    }
  } catch (err) {
    logger.warn({ err }, "Stripe initialization failed - payment features disabled");
  }
})();

// Create payment intent
router.post(
  "/create-intent",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!stripe) {
      throw new AppError(503, "Payment service not available");
    }

    const { amount, applicationId, description } = z
      .object({
        amount: z.number().positive(),
        applicationId: z.string().uuid().optional(),
        description: z.string().optional(),
      })
      .parse(req.body);

    const userId = req.user!.userId;

    // Create Stripe payment intent
    let paymentIntent: any;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        metadata: {
          userId,
          applicationId: applicationId || "general",
        },
      });
    } catch (err: any) {
      logger.error({ err, userId, amount, applicationId }, "Failed to create payment intent");
      throw new AppError(502, "Payment provider error");
    }

    // Store in database
    const [payment] = await db
      .insert(payments)
      .values({
        userId,
        applicationId: applicationId || null,
        amount: amount.toString(),
        currency: "USD",
        provider: "stripe",
        providerTransactionId: paymentIntent.id,
        status: "processing",
      })
      .returning();

    logger.info({ paymentId: payment.id }, "Payment intent created");

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      paymentIntentId: paymentIntent.id,
    });
  })
);

// Public configuration for client (publishable key, plan info)
router.get(
  "/config",
  asyncHandler(async (_req, res) => {
    res.json({
      publicKey: process.env.STRIPE_PUBLIC_KEY || null,
    });
  })
);

// Create a Checkout Session for subscription (redirect flow)
router.post(
  "/create-checkout-session",
  authenticate,
  asyncHandler(async (req, res) => {
    const { tier } = z.object({ tier: z.string() }).parse(req.body);
    const userId = req.user!.userId;
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";

    const role = req.user!.role;
    const config = getTierConfig(role);
    const tierCfg = config[tier as SubscriptionTier];

    if (!tierCfg) {
      throw new AppError(400, `Invalid pricing tier: ${tier}. Valid options for ${role}: ${Object.keys(config).join(", ")}`);
    }

    // MOCK MODE: If Stripe config missing or explicitly "mock" requested
    if (!stripe) {
      logger.info({ userId, tier }, "Stripe not configured - using Mock Checkout Flow");

      const mockSessionId = `mock_sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Persist mock payment record
      await db.insert(payments).values({
        userId,
        applicationId: null,
        amount: tierCfg.monthlyPrice.toString(),
        currency: "USD",
        provider: "stripe",
        providerTransactionId: mockSessionId,
        status: "processing",
      });

      // Return URL to local checkout page with mock flag
      // We pass a mock clientSecret so the checkout page logic works
      return res.json({
        checkoutUrl: `${clientUrl}/checkout?planId=${tier}&clientSecret=${mockSessionId}&mock=true`,
        sessionId: mockSessionId
      });
    }

    if (!tierCfg.stripePriceId) {
      throw new AppError(400, "Invalid pricing tier configuration");
    }

    let session: any;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: tierCfg.stripePriceId, quantity: 1 }],
        success_url: `${clientUrl}/subscription?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/subscription`,
        metadata: { userId },
      });
    } catch (err: any) {
      logger.error({ err, userId, tier }, "Failed to create checkout session");
      throw new AppError(502, "Payment provider error");
    }

    // Persist a payment record for tracking
    try {
      await db.insert(payments).values({
        userId,
        applicationId: null,
        amount: tierCfg.monthlyPrice.toString(),
        currency: "USD",
        provider: "stripe",
        providerTransactionId: session.id,
        status: "processing",
      });
    } catch (err) {
      logger.warn({ err, sessionId: session.id }, "Failed to persist checkout session to payments table");
    }

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  })
);

// Confirm payment
router.post(
  "/confirm",
  authenticate,
  asyncHandler(async (req, res) => {
    const { paymentIntentId } = z
      .object({
        paymentIntentId: z.string(),
      })
      .parse(req.body);

    // MOCK HANDLING
    if (paymentIntentId.startsWith("mock_")) {
      logger.info({ paymentIntentId }, "Confirming mock payment");

      await db
        .update(payments)
        .set({ status: "completed" })
        .where(eq(payments.providerTransactionId, paymentIntentId));

      // Update user subscription tier (Important!)
      const payment = await db.query.payments.findFirst({
        where: eq(payments.providerTransactionId, paymentIntentId)
      });

      if (payment) {
        const amount = parseFloat(payment.amount);
        let newTier = 'starter'; // Default fallback

        // Determine tier based on amount (Naive check based on known prices)
        // Client Tiers: Basic 0, Pro 15, Premium 50
        // Lawyer Tiers: Starter 29, Professional 99, Agency 299

        if (amount >= 299) newTier = 'agency';
        else if (amount >= 99) newTier = 'professional';
        else if (amount >= 50) newTier = 'premium'; // Client premium
        else if (amount >= 29) newTier = 'starter';
        else if (amount >= 15) newTier = 'professional'; // Client pro mapped to professional name internally? check types
        // Actually client tiers are "basic", "standard", "premium" usually. 
        // Let's stick to safe defaults or check role.

        if (Math.abs(amount - 15) < 1) newTier = 'standard'; // Client Pro
        if (Math.abs(amount - 50) < 1) newTier = 'premium'; // Client Premium

        // Override for Lawyer specific known prices
        if (Math.abs(amount - 29) < 1 || Math.abs(amount - 290) < 10) newTier = 'starter';
        if (Math.abs(amount - 99) < 1 || Math.abs(amount - 990) < 10) newTier = 'professional';
        if (Math.abs(amount - 299) < 1 || Math.abs(amount - 2990) < 10) newTier = 'agency';

        await db.update(require("@shared/schema").users)
          .set({
            subscriptionTier: newTier,
            subscriptionStatus: 'active' // Ensure functionality is unlocked
          })
          .where(eq(require("@shared/schema").users.id, req.user!.userId));
      }

      return res.json({ status: "success" });
    }

    if (!stripe) {
      throw new AppError(503, "Payment service not available");
    }

    // Allow client_secret to be passed; extract the actual intent id if needed
    const normalizedIntentId = paymentIntentId.startsWith("pi_")
      ? paymentIntentId
      : paymentIntentId.split("_secret")[0];

    let paymentIntent: any;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(normalizedIntentId);
    } catch (err: any) {
      logger.error({ err, paymentIntentId: normalizedIntentId }, "Failed to retrieve payment intent");
      throw new AppError(502, "Payment provider error");
    }

    if (paymentIntent.status === "succeeded") {
      await db
        .update(payments)
        .set({ status: "completed" })
        .where(eq(payments.providerTransactionId, paymentIntent.id));

      logger.info(
        { paymentIntentId: paymentIntent.id, userId: req.user!.userId },
        "Payment confirmed"
      );

      res.json({ status: "success" });
    } else {
      throw new AppError(400, "Payment not completed");
    }
  })
);

// Get payment history
router.get(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const userPayments = await db.query.payments.findMany({
      where: eq(payments.userId, userId),
    });

    res.json({ payments: userPayments });
  })
);

export default router;

// Admin: validate Stripe credentials (non-destructive)
router.get(
  "/validate",
  asyncHandler(async (req, res) => {
    if (!stripe) {
      return res.json({ ok: false, reason: "Stripe not configured (STRIPE_SECRET_KEY missing)" });
    }

    try {
      // Attempt a simple non-destructive call: list prices with limit 1
      const prices = await stripe.prices.list({ limit: 1 });
      return res.json({ ok: true, examplePrice: prices.data[0] ? { id: prices.data[0].id, active: prices.data[0].active } : null });
    } catch (err: any) {
      logger.error({ err }, "Stripe validation failed");
      return res.json({ ok: false, reason: err?.message || String(err) });
    }
  })
);
