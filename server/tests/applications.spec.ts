import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks for DB interactions
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("../db", () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirst, findMany: vi.fn(async () => []) },
      applications: { findFirst: vi.fn(async () => null), findMany: mockFindMany },
      payments: { findMany: vi.fn(async () => []) },
    },
    insert: (table: any) => ({ values: async (obj: any) => mockInsert(obj) }),
    update: (table: any) => ({ set: (obj: any) => ({ where: async (...args: any[]) => mockUpdate(obj) }) }),
    delete: (table: any) => ({ where: async (...args: any[]) => mockDelete(args) }),
  },
}));

// Mock middleware/auth to set req.user dynamically in tests
let testUser: any = { userId: "user_1", role: "applicant" };
vi.mock("../middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = testUser;
    return next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

describe("Applications Routes", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
    mockInsert.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();

    const { default: applicationsRouter } = await import("../routes/applications");

    app = express();
    app.use(express.json());
    app.use("/api/applications", applicationsRouter);
  });

  it("creates an application for an authenticated applicant", async () => {
    testUser = { userId: "applicant_1", role: "applicant" };

    // Mock user lookup
    mockFindFirst.mockResolvedValueOnce({ id: "applicant_1", firstName: "John", lastName: "Doe", email: "john@example.com" });

    // Mock insert returning object
    mockInsert.mockResolvedValueOnce([{ id: "app_123", userId: "applicant_1", visaType: "Skilled Worker", country: "CA", fee: "100", status: "new", createdAt: new Date().toISOString() }]);

    const res = await request(app)
      .post("/api/applications")
      .set("authorization", "Bearer token")
      .send({ visaType: "Skilled Worker", country: "CA" })
      .expect(201);

    expect(res.body.id).toBe("app_123");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("lists applications for applicant", async () => {
    testUser = { userId: "applicant_1", role: "applicant" };
    // Return 2 apps for applicant
    mockFindMany.mockResolvedValueOnce([
      { id: "app_1", userId: "applicant_1", visaType: "Skilled Worker", country: "CA", fee: "100", status: "new", createdAt: new Date().toISOString() },
      { id: "app_2", userId: "applicant_1", visaType: "General", country: "US", fee: "50", status: "in_progress", createdAt: new Date().toISOString() },
    ]);
    // Mock users list returned when joining metadata
    const mockUsers = [{ id: "applicant_1", firstName: "John", lastName: "Doe", email: "john@example.com" }];
    vi.mocked(require("../db").db.query.users.findMany).mockResolvedValueOnce(mockUsers as any);

    const res = await request(app).get("/api/applications").set("authorization", "Bearer token").expect(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
    expect(res.body.applications.length).toBeGreaterThan(0);
  });

  it("allows a lawyer to assign themselves to an application", async () => {
    testUser = { userId: "lawyer_1", role: "lawyer" };

    // Mock application existing
    vi.mocked(require("../db").db.query.applications.findFirst).mockResolvedValueOnce({ id: "app_5", userId: "applicant_1", lawyerId: null, status: "new" } as any);
    // Mock the assigned user lookup
    mockFindFirst.mockResolvedValueOnce({ id: "lawyer_1", role: "lawyer", email: "lawyer@example.com" });
    // Mock update returning updated app
    mockUpdate.mockResolvedValueOnce({ id: "app_5", userId: "applicant_1", lawyerId: "lawyer_1", status: "new" });

    const res = await request(app)
      .patch("/api/applications/app_5")
      .set("authorization", "Bearer token")
      .send({ lawyerId: "lawyer_1" })
      .expect(200);

    expect(res.body.lawyerId).toBe("lawyer_1");
    expect(mockUpdate).toHaveBeenCalled();
  });
});
