-- Migration: Add advanced features (Deadlines, Checklists, Portal)
-- Created: 2026-01-18

-- 1. DEADLINES TABLE UPDATES
-- The 'deadlines' table might already exist. We need to ensure it has all columns we need.
-- Existing columns usually are: id, user_id (client), lawyer_id, application_id, type, title, description, due_date, is_completed, priority.
-- We need to add: status, reminders_sent, last_reminder_at, notes, metadata (if missing).

DO $$ 
BEGIN 
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deadlines' AND column_name='status') THEN
        ALTER TABLE deadlines ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deadlines' AND column_name='reminders_sent') THEN
        ALTER TABLE deadlines ADD COLUMN reminders_sent INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deadlines' AND column_name='last_reminder_at') THEN
        ALTER TABLE deadlines ADD COLUMN last_reminder_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deadlines' AND column_name='notes') THEN
        ALTER TABLE deadlines ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deadlines' AND column_name='metadata') THEN
        ALTER TABLE deadlines ADD COLUMN metadata JSONB;
    END IF;
END $$;


-- 2. CLIENT SELF-SERVICE PORTAL
-- Add portal_token columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token_expiry TIMESTAMP;


-- 3. AI DOCUMENT COLLECTOR (Smart Checklists)
-- Using 'smart_checklists' and 'smart_checklist_items' to avoid conflict with legacy tables

CREATE TABLE IF NOT EXISTS smart_checklists (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visa_type VARCHAR(100),
    is_ai_generated BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    reminder_count INTEGER DEFAULT 0,
    validation_rules JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS smart_checklists_user_id_idx ON smart_checklists(user_id);
CREATE INDEX IF NOT EXISTS smart_checklists_lawyer_id_idx ON smart_checklists(lawyer_id);

CREATE TABLE IF NOT EXISTS smart_checklist_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id VARCHAR NOT NULL REFERENCES smart_checklists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    is_required BOOLEAN DEFAULT TRUE,
    validation_rule TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    document_url TEXT,
    notes TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS smart_checklist_items_checklist_id_idx ON smart_checklist_items(checklist_id);
