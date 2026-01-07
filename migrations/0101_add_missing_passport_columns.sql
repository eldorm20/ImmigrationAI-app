ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "encrypted_passport" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "encrypted_dob" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "encrypted_passport" text;
