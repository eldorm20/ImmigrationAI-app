-- Migration: Add lawyer_id column to applications table
ALTER TABLE "applications" ADD COLUMN "lawyer_id" varchar(255);
ALTER TABLE "applications" ADD CONSTRAINT "applications_lawyer_id_users_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "applications_lawyer_id_idx" ON "applications" USING btree ("lawyer_id");

-- Backfill: For now, no backfill. New migration ensures column exists.
