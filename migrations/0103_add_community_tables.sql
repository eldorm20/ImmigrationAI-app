CREATE TABLE IF NOT EXISTS "community_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"images" jsonb,
	"status" varchar(50) DEFAULT 'published' NOT NULL,
	"likes" integer DEFAULT 0,
	"views" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "community_posts_user_id_idx" ON "community_posts" ("user_id");
CREATE INDEX IF NOT EXISTS "community_posts_category_idx" ON "community_posts" ("category");
CREATE INDEX IF NOT EXISTS "community_posts_status_idx" ON "community_posts" ("status");

CREATE TABLE IF NOT EXISTS "community_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar(255) NOT NULL REFERENCES "community_posts"("id") ON DELETE cascade,
	"user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"parent_id" varchar(255),
	"content" text NOT NULL,
	"likes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
