-- Migration to add templates table
CREATE TABLE IF NOT EXISTS "templates" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "description" text,
    "category" varchar(50) DEFAULT 'other' NOT NULL,
    "document_type" varchar(100) NOT NULL,
    "visa_type" varchar(100),
    "content" text NOT NULL,
    "placeholders" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "language" varchar(5) DEFAULT 'en' NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "templates_user_id_idx" ON "templates" ("user_id");
CREATE INDEX IF NOT EXISTS "templates_doc_type_idx" ON "templates" ("document_type");
