import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock authentication middleware to inject a test user
vi.mock("../middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "user_ai1", role: "applicant" };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  optionalAuth: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock agentsManager used by ai.lib
vi.mock("../lib/agents", () => ({
  agentsManager: {
    processRequest: vi.fn(async (_agent: string, _method: string, _args: any[]) => ({ success: true, data: "Hello from AI" })),
  },
}));

describe("AI Routes", () => {
  let app: express.Express;

  beforeEach(async () => {
    const { default: aiRouter } = await import("../routes/ai");
    app = express();
    app.use(express.json());
    app.use("/api/ai", aiRouter);
  });

  it("chat endpoint returns AI reply when provider available", async () => {
    const res = await request(app).post("/api/ai/chat").send({ message: "Hello" }).expect(200);
    expect(res.body).toHaveProperty("reply");
    expect(res.body.reply).toEqual("Hello from AI");
  });
});
