import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import type Stripe from "stripe";

let stripe: any | null = null;

async function getStripe() {
  if (stripe) return stripe;

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const StripePkg = await import("stripe");
      const Stripe = (StripePkg && (StripePkg as any).default) || StripePkg;
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-08-16" });
      return stripe;
    } catch (err) {
      // leave stripe null and return null - caller will handle missing Stripe
      stripe = null;
      logger.error({ err }, "Failed to initialize Stripe client");
      return null;
    }
  }

  // No STRIPE_SECRET_KEY set - do not use a mock in production. Return null
  // so callers can respond with 503/service unavailable and avoid false
  // production behavior. Requiring STRIPE_SECRET_KEY keeps behavior explicit.
  logger.warn("STRIPE_SECRET_KEY not configured; Stripe integration unavailable");
  return null;
}

// Exported helper to check Stripe availability from other modules (startup probe)
export async function isStripeAvailable(): Promise<boolean> {
  try {
    const s = await getStripe();
    return !!s;
  } catch (err) {
    return false;
  }
}

// Export Stripe client getter for use in other modules
export async function getStripeClient() {
  return await getStripe();
}

export interface UserSubscription {
  subscriptionId: string;
  status: "active" | "past_due" | "cancelled" | "unpaid";
  currentPeriodEnd: Date;
  planId: string;
}

export async function createSubscription(
  userId: string,
  planId: string,
  email: string
): Promise<Stripe.Subscription | null> {
  try {
    const stripeClient = await getStripe();
    if (!stripeClient) {
      logger.warn("Stripe key not configured or stripe client unavailable");
      throw new Error("Stripe client not available");
    }

    // First, ensure customer exists or create one
    let customer: Stripe.Customer;
    const userInDb = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const existingMetadata = userInDb?.metadata && typeof userInDb.metadata === 'object' ? (userInDb.metadata as any) : {};
    const stripeCustomerId = existingMetadata?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create new customer
      try {
        customer = await stripe.customers.create({
          email,
          metadata: { userId },
        });
      } catch (err) {
        logger.error({ err, userId, email }, "Failed to create Stripe customer");
        throw err;
      }

      // Update user with customer ID
      try {
        await db
          .update(users)
          .set({
            metadata: JSON.parse(JSON.stringify({ ...existingMetadata, stripeCustomerId: customer.id })),
          } as any)
          .where(eq(users.id, userId));
      } catch (err) {
        logger.error({ err, userId, customerId: customer.id }, "Failed to persist stripeCustomerId to user metadata");
        // Proceed — customer exists in Stripe even if DB update failed
      }
    } else {
      try {
        const retrieved = await stripe.customers.retrieve(stripeCustomerId as string);
        if ((retrieved as any).deleted) {
          logger.warn({ stripeCustomerId, userId }, "Stripe customer was deleted; creating new customer");
          customer = await stripe.customers.create({ email, metadata: { userId } });
        } else {
          customer = retrieved as Stripe.Customer;
        }
      } catch (err) {
        logger.error({ err, stripeCustomerId, userId }, "Failed to retrieve existing Stripe customer, attempting to create new one");
        customer = await stripe.customers.create({ email, metadata: { userId } });
      }
    }

    // Create subscription
    let subscription: Stripe.Subscription;
    try {
      subscription = await stripeClient.subscriptions.create({
        customer: customer.id,
        items: [{ price: planId }],
        metadata: { userId, planId },
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });
    } catch (err) {
      logger.error({ err, userId, planId, customerId: customer.id }, "Failed to create Stripe subscription");
      throw err;
    }

    // Persist subscription ID to user metadata
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user) {
        const currentMetadata = user.metadata && typeof user.metadata === "object" ? (user.metadata as any) : {};
        await db
          .update(users)
          .set({
            metadata: JSON.parse(
              JSON.stringify({
                ...currentMetadata,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customer.id,
              })
            ),
          } as any)
          .where(eq(users.id, userId));
      }
    } catch (err) {
      logger.error({ err, userId, subscriptionId: subscription.id }, "Failed to persist subscription ID to user metadata");
      // Non-fatal; proceed — subscription exists in Stripe even if metadata update failed
    }

    logger.info({ userId, subscriptionId: subscription.id }, "Stripe subscription created");

    return subscription;
  } catch (error) {
    logger.error({ error, userId, planId }, "Failed to create subscription");
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const stripeClient = await getStripe();
    if (!stripeClient) return false;

    await stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info({ subscriptionId }, "Subscription cancelled at period end");
    return true;
  } catch (error) {
    logger.error({ error, subscriptionId }, "Failed to cancel subscription");
    return false;
  }
}

export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<UserSubscription | null> {
  try {
    const stripeClient = await getStripe();
    if (!stripeClient) return null;

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as any);

    return {
      subscriptionId: subscription.id,
      status: subscription.status as any,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      planId: subscription.items.data[0]?.price.id || "",
    };
  } catch (error) {
    logger.error({ error, subscriptionId }, "Failed to get subscription status");
    return null;
  }
}

export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string
): Promise<boolean> {
  try {
    const stripeClient = await getStripe();
    if (!stripeClient) return false;

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as any);
    const currentItem = subscription.items.data[0];

    if (currentItem) {
      await stripeClient.subscriptions.update(subscriptionId, {
        items: [
          {
            id: currentItem.id,
            price: newPlanId,
          },
        ],
      });

      logger.info({ subscriptionId, newPlanId }, "Subscription plan updated");
      return true;
    }

    return false;
  } catch (error) {
    logger.error({ error, subscriptionId, newPlanId }, "Failed to update subscription plan");
    return false;
  }
}

export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  try {
    const stripeClient = await getStripe();
    if (!stripeClient) return [];

    const invoices = await stripeClient.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  } catch (error) {
    logger.error({ error, customerId }, "Failed to get invoices");
    return [];
  }
}
