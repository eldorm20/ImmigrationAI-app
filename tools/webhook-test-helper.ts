import Stripe from "stripe";
import crypto from "crypto";

/**
 * Webhook Test Helper
 * Simulates Stripe webhook events with valid signatures for local testing.
 * 
 * Usage:
 * import { createSignedWebhookEvent, simulateWebhook } from './webhook-test-helper';
 * 
 * const event = createSignedWebhookEvent('customer.subscription.created', {
 *   id: 'sub_123',
 *   customer: 'cus_123',
 *   status: 'active',
 *   metadata: { userId: 'user-123', planId: 'price_123' },
 * });
 * 
 * // POST event.body to http://localhost:3000/webhooks/webhook
 * // with headers: { 'stripe-signature': event.signature }
 */

export interface SignedWebhookEvent {
  body: string; // JSON stringified event
  signature: string; // stripe-signature header value
  event: Stripe.Event;
}

/**
 * Creates a signed webhook event for testing.
 * Requires STRIPE_WEBHOOK_SECRET environment variable.
 */
export function createSignedWebhookEvent(
  type: string,
  data: Record<string, any>
): SignedWebhookEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET not set. Cannot create signed webhook for testing."
    );
  }

  const event: Stripe.Event = {
    id: `evt_test_${Date.now()}`,
    object: "event",
    api_version: "2023-08-16",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data,
      previous_attributes: {},
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: type as any,
  };

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signed_content = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signed_content)
    .digest("hex");

  return {
    body,
    signature: `t=${timestamp},v1=${signature}`,
    event,
  };
}

/**
 * Simulates a webhook POST request to a local server.
 */
export async function simulateWebhook(
  serverUrl: string,
  type: string,
  data: Record<string, any>
): Promise<Response> {
  const { body, signature } = createSignedWebhookEvent(type, data);

  return fetch(`${serverUrl}/webhooks/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
}

// Example usage in a test/CLI context
if (require.main === module) {
  const [, , action, type, ...args] = process.argv;

  if (action === "test-signature" && type) {
    const data = {
      id: `sub_test_${Date.now()}`,
      customer: "cus_test_local",
      status: "active",
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      metadata: { userId: "test-user-123", planId: "price_professional" },
    };

    try {
      const { signature, body } = createSignedWebhookEvent(type, data);
      console.log("Signed Webhook Event:");
      console.log("Event Type:", type);
      console.log("Body:", body);
      console.log("Signature:", signature);
      console.log("\nCurl command:");
      console.log(
        `curl -X POST http://localhost:3000/webhooks/webhook \\` +
          `\n  -H "Content-Type: application/json" \\` +
          `\n  -H "stripe-signature: ${signature}" \\` +
          `\n  -d '${body.replace(/'/g, "\\'")}'`
      );
    } catch (err) {
      console.error("Error:", (err as Error).message);
      process.exit(1);
    }
  } else {
    console.log(
      "Usage: node webhook-test-helper.ts test-signature <event_type>"
    );
    console.log("\nExample event types:");
    console.log("  customer.subscription.created");
    console.log("  customer.subscription.updated");
    console.log("  customer.subscription.deleted");
    console.log("  payment_intent.succeeded");
    console.log("  payment_intent.payment_failed");
    process.exit(1);
  }
}
