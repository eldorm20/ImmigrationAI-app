import Stripe from "stripe";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-08-16",
});

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
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn("Stripe key not configured");
      throw new Error("Stripe key not configured");
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
      subscription = await stripe.subscriptions.create({
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

    logger.info({ userId, subscriptionId: subscription.id }, "Stripe subscription created");

    return subscription;
  } catch (error) {
    logger.error({ error, userId, planId }, "Failed to create subscription");
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return false;
    }

    await stripe.subscriptions.update(subscriptionId, {
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
    if (!process.env.STRIPE_SECRET_KEY) {
      return null;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

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
    if (!process.env.STRIPE_SECRET_KEY) {
      return false;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];

    if (currentItem) {
      await stripe.subscriptions.update(subscriptionId, {
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
    if (!process.env.STRIPE_SECRET_KEY) {
      return [];
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  } catch (error) {
    logger.error({ error, customerId }, "Failed to get invoices");
    return [];
  }
}
