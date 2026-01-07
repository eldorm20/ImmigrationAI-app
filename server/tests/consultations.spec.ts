import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock authentication middleware to inject a test user
vi.mock("../middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "user_app1", role: "applicant" };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  optionalAuth: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock DB
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockInsert = vi.fn();
vi.mock("../db", () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirst, findMany: mockFindMany },
      consultations: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: (table: any) => ({ values: async (obj: any) => mockInsert(obj) }),
  },
}));

describe("Consultations Routes", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
    mockInsert.mockReset();

    const { default: consultationsRouter } = await import("../routes/consultations");

    app = express();
    app.use(express.json());
    app.use("/api/consultations", consultationsRouter);
  });

  it("returns available lawyers", async () => {
    mockFindMany.mockResolvedValue([
      { id: "law1", firstName: "Anna", lastName: "Smith", email: "anna@example.com" },
      { id: "law2", firstName: "Bob", lastName: "Lee", email: "bob@example.com" },
    ]);

    const res = await request(app).get("/api/consultations/available/lawyers").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].id).toBe("law1");
  });

  it("returns empty array when lawyers lookup fails", async () => {
    // Simulate DB failure for users.findMany
    mockFindMany.mockRejectedValueOnce(new Error("DB failure"));

    const res = await request(app).get("/api/consultations/available/lawyers").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it("allows applicant to create consultation and queues emails (DB insert)", async () => {
    // Mock lawyer exists and applicant exists
    mockFindFirst.mockResolvedValueOnce({ id: "law1", email: "anna@example.com", firstName: "Anna" }); // lawyer lookup
    mockFindFirst.mockResolvedValueOnce({ id: "user_app1", email: "app@example.com", firstName: "App" }); // applicant lookup

    mockInsert.mockResolvedValue({ id: "consult_1", lawyerId: "law1", userId: "user_app1", scheduledTime: new Date().toISOString(), duration: 60, status: "scheduled" });

    const payload = { lawyerId: "law1", scheduledTime: new Date().toISOString(), duration: 60, notes: "Test" };

    const res = await request(app).post("/api/consultations").send(payload).expect(201);
    expect(res.body).toHaveProperty("id");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns 500 when creating consultation fails", async () => {
    // Mock lawyer exists and applicant exists
    mockFindFirst.mockResolvedValueOnce({ id: "law1", email: "anna@example.com", firstName: "Anna" }); // lawyer lookup
    mockFindFirst.mockResolvedValueOnce({ id: "user_app1", email: "app@example.com", firstName: "App" }); // applicant lookup

    mockInsert.mockRejectedValueOnce(new Error("DB insert failed"));

    const payload = { lawyerId: "law1", scheduledTime: new Date().toISOString(), duration: 60, notes: "Test" };

    await request(app).post("/api/consultations").send(payload).expect(500);
  });

  it("returns empty array when fetching consultations fails", async () => {
    // Make consultations.findMany throw
    const dbModule = await import("../db");
    dbModule.db.query.consultations.findMany = vi.fn().mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app).get("/api/consultations").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});
