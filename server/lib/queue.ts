
import { db } from "../db";
import { backgroundJobs, type InsertBackgroundJob } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";

// We use dynamic imports for handlers to avoid circular dependencies (e.g. ai.ts imports queue.ts)

// Simple in-memory lock
let isProcessing = false;

export type JobType = "document_generation" | "document_review" | "notification" | "email";

export async function enqueueJob(userId: string, type: JobType, payload: any) {
  const [job] = await db.insert(backgroundJobs).values({
    userId,
    type,
    payload,
    status: "pending",
  }).returning();

  // Trigger processing asynchronously
  processJobs();

  return job;
}

export async function getJob(jobId: string) {
  const [job] = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, jobId));
  return job;
}

export async function processJobs() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Pick 1 pending job (FIFO)
    const pendingJobs = await db.select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.status, "pending"))
      .orderBy(backgroundJobs.createdAt)
      .limit(1);

    if (pendingJobs.length === 0) {
      isProcessing = false;
      return;
    }

    const job = pendingJobs[0];

    // Mark as processing
    await db.update(backgroundJobs)
      .set({ status: "processing", startedAt: new Date(), progress: 0 })
      .where(eq(backgroundJobs.id, job.id));

    try {
      let result;

      // Dispatch based on type
      if (job.type === "document_generation") {
        const ai = await import("./ai");
        const { documentType, userDetails, visaType } = job.payload as any;
        const generatedDoc = await ai.generateDocument(documentType, visaType, userDetails);
        result = { document: generatedDoc };

      } else if (job.type === "document_review") {
        const ai = await import("./ai");
        const { content, documentType } = job.payload as any;
        result = await ai.reviewDocument(content, documentType);

      } else if (job.type === "notification") {
        const { userId, message } = job.payload as any;
        // Simulate notification processing or call notification service
        console.log(`Sending notification to ${userId}: ${message}`);
        result = { sent: true };

      } else if (job.type === "email") {
        const email = await import("./email");
        const { to, subject, html } = job.payload as any;
        await email.sendEmail({ to, subject, html });
        result = { sent: true };

      } else {
        console.warn(`Unknown job type: ${job.type}`);
        result = { error: "Unknown job type" };
      }

      // Mark completed
      await db.update(backgroundJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          result: result,
          progress: 100
        })
        .where(eq(backgroundJobs.id, job.id));

    } catch (err: any) {
      console.error(`Job ${job.id} failed:`, err);
      await db.update(backgroundJobs)
        .set({
          status: "failed",
          error: err.message || "Unknown error",
          completedAt: new Date()
        })
        .where(eq(backgroundJobs.id, job.id));
    }

    isProcessing = false;
    // Chain next processing tick
    processJobs();

  } catch (err) {
    console.error("Queue Worker Error:", err);
    isProcessing = false;
  }
}

export function startQueueWorker() {
  console.log("Starting DB Queue Worker...");
  setInterval(() => {
    processJobs().catch(err => {
      // Suppress relation error until table is created
      if (err.message?.includes('relation "background_jobs"')) return;
      console.error("Queue Worker Poll Error:", err);
    });
  }, 5000);
}

// Export legacy queue objects if needed for compatibility (optional, but better to refactor consumers)
// For now, we assume we will refactor the consumers.