import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { applications, users } from "@shared/schema";
import { eq, and, desc, asc, like, or } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { isValidCountryCode, isValidVisaType, sanitizeInput } from "../middleware/security";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { auditLog } from "../lib/logger";
import { logger } from "../lib/logger";
import { emailQueue } from "../lib/queue";
import { generateApplicationStatusEmail } from "../lib/email";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get unique clients (applicants) for the lawyer (needed for invoicing)
router.get(
  "/clients/list",
  requireRole("lawyer", "admin"),
  asyncHandler(async (req, res) => {
    const lawyerId = req.user!.userId;
    const role = req.user!.role;

    // 1. Get user IDs from applications assigned to this lawyer
    const myApps = await db.query.applications.findMany({
      where: role === "lawyer" ? eq(applications.lawyerId, lawyerId) : undefined,
      columns: { userId: true }
    });

    // 2. Get user IDs from consultations booked with this lawyer
    const { consultations: consultationsTable } = await import("@shared/schema");
    const myConsults = await db.query.consultations.findMany({
      where: role === "lawyer" ? eq(consultationsTable.lawyerId, lawyerId) : undefined,
      columns: { userId: true }
    });

    const userIds = Array.from(new Set([
      ...myApps.map(a => a.userId),
      ...myConsults.map(c => c.userId)
    ]));

    if (!userIds.length) return res.json([]);

    const clientList = await db.query.users.findMany({
      where: or(...userIds.map(id => eq(users.id, id))),
      columns: { id: true, firstName: true, lastName: true, email: true }
    });

    res.json(clientList);
  })
);

const createApplicationSchema = z.object({
  visaType: z.string().min(1).max(100),
  country: z.string().length(2),
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().max(5000).optional(),
  lawyerId: z.string().optional(),
});

const updateApplicationSchema = z.object({
  status: z.enum([
    "new",
    "in_progress",
    "pending_documents",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "cancelled",
  ]).optional(),
  visaType: z.string().min(1).max(100).optional(),
  country: z.string().length(2).optional(),
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().max(5000).optional(),
  lawyerId: z.string().optional(),
});

// Get all applications (with filters)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;

    // Build query
    let query = db.select().from(applications);

    // Applicants can only see their own applications
    if (role === "applicant") {
      query = query.where(eq(applications.userId, userId)) as any;
    } else if (role === "lawyer") {
      // Lawyers can see all applications (or filter by assigned)
      // For now, show all
    }
    // Admins can see all

    // Apply filters
    const { status, search, sortBy, page = "1", pageSize = "10", assigned } = req.query;

    if (status && status !== "all") {
      query = query.where(
        and(
          role === "applicant" ? eq(applications.userId, userId) : undefined,
          eq(applications.status, status as any)
        )
      ) as any;
    }

    // TODO: Implement search and sorting properly with Drizzle
    // If the logged-in user is a lawyer and asked for assigned list, filter by lawyerId
    const whereClause =
      role === "applicant"
        ? eq(applications.userId, userId)
        : role === "lawyer" && assigned === "true"
          ? eq(applications.lawyerId, userId)
          : undefined;

    const allApps = await db.query.applications.findMany({
      where: whereClause as any,
      orderBy: [desc(applications.createdAt)],
    });

    // Filter by status
    let filtered = allApps;
    if (status && status !== "all") {
      filtered = filtered.filter((app) => app.status === status);
    }

    // Search
    if (search) {
      const searchLower = String(search).toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.visaType.toLowerCase().includes(searchLower) ||
          app.country.toLowerCase().includes(searchLower) ||
          app.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paginated = filtered.slice(start, end);

    // Join user info (non-performant for large datasets but acceptable for demo)
    const userIds = Array.from(new Set(filtered.map((a) => a.userId)));
    const usersList = userIds.length ? await db.query.users.findMany({ where: or(...userIds.map((id) => eq(users.id, id))) }) : [];
    const userMap: Record<string, any> = {};
    usersList.forEach((u) => (userMap[u.id] = u));

    const enriched = await Promise.all(paginated.map(async (a) => {
      // Calculate Priority Score (0-100)
      let score = 0;
      const feeNum = parseFloat(a.fee || "0");
      if (feeNum >= 2000) score += 40;
      else if (feeNum >= 1000) score += 20;

      // Check document count
      const docCount = await db.query.documents.findMany({
        where: (docs, { eq }) => eq(docs.applicationId, a.id),
      });
      if (docCount.length >= 5) score += 30;
      else if (docCount.length >= 2) score += 15;

      // Age bonus (newer is higher priority for response)
      const daysOld = (new Date().getTime() - new Date(a.createdAt).getTime()) / (1000 * 3600 * 24);
      if (daysOld < 3) score += 30;
      else if (daysOld < 7) score += 15;

      let priorityLevel: "High" | "Medium" | "Low" = "Low";
      if (score >= 70) priorityLevel = "High";
      else if (score >= 40) priorityLevel = "Medium";

      return {
        ...a,
        userName: userMap[a.userId]?.firstName ? `${userMap[a.userId].firstName} ${userMap[a.userId].lastName || ''}`.trim() : undefined,
        userEmail: userMap[a.userId]?.email,
        priorityScore: score,
        priorityLevel: priorityLevel
      };
    }));

    res.json({
      applications: enriched,
      total: filtered.length,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(filtered.length / size),
    });
  })
);

// Get single application
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { id } = req.params;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check permissions
    if (role === "applicant" && application.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    res.json(application);
  })
);

// Create application
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createApplicationSchema.parse(req.body);
    const userId = req.user!.userId;
    const role = req.user!.role;

    // Validate country code
    if (!isValidCountryCode(body.country)) {
      throw new AppError(400, "Invalid country code");
    }

    // Validate visa type
    if (!isValidVisaType(body.visaType)) {
      throw new AppError(400, "Invalid visa type");
    }

    const insertData: any = {
      userId,
      visaType: sanitizeInput(body.visaType),
      country: body.country.toUpperCase(),
      fee: body.fee || "0",
      notes: body.notes ? sanitizeInput(body.notes) : null,
    };

    // Only allow assigning lawyer if the current user is a lawyer or admin and provided a lawyerId
    if (req.body.lawyerId && (role === "lawyer" || role === "admin")) {
      // Validate that provided user exists and is a lawyer
      const assignedUser = await db.query.users.findFirst({ where: eq(users.id, req.body.lawyerId) });
      if (assignedUser && assignedUser.role === 'lawyer') {
        insertData.lawyerId = req.body.lawyerId;
      }
    }

    // Add applicant metadata for easy display in UIs
    const applicant = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (applicant) {
      insertData.metadata = { applicantName: `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim(), email: applicant.email };
    }

    const [newApplication] = await db
      .insert(applications)
      .values({
        ...insertData,
      })
      .returning();

    await auditLog(userId, "application.create", "application", newApplication.id, {
      visaType: body.visaType,
      country: body.country,
    }, req);

    logger.info({ userId, applicationId: newApplication.id }, "Application created");

    res.status(201).json(newApplication);
  })
);

// Update application
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { id } = req.params;
    const body = updateApplicationSchema.parse(req.body);

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check permissions
    if (role === "applicant" && application.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    // Only lawyers and admins can change status
    if (body.status && role === "applicant") {
      throw new AppError(403, "Cannot change application status");
    }

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.visaType) {
      if (!isValidVisaType(body.visaType)) {
        throw new AppError(400, "Invalid visa type");
      }
      updateData.visaType = sanitizeInput(body.visaType);
    }
    if (body.country) {
      if (!isValidCountryCode(body.country)) {
        throw new AppError(400, "Invalid country code");
      }
      updateData.country = body.country.toUpperCase();
    }
    if (body.fee !== undefined) updateData.fee = body.fee;
    if (body.notes !== undefined) updateData.notes = body.notes ? sanitizeInput(body.notes) : null;
    if (body.lawyerId && (role === "lawyer" || role === "admin")) {
      const assignedUser = await db.query.users.findFirst({ where: eq(users.id, body.lawyerId) });
      if (!assignedUser || assignedUser.role !== 'lawyer') {
        throw new AppError(400, 'Invalid lawyerId');
      }
      updateData.lawyerId = body.lawyerId;
    }

    const [updated] = await db
      .update(applications)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();

    // Send email notification if status changed
    if (body.status && body.status !== application.status) {
      const applicant = await db.query.users.findFirst({
        where: eq(users.id, application.userId),
      });

      if (applicant) {
        await emailQueue.add(
          {
            to: applicant.email,
            subject: `Application Status Update - ${body.status.toUpperCase()}`,
            html: generateApplicationStatusEmail(
              body.status,
              applicant.firstName || "Applicant",
              id
            ),
          },
          { jobId: `app-status-${id}-${Date.now()}` }
        );
      }
    }

    await auditLog(userId, "application.update", "application", id, body, req);

    res.json(updated);
  })
);

// Delete application
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { id } = req.params;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check permissions
    if (role === "applicant" && application.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    await db.delete(applications).where(eq(applications.id, id));

    await auditLog(userId, "application.delete", "application", id, {}, req);

    res.json({ message: "Application deleted successfully" });
  })
);

export default router;







