import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

// We'll mock the DB module before importing the webhook router
const mockFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../db", () => ({
  db: {
    query: {
      subscriptions: { findFirst: mockFindFirst },
      users: { findFirst: vi.fn(async () => ({ id: "user_1", metadata: {} })) },
    },
    insert: (table: any) => ({ values: async (obj: any) => mockInsert(obj) }),
    update: (table: any) => ({ set: (obj: any) => ({ where: async (...args: any[]) => mockUpdate(obj) }) }),
  },
}));

// Mock stripe package to provide webhooks.constructEvent
vi.mock("stripe", () => {
  return {
    default: class StripeMock {
      webhooks = {
        constructEvent: (raw: Buffer, sig: string, secret: string) => {
          // For tests we simply parse raw body and return it as event
          try {
            const parsed = JSON.parse(raw.toString());
            return parsed;
          } catch (e) {
            throw new Error("Invalid payload");
          }
        },
      };
    },
  };
});

describe("Webhook Handler", () => {
  let app: express.Express;
  beforeEach(async () => {
    mockFindFirst.mockReset();
    mockInsert.mockReset();
    mockUpdate.mockReset();

    // Import the router after mocks are set up
    const { default: webhookRouter } = await import("../routes/webhooks");

    app = express();
    app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
    app.use("/api/webhooks", webhookRouter);
  });

  it("handles customer.subscription.created and persists subscription", async () => {
    const event = {
      id: "evt_1",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          metadata: { userId: "user_1" },
          status: "active",
          items: { data: [ { price: { id: "price_pro" } } ] },
          current_period_end: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    };

    mockFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/webhooks/webhook")
      .set("stripe-signature", "t=1,v1=abc")
      .send(event)
      .expect(200);

    expect(res.body).toEqual({ received: true });
    expect(mockInsert).toHaveBeenCalled();
  });

  it("handles subscription.updated and updates existing record", async () => {
    const event = {
      id: "evt_2",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          metadata: { userId: "user_1" },
          status: "past_due",
          items: { data: [ { price: { id: "price_pro" } } ] },
          current_period_end: Math.floor(Date.now() / 1000) + 7200,
        },
      },
    };

    mockFindFirst.mockResolvedValue({ id: "subs_row_1", providerSubscriptionId: "sub_123", lastEventId: null });

    const res = await request(app)
      .post("/api/webhooks/webhook")
      .set("stripe-signature", "t=1,v1=abc")
      .send(event)
      .expect(200);

    expect(res.body).toEqual({ received: true });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("is idempotent: duplicate events with same id are skipped", async () => {
    const event = {
      id: "evt_dup",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_999",
          metadata: { userId: "user_1" },
          status: "active",
          items: { data: [ { price: { id: "price_pro" } } ] },
          current_period_end: Math.floor(Date.now() / 1000) + 7200,
        },
      },
    };

    mockFindFirst.mockResolvedValue({ id: "subs_row_2", providerSubscriptionId: "sub_999", lastEventId: "evt_dup" });

    const res = await request(app)
      .post("/api/webhooks/webhook")
      .set("stripe-signature", "t=1,v1=abc")
      .send(event)
      .expect(200);

    expect(res.body).toEqual({ received: true });
    // Because lastEventId matches, no update/insert should be attempted
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
