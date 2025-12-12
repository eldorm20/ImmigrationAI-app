import { logger } from "./logger";
import { sendNotification } from "./notifications";

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      object: string;
      amount?: number;
      currency?: string;
      status?: string;
      customer?: string;
      subscription?: string;
      [key: string]: unknown;
    };
  };
}

export interface PaymentRecord {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  stripeId: string;
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Subscription {
  subscriptionId: string;
  userId: string;
  planId: string;
  status: "active" | "cancelled" | "suspended";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId: string;
  metadata?: Record<string, unknown>;
}

// Store payment records (in production, use database)
const payments: Map<string, PaymentRecord> = new Map();
const subscriptions: Map<string, Subscription> = new Map();

// Handle Stripe webhook events
export async function handleStripeWebhook(event: StripeWebhookEvent): Promise<void> {
  try {
    logger.info({ eventType: event.type }, "Processing Stripe webhook");

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(event.data.object);
        break;

      case "charge.refunded":
        await handleRefund(event.data.object);
        break;

      default:
        logger.info({ eventType: event.type }, "Unhandled webhook event");
    }
  } catch (error) {
    logger.error({ error, eventId: event.id }, "Failed to handle webhook");
    throw error;
  }
}

// Handle payment succeeded
async function handlePaymentSucceeded(paymentObject: Record<string, unknown>): Promise<void> {
  const stripeId = String(paymentObject.id);
  const customerId = String(paymentObject.customer || "");
  const amount = Number(paymentObject.amount || 0) / 100; // Convert cents to dollars
  const currency = String(paymentObject.currency || "usd").toUpperCase();

  // TODO: Link customer to userId from Stripe customer metadata
  const userId = customerId;

  const payment: PaymentRecord = {
    paymentId: `pay_${Date.now()}`,
    userId,
    amount,
    currency,
    status: "completed",
    stripeId,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: paymentObject as Record<string, unknown>,
  };

  payments.set(payment.paymentId, payment);

  // Send notification to user
  await sendNotification({
    userId,
    type: "payment_confirmed",
    subject: `Payment of ${currency} ${amount.toFixed(2)} confirmed`,
    message: `Your payment has been successfully processed. Thank you!`,
    data: { paymentId: payment.paymentId, amount, currency },
  });

  logger.info({ userId, amount, currency }, "Payment succeeded");
}

// Handle payment failed
async function handlePaymentFailed(paymentObject: Record<string, unknown>): Promise<void> {
  const stripeId = String(paymentObject.id);
  const customerId = String(paymentObject.customer || "");
  const amount = Number(paymentObject.amount || 0) / 100;
  const currency = String(paymentObject.currency || "usd").toUpperCase();

  const userId = customerId;

  const payment: PaymentRecord = {
    paymentId: `pay_${Date.now()}`,
    userId,
    amount,
    currency,
    status: "failed",
    stripeId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  payments.set(payment.paymentId, payment);

  // Send notification to user
  await sendNotification({
    userId,
    type: "payment_failed",
    subject: "Payment Failed",
    message: "Your payment could not be processed. Please try again or contact support.",
    data: { paymentId: payment.paymentId, amount, currency },
  });

  logger.warn({ userId, amount }, "Payment failed");
}

// Handle subscription created
async function handleSubscriptionCreated(subscriptionObject: Record<string, unknown>): Promise<void> {
  const stripeSubscriptionId = String(subscriptionObject.id);
  const customerId = String(subscriptionObject.customer || "");
  const planId = String(subscriptionObject.items?.data?.[0]?.price?.product || "");

  const subscription: Subscription = {
    subscriptionId: `sub_${Date.now()}`,
    userId: customerId,
    planId,
    status: "active",
    currentPeriodStart: new Date(Number(subscriptionObject.current_period_start) * 1000),
    currentPeriodEnd: new Date(Number(subscriptionObject.current_period_end) * 1000),
    stripeSubscriptionId,
  };

  subscriptions.set(subscription.subscriptionId, subscription);

  // Send notification
  await sendNotification({
    userId: customerId,
    type: "subscription_created",
    subject: "Subscription Activated",
    message: "Your subscription has been successfully activated!",
    data: { subscriptionId: subscription.subscriptionId, planId },
  });

  logger.info({ userId: customerId, planId }, "Subscription created");
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscriptionObject: Record<string, unknown>): Promise<void> {
  const stripeSubscriptionId = String(subscriptionObject.id);
  const customerId = String(subscriptionObject.customer || "");

  // Find existing subscription
  let subscription: Subscription | undefined;
  for (const sub of subscriptions.values()) {
    if (sub.stripeSubscriptionId === stripeSubscriptionId) {
      subscription = sub;
      break;
    }
  }

  if (subscription) {
    subscription.currentPeriodStart = new Date(Number(subscriptionObject.current_period_start) * 1000);
    subscription.currentPeriodEnd = new Date(Number(subscriptionObject.current_period_end) * 1000);

    await sendNotification({
      userId: customerId,
      type: "subscription_updated",
      subject: "Subscription Updated",
      message: "Your subscription details have been updated.",
      data: { subscriptionId: subscription.subscriptionId },
    });

    logger.info({ userId: customerId }, "Subscription updated");
  }
}

// Handle subscription cancelled
async function handleSubscriptionCancelled(subscriptionObject: Record<string, unknown>): Promise<void> {
  const stripeSubscriptionId = String(subscriptionObject.id);
  const customerId = String(subscriptionObject.customer || "");

  // Find and update subscription
  for (const sub of subscriptions.values()) {
    if (sub.stripeSubscriptionId === stripeSubscriptionId) {
      sub.status = "cancelled";

      await sendNotification({
        userId: customerId,
        type: "subscription_cancelled",
        subject: "Subscription Cancelled",
        message: "Your subscription has been cancelled. You can reactivate it anytime.",
        data: { subscriptionId: sub.subscriptionId },
      });

      logger.info({ userId: customerId }, "Subscription cancelled");
      break;
    }
  }
}

// Handle refund
async function handleRefund(chargeObject: Record<string, unknown>): Promise<void> {
  const chargeId = String(chargeObject.id);
  const customerId = String(chargeObject.customer || "");
  const amount = Number(chargeObject.amount_refunded || 0) / 100;
  const currency = String(chargeObject.currency || "usd").toUpperCase();

  // Find and update payment
  for (const payment of payments.values()) {
    if (payment.stripeId === chargeId) {
      payment.status = "refunded";
      payment.updatedAt = new Date();

      await sendNotification({
        userId: customerId,
        type: "refund_processed",
        subject: `Refund of ${currency} ${amount.toFixed(2)} Processed`,
        message: "Your refund has been processed and will appear in your account within 3-5 business days.",
        data: { paymentId: payment.paymentId, amount, currency },
      });

      logger.info({ customerId, amount, currency }, "Refund processed");
      break;
    }
  }
}

// Get payment by ID
export function getPayment(paymentId: string): PaymentRecord | null {
  return payments.get(paymentId) || null;
}

// Get subscription by ID
export function getSubscription(subscriptionId: string): Subscription | null {
  return subscriptions.get(subscriptionId) || null;
}

// Get user payments
export function getUserPayments(userId: string): PaymentRecord[] {
  return Array.from(payments.values()).filter((p) => p.userId === userId);
}

// Get user subscriptions
export function getUserSubscriptions(userId: string): Subscription[] {
  return Array.from(subscriptions.values()).filter((s) => s.userId === userId);
}

// Get active subscription for user
export function getActiveSubscription(userId: string): Subscription | null {
  const subs = getUserSubscriptions(userId);
  return subs.find((s) => s.status === "active") || null;
}

// Calculate revenue statistics
export function getRevenueStats(
  startDate?: Date,
  endDate?: Date
): {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  totalRefunded: number;
  activeSubscriptions: number;
} {
  const start = startDate || new Date(0);
  const end = endDate || new Date();

  let totalRevenue = 0;
  let successfulPayments = 0;
  let failedPayments = 0;
  let totalRefunded = 0;

  for (const payment of payments.values()) {
    if (payment.createdAt >= start && payment.createdAt <= end) {
      if (payment.status === "completed") {
        totalRevenue += payment.amount;
        successfulPayments++;
      } else if (payment.status === "failed") {
        failedPayments++;
      } else if (payment.status === "refunded") {
        totalRefunded += payment.amount;
      }
    }
  }

  const activeSubscriptions = Array.from(subscriptions.values()).filter(
    (s) => s.status === "active"
  ).length;

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    successfulPayments,
    failedPayments,
    totalRefunded: Number(totalRefunded.toFixed(2)),
    activeSubscriptions,
  };
}
