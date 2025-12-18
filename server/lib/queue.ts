import Queue, { Job } from "bull";
import { logger } from "./logger";
import { sendEmail } from "./email";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// In test environment, avoid connecting to Redis. Provide a lightweight mock
// queue implementation so tests don't attempt network connections.
function createMockQueue(name: string) {
  return {
    add: async (job: any) => Promise.resolve({ id: `mock-${name}-${Date.now()}` }),
    process: (_fn: any) => { },
    on: (_ev: any, _fn: any) => { },
    close: async () => Promise.resolve(),
  } as any;
}

export const emailQueue = process.env.NODE_ENV === "test"
  ? createMockQueue("emails")
  : new Queue("emails", {
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

export const documentQueue = process.env.NODE_ENV === "test"
  ? createMockQueue("documents")
  : new Queue("documents", {
    redis: redisUrl,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  });

export const notificationQueue = process.env.NODE_ENV === "test"
  ? createMockQueue("notifications")
  : new Queue("notifications", {
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

// Setup processors and event listeners only when not running tests
if (process.env.NODE_ENV !== "test") {
  // Setup processors
  emailQueue.process(async (job: Job) => {
    try {
      const { to, subject, html } = job.data;
      await sendEmail({ to, subject, html });
      logger.info({ to }, "Email job completed");
    } catch (error) {
      logger.error({ error }, "Email job failed");
      throw error;
    }
  });

  documentQueue.process(async (job: Job) => {
    try {
      const { documentId } = job.data;
      logger.info({ documentId }, "Document analysis job started");
      // Process document analysis
    } catch (error) {
      logger.error({ error }, "Document job failed");
      throw error;
    }
  });

  notificationQueue.process(async (job: Job) => {
    try {
      const { userId, message } = job.data;
      logger.info({ userId }, "Notification job processed");
    } catch (error) {
      logger.error({ error }, "Notification job failed");
      throw error;
    }
  });

  // Queue event listeners
  emailQueue.on("failed", (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, error: err.message }, "Email queue job failed");
  });

  documentQueue.on("failed", (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, error: err.message }, "Document queue job failed");
  });

  notificationQueue.on("failed", (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, error: err.message }, "Notification queue job failed");
  });
}

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