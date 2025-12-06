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
