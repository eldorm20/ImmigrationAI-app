-- Ensure s3_key column exists on documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_key varchar(500);
