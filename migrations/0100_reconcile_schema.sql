-- Reconciliation Migration for Phase 5 & 6
-- This script ensures all tables, columns, and enums exist to match /shared/schema.ts

DO $$ 
BEGIN
    -- Enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_stage') THEN
        CREATE TYPE lead_stage AS ENUM ('inquiry', 'contacted', 'consultation_scheduled', 'consultation_completed', 'proposal_sent', 'converted', 'lost');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deadline_type') THEN
        CREATE TYPE deadline_type AS ENUM ('visa_expiry', 'filing_deadline', 'rfe_response', 'document_submission', 'appointment', 'payment_due', 'custom');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_type') THEN
        CREATE TYPE reminder_type AS ENUM ('deadline', 'appointment', 'follow_up', 'document_request', 'payment', 'custom');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'archived');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'research_category') THEN
        CREATE TYPE research_category AS ENUM ('visa', 'cases', 'regulations', 'guides', 'other');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'research_type') THEN
        CREATE TYPE research_type AS ENUM ('guide', 'case_study', 'regulation', 'faq', 'blog', 'masterclass');
    END IF;

    -- Enum Value Updates
    BEGIN
        ALTER TYPE "application_status" ADD VALUE 'pending';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;

    BEGIN
        ALTER TYPE "consultation_status" ADD VALUE 'accepted';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "leads" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lawyer_id" varchar(255),
    "first_name" varchar(100) NOT NULL,
    "last_name" varchar(100),
    "email" varchar(255) NOT NULL,
    "phone" varchar(20),
    "country" varchar(2),
    "visa_interest" varchar(100),
    "stage" "lead_stage" DEFAULT 'inquiry' NOT NULL,
    "source" varchar(100),
    "referred_by" varchar(255),
    "notes" text,
    "estimated_value" numeric(10, 2),
    "next_follow_up" timestamp,
    "converted_to_application_id" varchar(255),
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "deadlines" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "application_id" varchar(255),
    "user_id" varchar(255),
    "lawyer_id" varchar(255),
    "type" "deadline_type" NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text,
    "due_date" timestamp NOT NULL,
    "reminder_days" integer DEFAULT 7,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp,
    "priority" "task_priority" DEFAULT 'medium' NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "time_entries" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "application_id" varchar(255),
    "client_id" varchar(255),
    "invoice_id" varchar(255),
    "description" text NOT NULL,
    "minutes" integer NOT NULL,
    "hourly_rate" numeric(10, 2),
    "is_billable" boolean DEFAULT true NOT NULL,
    "is_billed" boolean DEFAULT false NOT NULL,
    "date" timestamp DEFAULT now() NOT NULL,
    "category" varchar(100),
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reminders" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "application_id" varchar(255),
    "deadline_id" varchar(255),
    "type" "reminder_type" NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text,
    "scheduled_for" timestamp NOT NULL,
    "sent_at" timestamp,
    "is_sent" boolean DEFAULT false NOT NULL,
    "channel" varchar(50) DEFAULT 'email',
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lawyer_id" varchar(255) NOT NULL,
    "application_id" varchar(255),
    "title" varchar(255) NOT NULL,
    "description" text,
    "status" "task_status" DEFAULT 'pending' NOT NULL,
    "priority" "task_priority" DEFAULT 'medium' NOT NULL,
    "due_date" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoices" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lawyer_id" varchar(255) NOT NULL,
    "applicant_id" varchar(255) NOT NULL,
    "application_id" varchar(255),
    "amount" numeric(10, 2) NOT NULL,
    "currency" varchar(3) DEFAULT 'USD',
    "status" "invoice_status" DEFAULT 'draft' NOT NULL,
    "due_date" timestamp,
    "items" jsonb,
    "tax_rate" numeric(5, 2) DEFAULT '0',
    "legal_entity_name" varchar(255),
    "inn" varchar(20),
    "oked" varchar(10),
    "mfo" varchar(10),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "companies" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "industry" varchar(100),
    "size" varchar(50),
    "description" text,
    "website" varchar(255),
    "logo" text,
    "subdomain" varchar(63) UNIQUE,
    "branding_config" jsonb,
    "is_active" boolean DEFAULT true,
    "is_verified" boolean DEFAULT false,
    "billing_email" varchar(255),
    "stripe_customer_id" varchar(255),
    "subscription_status" varchar(50),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "jobs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "company_id" varchar(255) NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text NOT NULL,
    "location" varchar(100) NOT NULL,
    "type" varchar(50) DEFAULT 'full-time' NOT NULL,
    "salary_range" varchar(100),
    "visa_sponsorship" boolean DEFAULT true,
    "requirements" jsonb,
    "status" varchar(50) DEFAULT 'active',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "document_checklists" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "visa_type" varchar(100) NOT NULL,
    "country" varchar(2) NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "items" jsonb NOT NULL,
    "is_template" boolean DEFAULT true NOT NULL,
    "created_by" varchar(255),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "checklist_items" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "application_id" varchar(255) NOT NULL,
    "checklist_id" varchar(255),
    "name" varchar(255) NOT NULL,
    "category" varchar(100),
    "is_required" boolean DEFAULT true NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "document_id" varchar(255),
    "completed_at" timestamp,
    "completed_by" varchar(255),
    "notes" text,
    "order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS "leads_lawyer_id_idx" ON "leads" ("lawyer_id");
CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads" ("stage");
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" ("email");
CREATE INDEX IF NOT EXISTS "deadlines_application_id_idx" ON "deadlines" ("application_id");
CREATE INDEX IF NOT EXISTS "deadlines_due_date_idx" ON "deadlines" ("due_date");
CREATE INDEX IF NOT EXISTS "time_entries_user_id_idx" ON "time_entries" ("user_id");
CREATE INDEX IF NOT EXISTS "time_entries_invoice_id_idx" ON "time_entries" ("invoice_id");

-- Column Fixes (Handling potential existing tables from partial migrations)
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "lawyer_id" varchar(255);
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "encrypted_passport" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "encrypted_dob" text;

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "s3_key" varchar(500);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "ocr_data" jsonb;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "ai_analysis" jsonb;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" varchar(20);

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2) DEFAULT '0';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo" text;
ALTER TABLE "research_articles" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Interviews
CREATE TABLE IF NOT EXISTS "interviews" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "title" text NOT NULL,
    "type" text DEFAULT 'mock_interview' NOT NULL,
    "status" text DEFAULT 'in_progress' NOT NULL,
    "duration_seconds" integer DEFAULT 0,
    "transcript" jsonb,
    "feedback" jsonb,
    "recording_url" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Research Articles (if missing)
CREATE TABLE IF NOT EXISTS "research_articles" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" varchar(255) NOT NULL,
    "slug" varchar(255) UNIQUE NOT NULL,
    "summary" text,
    "body" text,
    "category" "research_category" DEFAULT 'visa' NOT NULL,
    "type" "research_type" DEFAULT 'guide' NOT NULL,
    "language" varchar(5) DEFAULT 'en' NOT NULL,
    "tags" jsonb,
    "source" varchar(255),
    "source_url" varchar(500),
    "published_at" timestamp,
    "is_published" boolean DEFAULT true NOT NULL,
    "created_by_user_id" varchar(255),
    "updated_by_user_id" varchar(255),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Blockchain & Dataset
CREATE TABLE IF NOT EXISTS "verification_chain" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "document_id" varchar(255) NOT NULL,
    "file_hash" varchar(64) NOT NULL,
    "previous_hash" varchar(64) NOT NULL,
    "block_hash" varchar(64) NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_dataset" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "query" text NOT NULL,
    "response" text NOT NULL,
    "rating" integer,
    "category" varchar(50),
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
