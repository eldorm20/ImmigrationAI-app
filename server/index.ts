import express from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { corsMiddleware, helmetMiddleware, apiLimiter } from "./middleware/security";
import { requestLogger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./lib/logger";
import cookieParser from "cookie-parser";
import { testConnection } from "./db";
import { checkRedisConnection, closeRedis } from "./lib/redis";
import { closeQueues } from "./lib/queue";
import { runMigrationsIfNeeded } from "./lib/runMigrations";
import { ensureSchemaExists } from "./lib/ensureSchema";
import { initializeDatabase } from "./lib/initDatabase";

import "dotenv/config";

const app = express();
const httpServer = createServer(app);

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

    // Check if database schema exists, run migrations if needed
    try {
      await ensureSchemaExists();
    } catch (err) {
      logger.error({ err }, "Schema initialization failed");
    }

    // Initialize database schema (creates tables if needed)
    try {
      await initializeDatabase();
    } catch (err) {
      logger.error({ err }, "Database initialization failed");
    }

    // Run migrations automatically
    try {
      await runMigrationsIfNeeded();
    } catch (err) {
      logger.error({ err }, "Auto-run migrations failed");
      // continue startup; migrations failure might be transient but we want the app to start for debugging
    }

    // Register API routes first
    // registerRoutes expects the Express `app` instance (not the HTTP server)
    await registerRoutes(app);

    // ============================================
    // FIX #6: Serve static assets (after routes)
    // ============================================
    if (process.env.NODE_ENV === "production") {
      try {
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
          await closeQueues();
          logger.info("Queues closed");
        } catch (err) {
          logger.error({ err }, "Error closing queues");
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