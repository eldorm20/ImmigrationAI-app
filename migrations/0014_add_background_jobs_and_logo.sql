-- Migration to add background_jobs table and fix companies.logo column
-- This ensures the new DB-backed queue system works correctly

-- 1. Create background_jobs table
CREATE TABLE IF NOT EXISTS "background_jobs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255),
    "type" varchar(50) NOT NULL,
    "status" varchar(50) DEFAULT 'pending' NOT NULL,
    "payload" jsonb,
    "result" jsonb,
    "error" text,
    "progress" integer DEFAULT 0,
    "started_at" timestamp,
    "completed_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Ensure indices for background_jobs
CREATE INDEX IF NOT EXISTS "background_jobs_user_id_idx" ON "background_jobs" ("user_id");
CREATE INDEX IF NOT EXISTS "background_jobs_status_idx" ON "background_jobs" ("status");
CREATE INDEX IF NOT EXISTS "background_jobs_type_idx" ON "background_jobs" ("type");

-- 3. Ensure companies table has logo column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo') THEN
            ALTER TABLE "companies" ADD COLUMN "logo" text;
        END IF;
    END IF;
END $$;
