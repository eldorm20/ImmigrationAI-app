import Queue from "bull";
import { logger } from "./logger";
import { sendEmail } from "./email";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Email queue
export const emailQueue = new Queue("emails", {
  redis: redisUrl,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Document analysis queue
export const documentQueue = new Queue("documents", {
  redis: redisUrl,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Notification queue
export const notificationQueue = new Queue("notifications", {
  redis: redisUrl,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  },
});

// Setup processors
emailQueue.process(async (job) => {
  try {
    const { to, subject, html } = job.data;
    await sendEmail({ to, subject, html });
    logger.info({ to }, "Email job completed");
  } catch (error) {
    logger.error({ error }, "Email job failed");
    throw error;
  }
});

documentQueue.process(async (job) => {
  try {
    const { documentId } = job.data;
    logger.info({ documentId }, "Document analysis job started");
    // Process document analysis
  } catch (error) {
    logger.error({ error }, "Document job failed");
    throw error;
  }
});

notificationQueue.process(async (job) => {
  try {
    const { userId, message } = job.data;
    logger.info({ userId }, "Notification job processed");
  } catch (error) {
    logger.error({ error }, "Notification job failed");
    throw error;
  }
});

// Queue event listeners
emailQueue.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, "Email queue job failed");
});

documentQueue.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, "Document queue job failed");
});

notificationQueue.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, "Notification queue job failed");
});

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  try {
    await Promise.all([
      emailQueue.close(),
      documentQueue.close(),
      notificationQueue.close(),
    ]);
    logger.info("All queues closed");
  } catch (error) {
    logger.error({ error }, "Error closing queues");
  }
}