-- Add metadata column to users table for subscription and other data
ALTER TABLE users ADD COLUMN metadata jsonb DEFAULT NULL;
