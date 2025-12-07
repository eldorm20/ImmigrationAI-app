import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "../db";
import { users, payments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { emailQueue } from "../lib/queue";
import { generatePaymentConfirmationEmail } from "../lib/email";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-08-16",
});

// Stripe webhook endpoint (raw body, not JSON parsed)
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      logger.error({ error: err.message }, "Webhook signature verification failed");
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    logger.info({ type: event.type }, "Stripe webhook received");

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const { userId } = paymentIntent.metadata || {};

          if (userId) {
            // Update payment status
            await db
              .update(payments)
              .set({ status: "completed" })
              .where(eq(payments.providerTransactionId, paymentIntent.id));

            // Get user for email
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });

            if (user) {
              // Queue payment confirmation email
              await emailQueue.add(
                {
                  to: user.email,
                  subject: "Payment Confirmation - ImmigrationAI",
                  html: generatePaymentConfirmationEmail(
                    "Application Fee",
                    `$${(paymentIntent.amount / 100).toFixed(2)}`,
                    new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
                  ),
                },
                { jobId: `payment-${paymentIntent.id}` }
              );

              logger.info({ userId, paymentId: paymentIntent.id }, "Payment succeeded");
            }
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const { userId } = paymentIntent.metadata || {};

          if (userId) {
            await db
              .update(payments)
              .set({ status: "failed" })
              .where(eq(payments.providerTransactionId, paymentIntent.id));

            logger.warn({ userId, paymentId: paymentIntent.id }, "Payment failed");
          }
          break;
        }

        case "customer.subscription.created": {
          const subscription = event.data.object as Stripe.Subscription;
          const { userId } = subscription.metadata || {};

          if (userId) {
            // Store subscription in user metadata or new subscriptions table
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

            await db
              .update(users)
              .set({
                metadata: JSON.parse(JSON.stringify({
                  ...existingMetadata,
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                })),
              } as any)
              .where(eq(users.id, userId));

            logger.info({ userId, subscriptionId: subscription.id }, "Subscription created");
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const { userId } = subscription.metadata || {};

          if (userId) {
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

            await db
              .update(users)
              .set({
                metadata: JSON.parse(JSON.stringify({
                  ...existingMetadata,
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                })),
              } as any)
              .where(eq(users.id, userId));

            logger.info({ userId, subscriptionId: subscription.id }, "Subscription updated");
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const { userId } = subscription.metadata || {};

          if (userId) {
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

            await db
              .update(users)
              .set({
                metadata: JSON.parse(JSON.stringify({
                  ...existingMetadata,
                  stripeSubscriptionId: null,
                  subscriptionStatus: "cancelled",
                })),
              } as any)
              .where(eq(users.id, userId));

            logger.info({ userId, subscriptionId: subscription.id }, "Subscription cancelled");
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          logger.info({ invoiceId: invoice.id }, "Invoice payment succeeded");
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          logger.warn({ invoiceId: invoice.id }, "Invoice payment failed");
          break;
        }

        default:
          logger.debug({ type: event.type }, "Unhandled webhook event type");
      }

      res.json({ received: true });
    } catch (error) {
      logger.error({ error }, "Webhook processing error");
      res.status(500).json({ error: "Webhook processing failed" });
    }
  })
);

export default router;
