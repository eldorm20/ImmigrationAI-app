import { Router } from "express";
import { logger } from "../lib/logger";
import { authenticate } from "../middleware/auth";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Diagnostic endpoint to help debug issues
router.get("/errors", (req, res) => {
  const errors = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT || "5000",
      APP_URL: process.env.APP_URL || "not set",
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "not set",
    },
    storage: {
      S3_BUCKET: process.env.S3_BUCKET || "not set",
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || "not set",
      S3_ENDPOINT: process.env.S3_ENDPOINT ? "configured" : "not set",
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "configured" : "not set",
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "configured" : "not set",
    },
    ai: {
      LOCAL_AI_URL: process.env.LOCAL_AI_URL || "not set",
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || "not set",
      HUGGINGFACE_API_TOKEN: process.env.HUGGINGFACE_API_TOKEN ? "configured" : "not set",
      HF_MODEL: process.env.HF_MODEL || "not set",
    },
    stripe: {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "configured" : "not set",
    },
    redis: {
      REDIS_URL: process.env.REDIS_URL ? "configured" : "not set",
    },
    database: {
      DATABASE_URL: process.env.DATABASE_URL ? "configured" : "not set",
    },
    issues: [] as string[],
  };

  // Check for common issues
  if (!process.env.S3_BUCKET && !process.env.AWS_S3_BUCKET) {
    errors.issues.push(
      "❌ No S3 bucket configured (S3_BUCKET or AWS_S3_BUCKET). Document uploads will use local fallback or fail."
    );
  }

  if (!process.env.LOCAL_AI_URL && !process.env.HUGGINGFACE_API_TOKEN) {
    errors.issues.push(
      "❌ No AI provider configured. Set LOCAL_AI_URL (Ollama) or HUGGINGFACE_API_TOKEN + HF_MODEL"
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    errors.issues.push("⚠️  No Stripe key configured. Payments disabled.");
  }

  if (!process.env.APP_URL) {
    errors.issues.push(
      "⚠️  APP_URL not set. CORS and redirect URLs may not work correctly."
    );
  }

  if (!process.env.ALLOWED_ORIGINS) {
    errors.issues.push(
      "⚠️  ALLOWED_ORIGINS not set. Using APP_URL or localhost only."
    );
  }

  res.json(errors);
});

router.get("/socket-config", (req, res) => {
  const allowedOrigins =
    process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) ||
    (process.env.APP_URL ? [process.env.APP_URL] : ["http://localhost:5000", "http://localhost:3000"]);

  res.json({
    timestamp: new Date().toISOString(),
    socketIOConfig: {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    },
    allowedOrigins,
    APP_URL: process.env.APP_URL || "not set",
  });
});

// Debug: list applications table columns
router.get(
  "/schema/applications",
  authenticate,
  async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'applications' ORDER BY ordinal_position`);
      // Drizzle returns { rows } in many drivers
      const rows = (result as any).rows || result;
      res.json({ columns: rows });
    } catch (err) {
      logger.error({ err }, 'Failed to query information_schema for applications columns');
      res.status(500).json({ error: String(err) });
    }
  }
);

// Debug: run one-off SQL to ensure lawyer_id exists (AUTHENTICATED ONLY)
router.post(
  "/run/ensure-lawyercol",
  authenticate,
  async (req, res) => {
    try {
      await db.execute(sql`
        ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "lawyer_id" varchar(255);
        ALTER TABLE "applications" ADD CONSTRAINT IF NOT EXISTS "applications_lawyer_id_users_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "users" ("id") ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS "applications_lawyer_id_idx" ON "applications" USING btree ("lawyer_id");
      `);
      res.json({ success: true, message: "lawyer_id column ensured" });
    } catch (err) {
      logger.error({ err }, "Failed to ensure lawyer_id column via debug endpoint");
      res.status(500).json({ error: String(err) });
    }
  }
);

// Debug: check login credentials (for diagnosing 400/401 errors)
router.post(
  "/check-login",
  async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.json({
          success: false,
          step: "validation",
          message: "Email and password are required",
        });
      }

      // Import the necessary functions
      const { normalizeEmail } = await import("../middleware/security");
      const { verifyPassword } = await import("../lib/auth");
      const { eq } = await import("drizzle-orm");
      const { users } = await import("@shared/schema");

      const normalizedEmail = normalizeEmail(email);

      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      if (!user) {
        return res.json({
          success: false,
          step: "user_lookup",
          message: "No user found with this email",
          emailSearched: normalizedEmail,
        });
      }

      // Check password
      const hasPassword = Boolean(user.hashedPassword);
      if (!hasPassword) {
        return res.json({
          success: false,
          step: "password_check",
          message: "User has no password set",
          userId: user.id,
          email: user.email,
          role: user.role,
        });
      }

      const isPasswordValid = await verifyPassword(user.hashedPassword, password);

      if (!isPasswordValid) {
        return res.json({
          success: false,
          step: "password_verify",
          message: "Password does not match",
          userId: user.id,
          email: user.email,
          role: user.role,
          hashedPasswordLength: user.hashedPassword?.length || 0,
        });
      }

      // All checks passed
      return res.json({
        success: true,
        step: "complete",
        message: "Login credentials are valid",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
        },
      });
    } catch (err: any) {
      logger.error({ err }, "Debug check-login failed");
      return res.status(500).json({
        success: false,
        step: "error",
        message: err?.message || String(err),
      });
    }
  }
);

// Public repair endpoint (temporary) to fix production database
router.get(
  "/fix-db-schema",
  async (req, res) => {
    try {
      logger.info("Attempting to fix database schema...");

      // Force add lawyer_id column
      await db.execute(sql`
        ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "lawyer_id" text;
        
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE "applications" ADD CONSTRAINT "applications_lawyer_id_users_id_fk" 
            FOREIGN KEY ("lawyer_id") REFERENCES "users" ("id") ON DELETE SET NULL;
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
        END $$;
        
        CREATE INDEX IF NOT EXISTS "applications_lawyer_id_idx" ON "applications" ("lawyer_id");
      `);

      // Verify it exists now
      const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'lawyer_id'
      `);

      const rows = (result as any).rows || result;
      const exists = rows.length > 0;

      res.json({
        success: true,
        message: "Schema repair executed",
        columnExists: exists,
        details: rows
      });
    } catch (err: any) {
      logger.error({ err }, "Schema repair failed");
      res.status(500).json({ error: String(err) });
    }
  }
);

export default router;
