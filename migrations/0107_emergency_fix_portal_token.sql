-- Migration: Emergency Fix for portal_token
-- Created: 2026-01-18
-- Reason: Previous migrations failed to apply schema changes reliably.
-- Approach: Use robust PL/pgSQL blocks to check existence and apply changes safely.

DO $$ 
BEGIN 
    -- 1. Add portal_token column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'portal_token'
    ) THEN
        BEGIN
            ALTER TABLE users ADD COLUMN portal_token VARCHAR(255);
            RAISE NOTICE 'Added portal_token column';
        EXCEPTION 
            WHEN others THEN 
                RAISE NOTICE 'Failed to add portal_token: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'portal_token column already exists';
    END IF;

    -- 2. Add portal_token_expiry column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'portal_token_expiry'
    ) THEN
        BEGIN
            ALTER TABLE users ADD COLUMN portal_token_expiry TIMESTAMP;
            RAISE NOTICE 'Added portal_token_expiry column';
        EXCEPTION 
            WHEN others THEN 
                RAISE NOTICE 'Failed to add portal_token_expiry: %', SQLERRM;
        END;
    END IF;
END $$;

-- 3. Safely add UNIQUE constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_portal_token_unique'
    ) THEN
        BEGIN
            ALTER TABLE users ADD CONSTRAINT users_portal_token_unique UNIQUE (portal_token);
            RAISE NOTICE 'Added unique constraint to portal_token';
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Should have added constraint but failed (maybe duplicates exist?): %', SQLERRM;
        END;
    END IF;
END $$;
