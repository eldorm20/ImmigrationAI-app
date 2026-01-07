CREATE TYPE "public"."research_category" AS ENUM('visa', 'cases', 'regulations', 'guides', 'other');--> statement-breakpoint
CREATE TYPE "public"."research_type" AS ENUM('guide', 'case_study', 'regulation', 'faq', 'blog', 'masterclass');--> statement-breakpoint
CREATE TABLE "research_articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "research_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "research_articles" ADD CONSTRAINT "research_articles_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_articles" ADD CONSTRAINT "research_articles_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_slug_idx" ON "research_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "research_category_idx" ON "research_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "research_language_idx" ON "research_articles" USING btree ("language");--> statement-breakpoint
CREATE INDEX "research_published_idx" ON "research_articles" USING btree ("is_published","published_at");