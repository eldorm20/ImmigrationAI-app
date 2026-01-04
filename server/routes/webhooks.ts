import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, payments, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { enqueueJob } from "../lib/queue";
import { generatePaymentConfirmationEmail } from "../lib/email";
import type Stripe from "stripe";

const router = Router();

let stripe: any;
const initializeStripe = async () => {
  if (stripe) return;
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn("STRIPE_SECRET_KEY missing - webhooks disabled");
    return;
  }
  try {
    const StripePkg = await import("stripe");
    const Stripe = (StripePkg && (StripePkg as any).default) || StripePkg;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-08-16" });
  } catch (err) {
    logger.warn({ err }, "Stripe SDK failed to initialize for webhooks");
  }
};

// Stripe webhook endpoint (raw body, not JSON parsed)
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    await initializeStripe();
    if (!stripe) {
      logger.warn("Received webhook but Stripe is not configured");
      return res.status(400).json({ error: "Stripe not configured for webhooks" });
    }

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    let event: any;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      logger.error({ error: err?.message || err }, "Webhook signature verification failed");
      return res.status(400).json({ error: `Webhook Error: ${err?.message || String(err)}` });
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
              await enqueueJob(user.id, "email", {
                to: user.email,
                subject: "Payment Confirmation - ImmigrationAI",
                html: generatePaymentConfirmationEmail(
                  "Application Fee",
                  `$${(paymentIntent.amount / 100).toFixed(2)}`,
                  new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
                ),
              });

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

          if (!subscription.id) break;

          // Idempotency: if we've already processed this event for this subscription, skip
          const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.providerSubscriptionId, subscription.id) });
          if (existing && existing.lastEventId === event.id) {
            logger.info({ subscriptionId: subscription.id, eventId: event.id }, "Duplicate subscription.created event - skipping");
            break;
          }

          if (userId) {
            // Upsert into subscriptions table
            try {
              if (existing) {
                await db
                  .update(subscriptions)
                  .set({
                    status: subscription.status as any,
                    planId: subscription.items?.data?.[0]?.price?.id || null,
                    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                    metadata: JSON.parse(JSON.stringify(subscription as any)),
                    lastEventId: event.id,
                    updatedAt: new Date(),
                  } as any)
                  .where(eq(subscriptions.id, existing.id));
              } else {
                await db.insert(subscriptions).values({
                  userId,
                  provider: 'stripe',
                  providerSubscriptionId: subscription.id,
                  planId: subscription.items?.data?.[0]?.price?.id || null,
                  status: subscription.status as any,
                  currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                  metadata: JSON.parse(JSON.stringify(subscription as any)),
                  lastEventId: event.id,
                });
              }
            } catch (err) {
              logger.error({ err, subscriptionId: subscription.id }, "Failed to upsert subscription record");
            }

            // Also keep user metadata in sync
            try {
              const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
              const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

              await db
                .update(users)
                .set({
                  metadata: JSON.parse(JSON.stringify({
                    ...existingMetadata,
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: subscription.status,
                    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
                  })),
                } as any)
                .where(eq(users.id, userId));
            } catch (err) {
              logger.warn({ err, subscriptionId: subscription.id }, "Failed to update user metadata for subscription");
            }

            logger.info({ userId, subscriptionId: subscription.id }, "Subscription created and persisted");
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const { userId } = subscription.metadata || {};

          if (!subscription.id) break;

          // Idempotency check
          const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.providerSubscriptionId, subscription.id) });
          if (existing && existing.lastEventId === event.id) {
            logger.info({ subscriptionId: subscription.id, eventId: event.id }, "Duplicate subscription.updated event - skipping");
            break;
          }

          try {
            if (existing) {
              await db
                .update(subscriptions)
                .set({
                  status: subscription.status as any,
                  planId: subscription.items?.data?.[0]?.price?.id || existing.planId,
                  currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : existing.currentPeriodEnd,
                  metadata: JSON.parse(JSON.stringify(subscription as any)),
                  lastEventId: event.id,
                  updatedAt: new Date(),
                } as any)
                .where(eq(subscriptions.id, existing.id));
            } else if (userId) {
              await db.insert(subscriptions).values({
                userId,
                provider: 'stripe',
                providerSubscriptionId: subscription.id,
                planId: subscription.items?.data?.[0]?.price?.id || null,
                status: subscription.status as any,
                currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                metadata: JSON.parse(JSON.stringify(subscription as any)),
                lastEventId: event.id,
              });
            }
          } catch (err) {
            logger.error({ err, subscriptionId: subscription.id }, "Failed to upsert subscription on update");
          }

          // Mirror to user metadata if userId is present
          if (userId) {
            try {
              const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
              const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

              await db
                .update(users)
                .set({
                  metadata: JSON.parse(JSON.stringify({
                    ...existingMetadata,
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: subscription.status,
                    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
                  })),
                } as any)
                .where(eq(users.id, userId));
            } catch (err) {
              logger.warn({ err, subscriptionId: subscription.id }, "Failed to update user metadata on subscription update");
            }
          }

          logger.info({ subscriptionId: subscription.id }, "Subscription updated and persisted");
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const { userId } = subscription.metadata || {};

          if (!subscription.id) break;

          const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.providerSubscriptionId, subscription.id) });
          if (existing && existing.lastEventId === event.id) {
            logger.info({ subscriptionId: subscription.id, eventId: event.id }, "Duplicate subscription.deleted event - skipping");
            break;
          }

          try {
            if (existing) {
              await db
                .update(subscriptions)
                .set({
                  status: 'canceled',
                  metadata: JSON.parse(JSON.stringify(subscription as any)),
                  lastEventId: event.id,
                  updatedAt: new Date(),
                } as any)
                .where(eq(subscriptions.id, existing.id));
            }
          } catch (err) {
            logger.error({ err, subscriptionId: subscription.id }, "Failed to update subscription record on delete");
          }

          if (userId) {
            try {
              const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
              const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

              await db
                .update(users)
                .set({
                  metadata: JSON.parse(JSON.stringify({
                    ...existingMetadata,
                    stripeSubscriptionId: null,
                    subscriptionStatus: 'cancelled',
                  })),
                } as any)
                .where(eq(users.id, userId));
            } catch (err) {
              logger.warn({ err, subscriptionId: subscription.id }, "Failed to update user metadata on subscription delete");
            }
          }

          logger.info({ subscriptionId: subscription.id }, "Subscription deleted and persisted");
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
