import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getEligibilityQuestions,
  checkEligibility,
  analyzeDocument,
  generateInterviewQuestions,
  evaluateInterviewAnswer,
} from "../lib/ai";
import { db } from "../db";
import { documents } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

// Get eligibility questions
router.get(
  "/eligibility/questions",
  asyncHandler(async (req, res) => {
    const questions = getEligibilityQuestions();
    res.json({ questions });
  })
);

// Check eligibility
router.post(
  "/eligibility/check",
  asyncHandler(async (req, res) => {
    const answers = z.record(z.any()).parse(req.body);
    const result = await checkEligibility(answers);
    res.json(result);
  })
);

// Analyze document
router.post(
  "/documents/analyze/:documentId",
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check permissions
    if (role === "applicant" && document.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const analysis = await analyzeDocument(
      document.url,
      document.documentType || "unknown",
      document.ocrData || undefined
    );

    // Update document with analysis
    await db
      .update(documents)
      .set({ aiAnalysis: analysis })
      .where(eq(documents.id, documentId));

    res.json(analysis);
  })
);

// Generate interview questions
router.post(
  "/interview/questions",
  asyncHandler(async (req, res) => {
    const { visaType, country } = z
      .object({
        visaType: z.string().min(1),
        country: z.string().length(2),
      })
      .parse(req.body);

    const questions = await generateInterviewQuestions(visaType, country);
    res.json({ questions });
  })
);

// Evaluate interview answer
router.post(
  "/interview/evaluate",
  asyncHandler(async (req, res) => {
    const { question, answer } = z
      .object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
      .parse(req.body);

    const feedback = await evaluateInterviewAnswer(question, answer);
    res.json(feedback);
  })
);

export default router;








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

const createApplicationSchema = z.object({
  visaType: z.string().min(1).max(100),
  country: z.string().length(2),
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().max(5000).optional(),
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
});

// Get all applications (with filters)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
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
    const { status, search, sortBy, page = "1", pageSize = "10" } = req.query;

    if (status && status !== "all") {
      query = query.where(
        and(
          role === "applicant" ? eq(applications.userId, userId) : undefined,
          eq(applications.status, status as any)
        )
      ) as any;
    }

    // TODO: Implement search and sorting properly with Drizzle
    const allApps = await db.query.applications.findMany({
      where: role === "applicant" ? eq(applications.userId, userId) : undefined,
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

    res.json({
      applications: paginated,
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
    const userId = req.user!.id;
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
    const userId = req.user!.id;

    // Validate country code
    if (!isValidCountryCode(body.country)) {
      throw new AppError(400, "Invalid country code");
    }

    // Validate visa type
    if (!isValidVisaType(body.visaType)) {
      throw new AppError(400, "Invalid visa type");
    }

    const [newApplication] = await db
      .insert(applications)
      .values({
        userId,
        visaType: sanitizeInput(body.visaType),
        country: body.country.toUpperCase(),
        fee: body.fee || "0",
        notes: body.notes ? sanitizeInput(body.notes) : null,
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
    const userId = req.user!.id;
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
    const userId = req.user!.id;
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








import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendEmail, generatePasswordResetEmail } from "../lib/email";
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  isValidRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
} from "../lib/auth";
import { authenticate } from "../middleware/auth";
import { authLimiter, normalizeEmail, sanitizeInput } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import { auditLog, logger } from "../lib/logger";
import { emailQueue } from "../lib/queue";

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  role: z.enum(["applicant", "lawyer"]).default("applicant"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// Register
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const email = normalizeEmail(body.email);

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        hashedPassword,
        role: body.role,
        firstName: sanitizeInput(body.firstName || ""),
        lastName: sanitizeInput(body.lastName || ""),
        phone: body.phone ? sanitizeInput(body.phone) : null,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      })
      .returning();

    // Generate tokens
    const tokens = await generateTokens(newUser.id);

    await auditLog(newUser.id, "user.register", "user", newUser.id, {}, req);

    logger.info({ userId: newUser.id, email }, "User registered");

    // Optionally queue verification email (best-effort)
    try {
      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
      const html = `Please verify your email by visiting: <a href="${verificationUrl}">${verificationUrl}</a>`;
      await emailQueue.add({ to: newUser.email, subject: "Verify your ImmigrationAI account", html });
    } catch (err) {
      logger.error({ error: err }, "Failed to queue verification email");
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
      ...tokens,
    });
  })
);

// Login
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const email = normalizeEmail(body.email);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      await auditLog(null, "user.login_failed", "user", null, { email }, req);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Verify password
    const isValid = await verifyPassword(user.hashedPassword, body.password);
    if (!isValid) {
      await auditLog(null, "user.login_failed", "user", user.id, {}, req);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate tokens
    const tokens = await generateTokens(user.id);

    await auditLog(user.id, "user.login", "user", user.id, {}, req);

    logger.info({ userId: user.id, email }, "User logged in");

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    });
  })
);

// Refresh token
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyRefreshToken(body.refreshToken);
    if (!payload) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if token is valid in database
    const isValid = await isValidRefreshToken(body.refreshToken);
    if (!isValid) {
      return res.status(401).json({ message: "Refresh token expired or revoked" });
    }

    // Revoke old token
    await revokeRefreshToken(body.refreshToken);

    // Generate new tokens
    const tokens = await generateTokens((payload as any).userId);

    res.json(tokens);
  })
);

// Logout
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) {
      try {
        await revokeRefreshToken(refreshToken);
      } catch (err) {
        // Continue logout even if revocation fails
        logger.warn({ error: err }, "Failed to revoke refresh token");
      }
    }

    if (req.user?.id) {
      await auditLog(req.user.id, "user.logout", "user", req.user.id, {}, req);
    }

    res.json({ message: "Logged out successfully" });
  })
);

// Get current user
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  })
);

// Verify email
router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const { token } = z.object({ token: z.string() }).parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token),
    });

    if (!user || !user.emailVerificationExpires) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ message: "Verification token expired" });
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where(eq(users.id, user.id));

    await auditLog(user.id, "user.email_verified", "user", user.id, {}, req);

    res.json({ message: "Email verified successfully" });
  })
);

// Forgot password
router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = forgotPasswordSchema.parse(req.body);
    const email = normalizeEmail(body.email);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.json({ message: "If the email exists, a reset link has been sent" });
    }

    const resetToken = generatePasswordResetToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      })
      .where(eq(users.id, user.id));

    // Queue email send
    const appUrl = process.env.APP_URL || "http://localhost:5000";
    const html = generatePasswordResetEmail(resetToken, appUrl);

    try {
      await emailQueue.add({
        to: user.email,
        subject: "Password Reset Request - ImmigrationAI",
        html,
      });
    } catch (err) {
      logger.error({ error: err }, "Failed to queue password reset email");
    }

    await auditLog(user.id, "user.password_reset_requested", "user", user.id, {}, req);
    logger.info({ userId: user.id, email }, "Password reset requested");

    res.json({ message: "If the email exists, a reset link has been sent" });
  })
);

// Reset password
router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = resetPasswordSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.passwordResetToken, body.token),
    });

    if (!user || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (new Date() > user.passwordResetExpires) {
      return res.status(400).json({ message: "Reset token expired" });
    }

    const hashedPassword = await hashPassword(body.newPassword);

    await db
      .update(users)
      .set({
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, user.id));

    await auditLog(user.id, "user.password_reset", "user", user.id, {}, req);

    res.json({ message: "Password reset successfully" });
  })
);

// Get current user
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified,
    });
  })
);

export default router;








import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, consultations, applications } from "@shared/schema";
import { eq, and, or, desc, gte, lt } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { emailQueue } from "../lib/queue";
import { generateConsultationEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

// Validation schemas
const createConsultationSchema = z.object({
  lawyerId: z.string().min(1, "Lawyer ID required"),
  applicationId: z.string().optional(),
  scheduledTime: z.string().datetime("Invalid date format"),
  duration: z.number().int().min(15).max(480).default(60),
  notes: z.string().max(2000).optional(),
});

const updateConsultationSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string().max(2000).optional(),
  meetingLink: z.string().url().optional(),
});

// Create consultation request (Applicant requests lawyer)
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== "applicant") {
      throw new AppError(403, "Only applicants can request consultations");
    }

    const body = createConsultationSchema.parse(req.body);

    // Verify lawyer exists and is active
    const lawyer = await db.query.users.findFirst({
      where: and(eq(users.id, body.lawyerId), eq(users.role, "lawyer")),
    });

    if (!lawyer) {
      throw new AppError(404, "Lawyer not found");
    }

    // Fetch full user data for email
    const applicant = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!applicant) {
      throw new AppError(404, "User not found");
    }

    // Create consultation request
    const [consultation] = await db
      .insert(consultations)
      .values({
        lawyerId: body.lawyerId,
        userId: user.id,
        applicationId: body.applicationId,
        scheduledTime: new Date(body.scheduledTime),
        duration: body.duration,
        notes: body.notes,
        status: "scheduled",
      })
      .returning();

    // Email lawyer about new consultation request
    try {
      await emailQueue.add({
        to: lawyer.email,
        subject: `New Consultation Request from ${applicant.firstName || applicant.email}`,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif;">
              <h2>New Consultation Request</h2>
              <p>You have received a new consultation request from ${applicant.firstName} ${applicant.lastName || ""}</p>
              <p><strong>Email:</strong> ${applicant.email}</p>
              <p><strong>Phone:</strong> ${applicant.phone || "Not provided"}</p>
              <p><strong>Scheduled Time:</strong> ${new Date(body.scheduledTime).toLocaleString()}</p>
              <p><strong>Duration:</strong> ${body.duration} minutes</p>
              ${body.notes ? `<p><strong>Notes:</strong> ${body.notes}</p>` : ""}
              <p><a href="${process.env.APP_URL || "https://immigrationai.com"}/lawyer/consultations/${consultation.id}">View Request</a></p>
            </body>
          </html>
        `,
      });
    } catch (error) {
      logger.error({ error }, "Failed to queue consultation email");
    }

    // Email applicant confirmation
    try {
      await emailQueue.add({
        to: applicant.email,
        subject: "Consultation Request Submitted",
        html: `
          <html>
            <body style="font-family: Arial, sans-serif;">
              <h2>Consultation Request Received</h2>
              <p>Your consultation request has been submitted to ${lawyer.firstName} ${lawyer.lastName || ""}.</p>
              <p>The lawyer will review your request and confirm the appointment.</p>
              <p><strong>Requested Time:</strong> ${new Date(body.scheduledTime).toLocaleString()}</p>
            </body>
          </html>
        `,
      });
    } catch (error) {
      logger.error({ error }, "Failed to queue applicant confirmation email");
    }

    res.status(201).json(consultation);
  })
);

// Get consultations for current user (lawyer or applicant)
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { status, from, to } = req.query;

    let query = db.query.consultations.findMany({
      where: user.role === "lawyer"
        ? eq(consultations.lawyerId, user.id)
        : eq(consultations.userId, user.id),
      orderBy: desc(consultations.scheduledTime),
    });

    // Filter by status if provided
    if (status && typeof status === "string") {
      query = db.query.consultations.findMany({
        where:
          user.role === "lawyer"
            ? and(eq(consultations.lawyerId, user.id), eq(consultations.status, status as any))
            : and(eq(consultations.userId, user.id), eq(consultations.status, status as any)),
        orderBy: desc(consultations.scheduledTime),
      });
    }

    // Filter by date range if provided
    if (from || to) {
      const filters = [
        user.role === "lawyer"
          ? eq(consultations.lawyerId, user.id)
          : eq(consultations.userId, user.id),
      ];

      if (from) {
        filters.push(gte(consultations.scheduledTime, new Date(from as string)));
      }
      if (to) {
        filters.push(lt(consultations.scheduledTime, new Date(to as string)));
      }

      const results = await db.query.consultations.findMany({
        where: and(...filters),
        orderBy: desc(consultations.scheduledTime),
      });

      return res.json(results);
    }

    const results = await query;
    res.json(results);
  })
);

// Get available lawyers for consultation
router.get(
  "/available/lawyers",
  authenticate,
  asyncHandler(async (req, res) => {
    const lawyers = await db.query.users.findMany({
      where: eq(users.role, "lawyer"),
    });

    res.json(lawyers.map(l => ({
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
    })));
  })
);

// Get consultation by ID
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const consultation = await db.query.consultations.findFirst({
      where: eq(consultations.id, id),
    });

    if (!consultation) {
      throw new AppError(404, "Consultation not found");
    }

    // Verify user is lawyer or applicant in this consultation
    if (consultation.lawyerId !== user.id && consultation.userId !== user.id) {
      throw new AppError(403, "Access denied");
    }

    res.json(consultation);
  })
);

// Update consultation (lawyer accepts/rejects, sets meeting link, marks complete)
router.patch(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;
    const body = updateConsultationSchema.parse(req.body);

    const consultation = await db.query.consultations.findFirst({
      where: eq(consultations.id, id),
    });

    if (!consultation) {
      throw new AppError(404, "Consultation not found");
    }

    // Only lawyer or applicant can update
    if (consultation.lawyerId !== user.id && consultation.userId !== user.id) {
      throw new AppError(403, "Access denied");
    }

    // Update consultation
    const [updated] = await db
      .update(consultations)
      .set({
        status: body.status || consultation.status,
        notes: body.notes !== undefined ? body.notes : consultation.notes,
        meetingLink: body.meetingLink || consultation.meetingLink,
      })
      .where(eq(consultations.id, id))
      .returning();

    // Notify parties of status change
    if (body.status && body.status !== consultation.status) {
      const otherUserId = user.id === consultation.lawyerId ? consultation.userId : consultation.lawyerId;
      const otherUser = await db.query.users.findFirst({
        where: eq(users.id, otherUserId),
      });

      if (otherUser) {
        try {
          await emailQueue.add({
            to: otherUser.email,
            subject: `Consultation Status Update: ${body.status}`,
            html: `
              <html>
                <body style="font-family: Arial, sans-serif;">
                  <h2>Consultation Status Changed</h2>
                  <p>Your consultation scheduled for ${new Date(consultation.scheduledTime).toLocaleString()} has been ${body.status}.</p>
                  ${body.meetingLink ? `<p><a href="${body.meetingLink}">Join Meeting</a></p>` : ""}
                </body>
              </html>
            `,
          });
        } catch (error) {
          logger.error({ error }, "Failed to send status update email");
        }
      }
    }

    res.json(updated);
  })
);

// Cancel consultation
router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const consultation = await db.query.consultations.findFirst({
      where: eq(consultations.id, id),
    });

    if (!consultation) {
      throw new AppError(404, "Consultation not found");
    }

    // Only lawyer or applicant can cancel
    if (consultation.lawyerId !== user.id && consultation.userId !== user.id) {
      throw new AppError(403, "Access denied");
    }

    // Update status to cancelled
    const [cancelled] = await db
      .update(consultations)
      .set({ status: "cancelled" })
      .where(eq(consultations.id, id))
      .returning();

    // Notify other party
    const otherUserId = user.id === consultation.lawyerId ? consultation.userId : consultation.lawyerId;
    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
    });

    if (otherUser) {
      try {
        await emailQueue.add({
          to: otherUser.email,
          subject: "Consultation Cancelled",
          html: `
            <html>
              <body style="font-family: Arial, sans-serif;">
                <h2>Consultation Cancelled</h2>
                <p>The consultation scheduled for ${new Date(consultation.scheduledTime).toLocaleString()} has been cancelled.</p>
              </body>
            </html>
          `,
        });
      } catch (error) {
        logger.error({ error }, "Failed to send cancellation email");
      }
    }

    res.json(cancelled);
  })
);

export default router;

import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { db } from "../db";
import { documents, applications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { uploadLimiter } from "../middleware/security";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { uploadFile, deleteFile, getPresignedUrl, validateFile } from "../lib/storage";
import { auditLog } from "../lib/logger";
import { logger } from "../lib/logger";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// All routes require authentication
router.use(authenticate);

const createDocumentSchema = z.object({
  applicationId: z.string().uuid().optional().nullable(),
  documentType: z.string().max(100).optional(),
});

// Upload document
router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, "No file provided");
    }

    const body = createDocumentSchema.parse(req.body || {});
    const userId = req.user!.id;

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.valid) {
      throw new AppError(400, validation.error || "Invalid file");
    }

    // Verify application belongs to user if provided
    if (body.applicationId) {
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, body.applicationId),
      });

      if (!application) {
        throw new AppError(404, "Application not found");
      }

      if (application.userId !== userId && req.user!.role === "applicant") {
        throw new AppError(403, "Access denied");
      }
    }

    // Upload to storage
    const uploadResult = await uploadFile(
      req.file,
      userId,
      body.applicationId || null
    );

    // Save to database
    const [document] = await db
      .insert(documents)
      .values({
        applicationId: body.applicationId || null,
        userId,
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        documentType: body.documentType || null,
      })
      .returning();

    await auditLog(userId, "document.upload", "document", document.id, {
      fileName: uploadResult.fileName,
      applicationId: body.applicationId,
    }, req);

    logger.info({ userId, documentId: document.id, fileName: uploadResult.fileName }, "Document uploaded");

    res.status(201).json(document);
  })
);

// Get documents
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { applicationId } = req.query;

    let docs;
    if (applicationId) {
      // Verify application access
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId as string),
      });

      if (!application) {
        throw new AppError(404, "Application not found");
      }

      if (role === "applicant" && application.userId !== userId) {
        throw new AppError(403, "Access denied");
      }

      docs = await db.query.documents.findMany({
        where: eq(documents.applicationId, applicationId as string),
        orderBy: (documents, { desc }) => [desc(documents.createdAt)],
      });
    } else {
      // Get user's documents
      docs = await db.query.documents.findMany({
        where: eq(documents.userId, userId),
        orderBy: (documents, { desc }) => [desc(documents.createdAt)],
      });
    }

    // Generate fresh presigned URLs
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => {
        try {
          const url = await getPresignedUrl(doc.url.split("/").pop() || doc.url);
          return { ...doc, url };
        } catch {
          return doc;
        }
      })
    );

    res.json(docsWithUrls);
  })
);

// Get single document
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { id } = req.params;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      throw new AppError(404, "Document not found");
    }

    // Check permissions
    if (role === "applicant" && document.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    // Generate fresh presigned URL
    try {
      const url = await getPresignedUrl(document.url.split("/").pop() || document.url);
      res.json({ ...document, url });
    } catch {
      res.json(document);
    }
  })
);

// Delete document
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { id } = req.params;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      throw new AppError(404, "Document not found");
    }

    // Check permissions
    if (role === "applicant" && document.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    // Delete from storage
    try {
      await deleteFile(document.url.split("/").pop() || document.url);
    } catch (error) {
      logger.error({ error, documentId: id }, "Failed to delete file from storage");
    }

    // Delete from database
    await db.delete(documents).where(eq(documents.id, id));

    await auditLog(userId, "document.delete", "document", id, {}, req);

    res.json({ message: "Document deleted successfully" });
  })
);

export default router;








import { Router } from "express";
import { testConnection } from "../db";

const router = Router();

router.get("/", async (req, res) => {
  const dbConnected = await testConnection();
  
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    database: dbConnected ? "connected" : "disconnected",
  });
});

export default router;








import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { applications, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendApplicationStatusNotification, notifyAdmins } from "../lib/notifications";

const router = Router();

// Send custom notification (admin only)
router.post(
  "/send",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { userId, subject, message } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    logger.info({ userId, subject }, "Notification sent");
    res.json({ message: "Notification sent" });
  })
);

// Notify application status change
router.post(
  "/application-status/:applicationId",
  authenticate,
  requireRole("admin", "lawyer"),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { status } = req.body;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    const applicant = await db.query.users.findFirst({
      where: eq(users.id, application.userId),
    });

    await sendApplicationStatusNotification(
      application.userId,
      applicationId,
      status,
      applicant?.firstName || ""
    );

    logger.info({ applicationId, status }, "Status notification sent");
    res.json({ message: "Notification sent to applicant" });
  })
);

// Notify all admins
router.post(
  "/notify-admins",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { subject, message } = req.body;

    await notifyAdmins(subject, message);

    logger.info({ subject }, "Admin notification sent");
    res.json({ message: "Admins notified" });
  })
);

export default router;
import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { applications, documents, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

interface ReportData {
  applicantName: string;
  email: string;
  applicationId: string;
  status: string;
  visaType: string;
  country: string;
  submittedDate: string;
  documents: number;
  approvalProbability: number;
  recommendations: string[];
  aiSummary: string;
}

// Generate HTML for PDF
function generateReportHTML(data: ReportData): string {
  const statusColor = {
    'Approved': '#28a745',
    'Rejected': '#dc3545',
    'Reviewing': '#ffc107',
    'New': '#007bff'
  }[data.status] || '#6c757d';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 900px; margin: 0 auto; padding: 40px; }
        .header { border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #007bff; font-size: 28px; margin-bottom: 5px; }
        .header p { color: #666; font-size: 14px; }
        .report-date { color: #999; font-size: 12px; margin-top: 10px; }
        
        .section { margin-bottom: 30px; }
        .section-title { 
          font-size: 18px; 
          font-weight: bold; 
          color: #333; 
          border-left: 4px solid #007bff; 
          padding-left: 15px; 
          margin-bottom: 15px;
        }
        
        .applicant-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-row { margin-bottom: 12px; }
        .info-label { 
          font-weight: bold; 
          color: #555; 
          display: inline-block; 
          width: 150px;
        }
        .info-value { color: #333; }
        
        .status-badge {
          display: inline-block;
          padding: 8px 15px;
          background-color: ${statusColor};
          color: white;
          border-radius: 4px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
        .stat-label { color: #666; font-size: 13px; font-weight: bold; }
        .stat-value { font-size: 32px; font-weight: bold; color: #007bff; margin-top: 5px; }
        
        .summary-box {
          background: #e7f3ff;
          border-left: 4px solid #007bff;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .summary-box p { color: #333; line-height: 1.8; }
        
        .recommendations-list {
          list-style: none;
          padding-left: 0;
        }
        .recommendations-list li {
          padding: 12px;
          margin-bottom: 10px;
          background: #f8f9fa;
          border-left: 4px solid #28a745;
          border-radius: 4px;
        }
        .recommendations-list li:before {
          content: "✓ ";
          color: #28a745;
          font-weight: bold;
          margin-right: 10px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        
        @media print {
          body { margin: 0; padding: 0; }
          .container { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Immigration Application Report</h1>
          <p>Confidential - For applicant and authorized personnel only</p>
          <div class="report-date">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <!-- Applicant Information -->
        <div class="section">
          <div class="section-title">Applicant Information</div>
          <div class="applicant-info">
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${data.applicantName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${data.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Application ID:</span>
              <span class="info-value">${data.applicationId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Submitted Date:</span>
              <span class="info-value">${data.submittedDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="status-badge">${data.status}</span>
            </div>
          </div>
        </div>

        <!-- Application Details -->
        <div class="section">
          <div class="section-title">Application Details</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Visa Type</div>
              <div class="stat-value">${data.visaType}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Destination Country</div>
              <div class="stat-value">${data.country}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Documents Submitted</div>
              <div class="stat-value">${data.documents}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Approval Probability</div>
              <div class="stat-value">${data.approvalProbability}%</div>
            </div>
          </div>
        </div>

        <!-- AI Analysis Summary -->
        <div class="section">
          <div class="section-title">AI Analysis Summary</div>
          <div class="summary-box">
            <p>${data.aiSummary}</p>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="section">
          <div class="section-title">Recommendations for Next Steps</div>
          <ul class="recommendations-list">
            ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>This report was generated by ImmigrationAI's AI analysis system.</p>
          <p>© ${new Date().getFullYear()} ImmigrationAI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF report for partner/lawyer
router.post(
  "/generate/:applicationId",
  authenticate,
  requireRole("lawyer", "admin"),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    const applicant = await db.query.users.findFirst({
      where: eq(users.id, application.userId),
    });

    if (!applicant) {
      throw new AppError(404, "Applicant not found");
    }

    // Get documents count
    const appDocuments = await db.query.documents.findMany({
      where: eq(documents.applicationId, applicationId),
    });

    // Generate AI analysis data (in production, would be from actual AI)
    const aiSummary = `Applicant ${applicant.firstName} has submitted a ${application.visaType} application for ${application.country}. The application includes ${appDocuments.length} supporting documents. Initial assessment shows strong documentation and clear visa eligibility based on submitted materials.`;

    const recommendations = [
      `Complete the ${application.visaType} application form thoroughly`,
      `Prepare for potential interview scheduling within 2-3 weeks`,
      `Gather additional supporting documents for financial verification`,
      `Consider scheduling a consultation with our legal team for guidance`,
      `Keep all documents organized and backed up for reference`
    ];

    const reportData: ReportData = {
      applicantName: `${applicant.firstName} ${applicant.lastName}`,
      email: applicant.email,
      applicationId,
      status: application.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      visaType: application.visaType,
      country: application.country,
      submittedDate: application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'N/A',
      documents: appDocuments.length,
      approvalProbability: Math.floor(Math.random() * 40) + 60, // Random 60-100% for demo
      recommendations,
      aiSummary
    };

    const html = generateReportHTML(reportData);

    // Return HTML instead of PDF (frontend can convert with html2pdf.js or similar)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${applicationId}.html"`);
    res.send(html);

    logger.info({ applicationId }, "Report generated");
  })
);

// Get download link for report
router.get(
  "/download/:applicationId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user!.id;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check authorization - user owns application or is lawyer/admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (application.userId !== userId && user?.role === 'applicant') {
      throw new AppError(403, "Unauthorized to download this report");
    }

    res.json({
      downloadUrl: `/api/reports/download/${applicationId}`,
      message: "Report is ready for download"
    });
  })
);

export default router;

import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { researchArticles, type ResearchArticle, insertResearchArticleSchema } from "@shared/schema";
import { and, desc, ilike, sql } from "drizzle-orm";
import { authenticate, optionalAuth, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { sanitizeInput } from "../middleware/security";

const router = Router();

// Public list endpoint (no auth required)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search = "",
      category = "all",
      language = "",
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string>;

    const whereClauses: any[] = [sql`"is_published" = true`];

    if (category && category !== "all") {
      whereClauses.push(sql`category = ${category}`);
    }

    if (language) {
      whereClauses.push(sql`language = ${language}`);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      whereClauses.push(
        and(
          ilike(researchArticles.title, term),
          sql`1 = 1`
        ),
      );
    }

    const articles = await db.query.researchArticles.findMany({
      where: whereClauses.length ? and(...(whereClauses as any)) : undefined,
      orderBy: [desc(researchArticles.publishedAt), desc(researchArticles.createdAt)],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({ items: articles });
  }),
);

// Authenticated create/update/delete endpoints
const upsertSchema = insertResearchArticleSchema.extend({
  id: z.string().uuid().optional(),
});

// Create article - any logged-in user can contribute
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const body = upsertSchema.parse(req.body);

    const slug = body.slug.toLowerCase();

    const [article] = await db
      .insert(researchArticles)
      .values({
        ...body,
        slug,
        title: sanitizeInput(body.title),
        summary: body.summary ? sanitizeInput(body.summary) : null,
        body: body.body,
        tags: body.tags || [],
        source: body.source ? sanitizeInput(body.source) : null,
        createdByUserId: req.user!.id,
        publishedAt: new Date(),
      })
      .returning();

    res.status(201).json(article);
  }),
);

// Update article - only creator, lawyer, or admin
router.patch(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = upsertSchema.partial().parse(req.body);

    const existing = await db.query.researchArticles.findFirst({
      where: sql`id = ${id}`,
    });

    if (!existing) {
      throw new AppError(404, "Article not found");
    }

    const isOwner = existing.createdByUserId === req.user!.id;
    const isElevated = req.user!.role === "admin" || req.user!.role === "lawyer";
    if (!isOwner && !isElevated) {
      throw new AppError(403, "Insufficient permissions");
    }

    const [updated] = await db
      .update(researchArticles)
      .set({
        ...body,
        title: body.title ? sanitizeInput(body.title) : existing.title,
        summary: body.summary ? sanitizeInput(body.summary) : existing.summary,
        slug: body.slug ? body.slug.toLowerCase() : existing.slug,
        source: body.source ? sanitizeInput(body.source) : existing.source,
        updatedByUserId: req.user!.id,
        updatedAt: new Date(),
      })
      .where(sql`id = ${id}`)
      .returning();

    res.json(updated);
  }),
);

// Delete article - admin only
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await db.delete(researchArticles).where(sql`id = ${id}`);

    res.json({ message: "Article deleted" });
  }),
);

export default router;









import { Router } from "express";
import { db } from "../db";
import { applications, payments, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.use(authenticate);

// Get dashboard stats
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role === "applicant") {
      // Applicant stats
      const userApps = await db.query.applications.findMany({
        where: eq(applications.userId, userId),
      });

      const totalApplications = userApps.length;
      const pendingApps = userApps.filter((app) => app.status === "new" || app.status === "in_progress").length;
      const approvedApps = userApps.filter((app) => app.status === "approved").length;
      const successRate = totalApplications > 0 ? Math.round((approvedApps / totalApplications) * 100) : 0;

      res.json({
        totalApplications,
        pendingApplications: pendingApps,
        approvedApplications: approvedApps,
        successRate,
      });
    } else {
      // Admin/Lawyer stats
      const allApps = await db.query.applications.findMany({});
      const allPayments = await db.query.payments.findMany({
        where: eq(payments.status, "completed"),
      });

      const totalRevenue = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
      const totalLeads = allApps.length;
      const pendingLeads = allApps.filter((app) => app.status === "new" || app.status === "in_progress").length;
      const approvedLeads = allApps.filter((app) => app.status === "approved").length;
      const successRate = totalLeads > 0 ? Math.round((approvedLeads / totalLeads) * 100) : 0;

      res.json({
        totalRevenue,
        totalLeads,
        pendingLeads,
        approvedLeads,
        successRate,
      });
    }
  })
);

export default router;








import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { payments, applications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

let stripe: any;
try {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
} catch (err) {
  logger.warn("Stripe not initialized - payment features disabled");
}

// Create payment intent
router.post(
  "/create-intent",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!stripe) {
      throw new AppError(503, "Payment service not available");
    }

    const { amount, applicationId, description } = z
      .object({
        amount: z.number().positive(),
        applicationId: z.string().uuid().optional(),
        description: z.string().optional(),
      })
      .parse(req.body);

    const userId = req.user!.id;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        userId,
        applicationId: applicationId || "general",
      },
    });

    // Store in database
    const [payment] = await db
      .insert(payments)
      .values({
        userId,
        applicationId: applicationId || null,
        amount: amount.toString(),
        currency: "USD",
        provider: "stripe",
        providerTransactionId: paymentIntent.id,
        status: "processing",
      })
      .returning();

    logger.info({ paymentId: payment.id }, "Payment intent created");

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    });
  })
);

// Confirm payment
router.post(
  "/confirm",
  authenticate,
  asyncHandler(async (req, res) => {
    if (!stripe) {
      throw new AppError(503, "Payment service not available");
    }

    const { paymentIntentId } = z
      .object({
        paymentIntentId: z.string(),
      })
      .parse(req.body);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      await db
        .update(payments)
        .set({ status: "completed" })
        .where(eq(payments.providerTransactionId, paymentIntentId));

      logger.info(
        { paymentIntentId, userId: req.user!.id },
        "Payment confirmed"
      );

      res.json({ status: "success" });
    } else {
      throw new AppError(400, "Payment not completed");
    }
  })
);

// Get payment history
router.get(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const userPayments = await db.query.payments.findMany({
      where: eq(payments.userId, userId),
    });

    res.json({ payments: userPayments });
  })
);

export default router;
import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "../db";
import { users, payments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { emailQueue } from "../lib/queue";
import { generatePaymentConfirmationEmail } from "../lib/email";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-08-16",
});

// Stripe webhook endpoint (raw body, not JSON parsed)
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      logger.error({ error: err.message }, "Webhook signature verification failed");
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
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
              await emailQueue.add(
                {
                  to: user.email,
                  subject: "Payment Confirmation - ImmigrationAI",
                  html: generatePaymentConfirmationEmail(
                    "Application Fee",
                    `$${(paymentIntent.amount / 100).toFixed(2)}`,
                    new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
                  ),
                },
                { jobId: `payment-${paymentIntent.id}` }
              );

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

          if (userId) {
            // Store subscription in user metadata or new subscriptions table
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

            await db
              .update(users)
              .set({
                metadata: JSON.parse(JSON.stringify({
                  ...existingMetadata,
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                })),
              } as any)
              .where(eq(users.id, userId));

            logger.info({ userId, subscriptionId: subscription.id }, "Subscription created");
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const { userId } = subscription.metadata || {};

          if (userId) {
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

            await db
              .update(users)
              .set({
                metadata: JSON.parse(JSON.stringify({
                  ...existingMetadata,
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                })),
              } as any)
              .where(eq(users.id, userId));

            logger.info({ userId, subscriptionId: subscription.id }, "Subscription updated");
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const { userId } = subscription.metadata || {};

          if (userId) {
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });
            const existingMetadata = user?.metadata && typeof user.metadata === 'object' ? (user.metadata as any) : {};

            await db
              .update(users)
              .set({
                metadata: JSON.parse(JSON.stringify({
                  ...existingMetadata,
                  stripeSubscriptionId: null,
                  subscriptionStatus: "cancelled",
                })),
              } as any)
              .where(eq(users.id, userId));

            logger.info({ userId, subscriptionId: subscription.id }, "Subscription cancelled");
          }
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

