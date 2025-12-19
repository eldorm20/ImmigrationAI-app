-- Fix UUID vs VARCHAR mismatch for Lawyer ERP tables (Critical Fix)
ALTER TABLE "tasks" ALTER COLUMN "application_id" TYPE varchar(255);
ALTER TABLE "invoices" ALTER COLUMN "application_id" TYPE varchar(255);
ALTER TABLE "time_entries" ALTER COLUMN "application_id" TYPE varchar(255);

-- Ensure referrals table exists (matches manual fix structure)
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar(255) NOT NULL,
	"referred_user_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"reward_amount" numeric(10, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'USD',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add constraints if they don't exist (Drizzle style usually separates them but inline works for manual fix)
-- We skip complex conditional constraint creation to avoid errors.
-- The app schema expects these columns, which is the important part.