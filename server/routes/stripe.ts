import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { payments, applications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

let stripe: any;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn("STRIPE_SECRET_KEY not set - Stripe disabled");
  } else {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
} catch (err) {
  logger.warn("Stripe not initialized - payment features disabled");
}

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

    const userId = req.user!.id;

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
    });
  })
);

// Confirm payment
router.post(
  "/confirm",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!stripe) {
      throw new AppError(503, "Payment service not available");
    }

    const { paymentIntentId } = z
      .object({
        paymentIntentId: z.string(),
      })
      .parse(req.body);

    let paymentIntent: any;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err: any) {
      logger.error({ err, paymentIntentId }, "Failed to retrieve payment intent");
      throw new AppError(502, "Payment provider error");
    }

    if (paymentIntent.status === "succeeded") {
      await db
        .update(payments)
        .set({ status: "completed" })
        .where(eq(payments.providerTransactionId, paymentIntentId));

      logger.info(
        { paymentIntentId, userId: req.user!.id },
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
    const userId = req.user!.id;

    const userPayments = await db.query.payments.findMany({
      where: eq(payments.userId, userId),
    });

    res.json({ payments: userPayments });
  })
);

export default router;