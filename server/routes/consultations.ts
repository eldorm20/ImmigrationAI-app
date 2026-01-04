import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, consultations, applications, tasks } from "@shared/schema";
import { eq, and, or, desc, gte, lt, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { enqueueJob } from "../lib/queue";
import { generateConsultationEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { generateGoogleMeetLink, createCalendarEventWithMeet, generateJitsiMeetLink } from "../lib/googleMeet";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createConsultationSchema = z.object({
  lawyerId: z.string().min(1, "Lawyer ID required"),
  applicationId: z.string().optional(),
  scheduledTime: z.string().datetime("Invalid date format"),
  duration: z.number().int().min(15).max(480).default(60),
  notes: z.string().max(2000).optional(),
});

const updateConsultationSchema = z.object({
  status: z.enum(["pending", "scheduled", "completed", "cancelled", "no_show", "accepted"]).optional(),
  notes: z.string().max(2000).optional(),
  meetingLink: z.string().url().or(z.string().length(0)).optional().nullable(),
});

// Ask a Lawyer (Structured Query)
router.post(
  "/ask",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== "applicant") {
      throw new AppError(403, "Only applicants can ask questions");
    }

    const { lawyerId, question, applicationId } = z.object({
      lawyerId: z.string().min(1),
      question: z.string().min(10).max(5000),
      applicationId: z.string().optional()
    }).parse(req.body);

    const lawyer = await db.query.users.findFirst({
      where: and(eq(users.id, lawyerId), eq(users.role, "lawyer")),
    });

    if (!lawyer) throw new AppError(404, "Lawyer not found");

    const applicant = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (!applicant) throw new AppError(404, "Applicant not found");

    // Create a 'pending' consultation with a default time (e.g., end of current day)
    // or just use Now to represent a requested callback
    const [consultation] = await db.insert(consultations).values({
      lawyerId,
      userId: user.userId,
      applicationId: applicationId || null,
      notes: `QUERY: ${question}`,
      status: "pending",
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24h from now
      duration: 30,
    }).returning();

    // Notify lawyer
    try {
      await enqueueJob(user.userId, "email", {
        to: lawyer.email,
        subject: `New Legal Inquiry from ${applicant.firstName || applicant.email}`,
        html: `
          <h3>New Legal Inquiry</h3>
          <p><strong>From:</strong> ${applicant.firstName} ${applicant.lastName || ""}</p>
          <p><strong>Question:</strong> ${question}</p>
          <hr/>
          <p><a href="${process.env.APP_URL}/lawyer/consultations/${consultation.id}">Respond to Inquiry</a></p>
        `
      });
    } catch (err) {
      logger.error({ err }, "Failed to send inquiry email");
    }

    res.status(201).json(consultation);
  })
);

// Create consultation request (Applicant requests lawyer)
router.post(
  "/",
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
      where: eq(users.id, user.userId),
    });


    if (!applicant) {
      throw new AppError(404, "User not found");
    }

    // Validate scheduledTime is in the future
    const scheduledDate = new Date(body.scheduledTime);
    if (scheduledDate < new Date()) {
      throw new AppError(400, "Consultation time must be in the future");
    }

    // Check for double booking
    const durationMinutes = body.duration;
    const endTime = new Date(scheduledDate.getTime() + durationMinutes * 60000);

    const existingConsultation = await db.query.consultations.findFirst({
      where: and(
        eq(consultations.lawyerId, body.lawyerId),
        or(eq(consultations.status, "scheduled"), eq(consultations.status, "pending")),
        // Overlap Check: existing_start < new_end AND existing_end > new_start
        and(
          lt(consultations.scheduledTime, endTime),
          sql`(${consultations.scheduledTime} + (${consultations.duration} || ' minutes')::interval) > ${scheduledDate.toISOString()}`
        )
      ),
    });

    if (existingConsultation) {
      throw new AppError(409, "The selected time slot is already booked. Please choose another time.");
    }

    // Generate Jitsi Meet link for video consultation
    const meetingLink = generateJitsiMeetLink(`consult-${body.lawyerId}-${user.userId}`);

    // Create consultation request
    const [consultation] = await db
      .insert(consultations)
      .values({
        lawyerId: body.lawyerId,
        userId: user.userId,
        applicationId: body.applicationId,
        scheduledTime: new Date(body.scheduledTime),
        duration: body.duration,
        notes: body.notes,
        status: "pending",
        meetingLink: meetingLink,
      })
      .returning();

    // Email lawyer about new consultation request
    try {
      await enqueueJob(user.userId, "email", {
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
              <p><strong>Video Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
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
      await enqueueJob(user.userId, "email", {
        to: applicant.email,
        subject: "Consultation Request Submitted",
        html: `
          <html>
            <body style="font-family: Arial, sans-serif;">
              <h2>Consultation Request Received</h2>
              <p>Your consultation request has been submitted to ${lawyer.firstName} ${lawyer.lastName || ""}.</p>
              <p>The lawyer will review your request and confirm the appointment.</p>
              <p><strong>Requested Time:</strong> ${new Date(body.scheduledTime).toLocaleString()}</p>
              <p><strong>Video Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
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
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { status, from, to } = req.query;

    try {
      let results;

      // Filter by date range if provided
      if (from || to) {
        const filters = [
          user.role === "lawyer"
            ? eq(consultations.lawyerId, user.userId)
            : eq(consultations.userId, user.userId),
        ];

        if (from && typeof from === "string") {
          filters.push(gte(consultations.scheduledTime, new Date(from)));
        }
        if (to && typeof to === "string") {
          filters.push(lt(consultations.scheduledTime, new Date(to)));
        }

        results = await db.query.consultations.findMany({
          where: and(...filters),
          orderBy: desc(consultations.scheduledTime),
        });
      } else if (status && typeof status === "string") {
        // Filter by status if provided
        results = await db.query.consultations.findMany({
          where:
            user.role === "lawyer"
              ? and(eq(consultations.lawyerId, user.userId), eq(consultations.status, status as any))
              : and(eq(consultations.userId, user.userId), eq(consultations.status, status as any)),
          orderBy: desc(consultations.scheduledTime),
        });
      } else {
        // Get all consultations for user
        results = await db.query.consultations.findMany({
          where: user.role === "lawyer"
            ? eq(consultations.lawyerId, user.userId)
            : eq(consultations.userId, user.userId),
          orderBy: desc(consultations.scheduledTime),
        });
      }

      // Enrich with user details for lawyers
      if (user.role === "lawyer" && results && results.length > 0) {
        const enriched = await Promise.all(
          results.map(async (consultation) => {
            try {
              const applicant = await db.query.users.findFirst({
                where: eq(users.id, consultation.userId),
                columns: { id: true, firstName: true, lastName: true, email: true, phone: true }
              });
              return {
                ...consultation,
                applicant: applicant || null
              };
            } catch {
              return { ...consultation, applicant: null };
            }
          })
        );
        return res.json(enriched);
      }

      res.json(results || []);
    } catch (err: any) {
      logger.error({ err, userId: user.userId }, "Failed to fetch consultations");
      throw new AppError(500, "Failed to fetch consultations");
    }
  })
);

// Get available lawyers for consultation
router.get(
  "/available/lawyers",
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
    if (consultation.lawyerId !== user.userId && consultation.userId !== user.userId) {
      throw new AppError(403, "Access denied");
    }

    res.json(consultation);
  })
);

// Update consultation (lawyer accepts/rejects, sets meeting link, marks complete)
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;
    const body = updateConsultationSchema.parse(req.body);

    logger.info({ id, userId: user.userId }, "Attempting to update consultation");

    const consultation = await db.query.consultations.findFirst({
      where: eq(consultations.id, id),
    });

    if (!consultation) {
      logger.warn({ id }, "Consultation not found for update");
      throw new AppError(404, "Consultation not found");
    }

    logger.info({ id, currentStatus: consultation.status, lawyerId: consultation.lawyerId }, "Found consultation");

    // Only lawyer or applicant can update
    if (consultation.lawyerId !== user.userId && consultation.userId !== user.userId) {
      throw new AppError(403, "Access denied");
    }

    // Update consultation
    let updated;
    try {
      const [result] = await db
        .update(consultations)
        .set({
          status: body.status || consultation.status,
          notes: body.notes !== undefined ? body.notes : consultation.notes,
          meetingLink: body.meetingLink || consultation.meetingLink,
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, id))
        .returning();
      updated = result;
    } catch (dbErr: any) {
      logger.error({
        dbErr: dbErr.message,
        stack: dbErr.stack,
        id,
        status: body.status,
        userId: user.userId
      }, "Database update failed in consultation PATCH");
      throw new AppError(500, `Database update failed: ${dbErr.message}`);
    }

    if (!updated) {
      throw new AppError(500, "Update failed - no record returned");
    }

    // Notify parties of status change
    if (body.status && body.status !== consultation.status) {
      logger.info({ id, newStatus: body.status }, "Consultation status changed, notifying parties");
      const otherUserId = user.userId === consultation.lawyerId ? consultation.userId : consultation.lawyerId;
      const otherUser = await db.query.users.findFirst({
        where: eq(users.id, otherUserId),
      });

      // Automatic Task Creation: If status is 'completed' and user is lawyer, create follow-up task
      if (body.status === 'completed') {
        // Fetch client details if not already fetched
        const clientUser = user.userId === consultation.lawyerId ? otherUser : await db.query.users.findFirst({ where: eq(users.id, consultation.userId) });

        if (clientUser) {
          await db.insert(tasks).values({
            lawyerId: consultation.lawyerId,
            applicationId: consultation.applicationId,
            title: `Follow up: Consultation with ${clientUser.firstName} ${clientUser.lastName}`,
            description: `Follow-up for client ${clientUser.firstName} ${clientUser.lastName}.\n\nConsultation completed on ${new Date().toLocaleDateString()}. \n\nReview notes: ${body.notes || consultation.notes || 'No notes provided'}. \n\nAction: Send follow-up email or proposal.`,
            status: 'pending',
            priority: 'medium',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
          });

          logger.info({ lawyerId: consultation.lawyerId, consultationId: consultation.id }, "Auto-created follow-up task");
        }
      }

      if (otherUser) {
        try {
          const timeStr = consultation.scheduledTime instanceof Date
            ? consultation.scheduledTime.toLocaleString()
            : new Date(consultation.scheduledTime).toLocaleString();

          await enqueueJob(user.userId, "email", {
            to: otherUser.email,
            subject: `Consultation Status Update: ${body.status}`,
            html: `
              <html>
                <body style="font-family: Arial, sans-serif;">
                  <h2>Consultation Status Changed</h2>
                  <p>Your consultation scheduled for ${timeStr} has been ${body.status}.</p>
                  ${body.meetingLink ? `<p><a href="${body.meetingLink}">Join Meeting</a></p>` : ""}
                </body>
              </html>
            `,
          });
          logger.info({ id, otherUserEmail: otherUser.email }, "Status update email queued");
        } catch (error: any) {
          logger.error({ error: error.message, id }, "Failed to send status update email");
        }
      } else {
        logger.warn({ id, otherUserId }, "Other user not found for notification");
      }
    }

    res.json(updated);
  })
);

// Clear history (delete completed and cancelled consultations for the user)
router.delete(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    await db.delete(consultations).where(
      and(
        user.role === "lawyer"
          ? eq(consultations.lawyerId, user.userId)
          : eq(consultations.userId, user.userId),
        or(
          eq(consultations.status, "completed"),
          eq(consultations.status, "cancelled")
        )
      )
    );

    res.json({ message: "Consultation history cleared" });
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
    if (consultation.lawyerId !== user.userId && consultation.userId !== user.userId) {
      throw new AppError(403, "Access denied");
    }

    // Notify other party before deletion
    const otherUserId = user.userId === consultation.lawyerId ? consultation.userId : consultation.lawyerId;
    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
    });

    if (otherUser) {
      try {
        await enqueueJob(user.userId, "email", {
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

    // Hard delete
    await db.delete(consultations).where(eq(consultations.id, id));

    res.json({ message: "Consultation deleted" });
  })
);

export default router;
