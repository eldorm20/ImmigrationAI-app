-- Safe migration to add metadata column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "metadata" jsonb DEFAULT NULL;
    END IF;
END $$;
