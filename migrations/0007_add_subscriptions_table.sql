-- Create subscription_status enum
CREATE TYPE IF NOT EXISTS "public"."subscription_status" AS ENUM('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid');--> statement-breakpoint

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider" "public"."payment_provider" NOT NULL DEFAULT 'stripe',
	"provider_subscription_id" varchar(255) NOT NULL,
	"plan_id" varchar(255),
	"status" "public"."subscription_status" NOT NULL DEFAULT 'incomplete',
	"current_period_end" timestamp,
	"metadata" jsonb,
	"last_event_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Indexes
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_provider_subscription_id_idx" ON "subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint

-- Foreign keys
ALTER TABLE "subscriptions" ADD CONSTRAINT IF NOT EXISTS "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Unique constraint for provider subscription id
ALTER TABLE "subscriptions" ADD CONSTRAINT IF NOT EXISTS "subscriptions_provider_sub_unique" UNIQUE("provider_subscription_id");--> statement-breakpoint
