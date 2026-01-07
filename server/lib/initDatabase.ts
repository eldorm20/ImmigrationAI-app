import { Pool } from "pg";
import { logger } from "./logger";

// Initial schema creation SQL - ensures database has required structure
const INIT_SCHEMA_SQL = `
-- Create ENUMs
CREATE TYPE IF NOT EXISTS "public"."application_status" AS ENUM('new', 'in_progress', 'pending_documents', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled');
CREATE TYPE IF NOT EXISTS "public"."consultation_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE IF NOT EXISTS "public"."payment_provider" AS ENUM('stripe', 'payme', 'click');
CREATE TYPE IF NOT EXISTS "public"."payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE IF NOT EXISTS "public"."user_role" AS ENUM('admin', 'lawyer', 'applicant');

-- Create users table
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL UNIQUE,
    "hashed_password" text NOT NULL,
    "role" "user_role" DEFAULT 'applicant' NOT NULL,
    "email_verified" boolean DEFAULT false NOT NULL,
    "email_verification_token" varchar(255),
    "email_verification_expires" timestamp,
    "password_reset_token" varchar(255),
    "password_reset_expires" timestamp,
    "first_name" varchar(100),
    "last_name" varchar(100),
    "phone" varchar(20),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS "public"."refresh_tokens" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "token" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "revoked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255),
    "action" varchar(100) NOT NULL,
    "resource_type" varchar(50),
    "resource_id" varchar(255),
    "metadata" jsonb,
    "ip_address" varchar(45),
    "user_agent" text,
    "timestamp" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

-- Create applications table
CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "visa_type" varchar(100) NOT NULL,
    "country" varchar(100) NOT NULL,
    "status" "application_status" DEFAULT 'new' NOT NULL,
    "fee" numeric(10, 2) DEFAULT '0',
    "notes" text,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS "public"."consultations" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "lawyer_id" varchar(255) NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text,
    "status" "consultation_status" DEFAULT 'scheduled' NOT NULL,
    "scheduled_at" timestamp,
    "completed_at" timestamp,
    "notes" text,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "consultations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "consultations_lawyer_id_users_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

-- Create documents table
CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "application_id" varchar(255),
    "title" varchar(255) NOT NULL,
    "file_url" text NOT NULL,
    "file_size" integer,
    "mime_type" varchar(100),
    "status" varchar(50) DEFAULT 'pending' NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "sender_id" varchar(255) NOT NULL,
    "recipient_id" varchar(255) NOT NULL,
    "content" text NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "application_id" varchar(255),
    "amount" numeric(10, 2) NOT NULL,
    "currency" varchar(3) DEFAULT 'USD' NOT NULL,
    "status" "payment_status" DEFAULT 'pending' NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "provider_transaction_id" varchar(255),
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "payments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action
);

-- Create research_articles table
CREATE TABLE IF NOT EXISTS "public"."research_articles" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" varchar(255) NOT NULL,
    "content" text NOT NULL,
    "author" varchar(255),
    "tags" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "public"."users" ("email");
CREATE INDEX IF NOT EXISTS "idx_applications_user_id" ON "public"."applications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_consultations_user_id" ON "public"."consultations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_consultations_lawyer_id" ON "public"."consultations" ("lawyer_id");
CREATE INDEX IF NOT EXISTS "idx_documents_user_id" ON "public"."documents" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "public"."refresh_tokens" ("user_id");
`;

export async function initializeDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set, skipping database initialization");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    logger.info("Initializing database schema...");
    await pool.query(INIT_SCHEMA_SQL);
    logger.info("✓ Database schema initialized successfully");
  } catch (err) {
    logger.error(
      { err },
      "✗ Database initialization failed (tables may already exist or permission denied)"
    );
    // Continue - tables might already exist
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  }
}
