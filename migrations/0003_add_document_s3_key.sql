-- Add s3_key column to documents table to store internal storage keys
ALTER TABLE documents ADD COLUMN s3_key varchar(500);
