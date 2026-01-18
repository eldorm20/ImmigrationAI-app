-- Migration: Fix portal_token with correct splitters
-- Created: 2026-01-18
-- Reason: Previous migrations were not split correctly and failed as a single block.

ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token VARCHAR(255);

--> statement-breakpoint

ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token_expiry TIMESTAMP;

--> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_portal_token_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_portal_token_unique UNIQUE (portal_token);
    END IF;
END $$;
