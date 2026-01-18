-- Migration: Fix missing portal_token columns
-- Created: 2026-01-18
-- Reason: Migration 0105 failed to apply these columns in production environment

-- Safely add portal_token to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token_expiry TIMESTAMP;

-- Ensure smart_checklists tables exist (re-run safety check)
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
