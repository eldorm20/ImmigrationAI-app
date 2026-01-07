import express from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { corsMiddleware, helmetMiddleware, apiLimiter } from "./middleware/security";
import { requestLogger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./lib/logger";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { testConnection } from "./db";
import { checkRedisConnection, closeRedis } from "./lib/redis";
import { runMigrationsIfNeeded } from "./lib/runMigrations";
import { setupSocketIO } from "./lib/socket";
import { setupVideoSignaling } from "./routes/video";
import { probeOllamaEndpoint } from "./lib/ollama";
import { isStripeAvailable } from "./lib/subscription";
import { ensureErpTablesExist, ensureResearchDataExists } from "./lib/db-init";
import { startReminderScheduler } from "./lib/reminder-scheduler";
import { startQueueWorker } from "./lib/queue";

import "dotenv/config";

const app = express();
const httpServer = createServer(app);

// Startup Log to verify deployment version
console.log("-----------------------------------------");
console.log(`STARTING DEPLOYMENT VERSION: ${process.env.RAILWAY_GIT_COMMIT_SHA || "Unknown (Development/Latest)"}`);
console.log("-----------------------------------------");

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ============================================
// FIX #1: RAILWAY PROXY & CORS HEADERS
// ============================================
// Use numeric trust proxy value to safely trust Railway's reverse proxy
// See: https://expressjs.com/en/guide/behind-proxies.html
app.set("trust proxy", 1); // Railway uses one proxy
app.disable("x-powered-by");

// ============================================
// FIX #2: CORS MIDDLEWARE FIRST
// ============================================
app.use(corsMiddleware);
app.options("*", corsMiddleware);

// Helmet with Railway-safe settings
app.use(helmetMiddleware);

app.use(cookieParser());

// ============================================
// FIX #3: Body parsing with proper limits
// ============================================
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Correlation ID middleware
import { correlationId } from "./middleware/errorHandler";
app.use(correlationId);

// ============================================
// FIX #4: HEALTH CHECK ENDPOINT (EARLY)
// ============================================
app.get("/health", async (_req, res) => {
  try {
    const dbConnected = await testConnection();
    const redisConnected = await checkRedisConnection();

    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: dbConnected ? "connected" : "disconnected",
      redis: redisConnected ? "connected" : "disconnected",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Service check failed",
    });
  }
});

// ============================================
// FIX #5: Graceful error handling for DB
// ============================================
(async () => {
  try {
    // Test database connection with retry
    let dbConnected = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!dbConnected && attempts < maxAttempts) {
      try {
        dbConnected = await testConnection();
        if (dbConnected) {
          logger.info("Database connected successfully");
          break;
        }
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          logger.warn(`DB connection attempt ${attempts} failed, retrying...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    if (!dbConnected) {
      logger.error("Database connection failed after retries");
      if (process.env.NODE_ENV !== "production") {
        process.exit(1);
      } else {
        logger.warn("Starting in degraded mode without database");
      }
    }

    // Check Redis connection
    const redisConnected = await checkRedisConnection();
    if (!redisConnected) {
      logger.warn("Redis not connected - caching disabled");
    }

    // Probe LOCAL AI (Ollama) endpoint if configured so we log early
    let aiProviderAvailable = false;
    if (process.env.LOCAL_AI_URL) {
      try {
        const aiProbe = await probeOllamaEndpoint(process.env.LOCAL_AI_URL, process.env.OLLAMA_MODEL, 3000);
        if (aiProbe.reachable) {
          logger.info({ url: process.env.LOCAL_AI_URL, model: process.env.OLLAMA_MODEL, status: aiProbe.status }, "✅ Local AI provider (Ollama) reachable");
          aiProviderAvailable = true;
        } else {
          logger.error({ url: process.env.LOCAL_AI_URL, reason: aiProbe.reason }, "❌ Local AI provider (Ollama) NOT reachable - AI features will fail");
        }
      } catch (err) {
        logger.error({ err }, "❌ Error probing local AI provider - AI features will fail");
      }
    } else if (process.env.HUGGINGFACE_API_TOKEN && process.env.HF_MODEL) {
      logger.info({ model: process.env.HF_MODEL }, "✅ HuggingFace configured as AI provider fallback");
      aiProviderAvailable = true;
    } else {
      logger.error("❌ CRITICAL: No AI provider configured! Set either LOCAL_AI_URL (Ollama) or HUGGINGFACE_API_TOKEN + HF_MODEL");
    }

    if (!aiProviderAvailable && process.env.NODE_ENV === "production") {
      logger.error("AI provider unavailable in production - some features will not work");
    }

    // Probe Stripe availability
    try {
      const stripeOk = await isStripeAvailable();
      if (stripeOk) {
        logger.info("Stripe client initialized");
      } else {
        logger.warn("Stripe not configured or failed to initialize. Payments/subscriptions are disabled.");
      }
    } catch (err) {
      logger.warn({ err }, "Error probing Stripe availability");
    }

    // Optionally run migrations automatically in production if enabled.
    // Set `AUTO_RUN_MIGRATIONS=true` in Railway project variables to enable.
    try {
      await runMigrationsIfNeeded();
      await ensureErpTablesExist();
      await ensureResearchDataExists(); // Auto-seed research/news data
      startReminderScheduler(); // Start automated reminders
      startQueueWorker(); // Start DB background worker
    } catch (err) {
      logger.error({ err }, "Auto-run migrations or worker startup failed");
      // continue startup; migrations failure might be transient but we want the app to start for debugging
    }

    // ============================================
    // Setup Socket.IO FIRST (before routes)
    // ============================================
    // Socket.IO must be initialized on httpServer before routes
    // so it can handle /socket.io/* requests before the API middleware
    try {
      const io = setupSocketIO(httpServer);
      app.set("io", io);
      setupVideoSignaling(io);
      logger.info("Socket.IO messaging server initialized");
    } catch (err) {
      logger.error({ err }, "Failed to setup Socket.IO");
    }

    // Register API routes after Socket.IO
    // registerRoutes expects the Express `app` instance (not the HTTP server)
    await registerRoutes(app);

    // ============================================
    // FIX #6: Serve static assets (after routes)
    // ============================================
    if (process.env.NODE_ENV === "production") {
      try {
        // Ensure uploads directory exists for local storage fallback
        try {
          const uploadsDir = path.resolve(process.cwd(), "uploads");
          fs.mkdirSync(uploadsDir, { recursive: true });
          try {
            fs.chmodSync(uploadsDir, 0o755);
          } catch (_) {
            // ignore chmod failures on some platforms
          }
          logger.info({ uploadsDir }, "Uploads directory ensured");
        } catch (err) {
          logger.warn({ err }, "Could not ensure uploads directory");
        }

        serveStatic(app);
      } catch (err) {
        logger.error({ err }, "Failed to setup static file serving");
      }
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ============================================
    // FIX #7: Error handling middleware (LAST)
    // ============================================
    app.use(errorHandler);

    // ============================================
    // FIX #8: Start server with proper binding
    // ============================================
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.env.HOST || "0.0.0.0";

    httpServer.listen(port, host, () => {
      // Log environment status for debugging
      const missingEnvVars = [];
      if (!process.env.AWS_ACCESS_KEY_ID && !process.env.S3_ENDPOINT) {
        missingEnvVars.push("AWS_ACCESS_KEY_ID or S3_ENDPOINT (S3/file upload will fail)");
      }
      if (!process.env.S3_BUCKET && !process.env.AWS_S3_BUCKET) {
        missingEnvVars.push("S3_BUCKET or AWS_S3_BUCKET (S3/file upload will fail)");
      }
      if (!process.env.STRIPE_SECRET_KEY) {
        missingEnvVars.push("STRIPE_SECRET_KEY (Stripe payments disabled)");
      }

      if (missingEnvVars.length > 0) {
        logger.warn(
          { missingEnvVars },
          "⚠️  Missing environment variables: " + missingEnvVars.join(", ")
        );
      }

      logger.info({
        port,
        host,
        env: process.env.NODE_ENV,
        allowedOrigins: process.env.ALLOWED_ORIGINS || "localhost",
      }, "Server started successfully");
    });

    // ============================================
    // FIX #9: Graceful shutdown
    // ============================================
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);

      httpServer.close(async () => {
        try {
          logger.info("Queues closed (No action needed)");
        } catch (err) {
          logger.error({ err }, "Error closing queues");
        }

        try {
          await closeRedis();
          logger.info("Redis connection closed");
        } catch (err) {
          logger.error({ err }, "Error closing Redis");
        }

        logger.info("HTTP server closed");
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (error) {
    console.error("CRITICAL: Failed to start server:", error);
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
})();

// ============================================
// FIX #10: Catch unhandled errors
// ============================================
process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled rejection");
  process.exit(1);
});

export { app, httpServer };