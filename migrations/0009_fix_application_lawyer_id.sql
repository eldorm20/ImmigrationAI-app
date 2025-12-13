-- Migration: Ensure applications.lawyer_id exists (idempotent)
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "lawyer_id" varchar(255);
ALTER TABLE "applications" ADD CONSTRAINT IF NOT EXISTS "applications_lawyer_id_users_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "users" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "applications_lawyer_id_idx" ON "applications" USING btree ("lawyer_id");

-- No backfill required for now
