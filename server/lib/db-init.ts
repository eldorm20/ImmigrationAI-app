import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function ensureErpTablesExist() {
  try {
    logger.info("Ensuring ERP tables and enums exist...");

    // 0. Enable pgvector if available
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
      logger.info("✅ pgvector extension ensured");
    } catch (err) {
      logger.warn({ err }, "Notice: Could not enable pgvector extension (might already exist or not supported)");
    }

    // 1. Create Enums if they don't exist
    logger.info("Checking/Creating task_status enum...");
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'archived'); END IF; END $$;`);


    logger.info("Checking/Creating task_priority enum...");
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high'); END IF; END $$;`);

    logger.info("Checking/Creating invoice_status enum...");
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue'); END IF; END $$;`);

    logger.info("Checking/Creating consultation_status enum...");
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_status') THEN CREATE TYPE consultation_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show', 'accepted', 'pending'); END IF; END $$;`);

    logger.info("Checking/Creating lead_stage enum...");
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_stage') THEN CREATE TYPE lead_stage AS ENUM ('inquiry', 'contacted', 'consultation_scheduled', 'consultation_completed', 'proposal_sent', 'converted', 'lost'); END IF; END $$;`);

    logger.info("Checking/Creating deadline_type enum...");
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deadline_type') THEN CREATE TYPE deadline_type AS ENUM ('visa_expiry', 'filing_deadline', 'rfe_response', 'document_submission', 'appointment', 'payment_due', 'custom'); END IF; END $$;`);

    logger.info("Checking/Creating reminder_type enum...");
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_type') THEN CREATE TYPE reminder_type AS ENUM ('deadline', 'appointment', 'follow_up', 'document_request', 'payment', 'custom'); END IF; END $$;`);

    // 2. Add new values to existing enums (Drizzle-friendly way)
    logger.info("Checking for missing enum values...");
    const addEnumValue = async (typeName: string, value: string) => {
      try {
        await db.execute(sql.raw(`ALTER TYPE ${typeName} ADD VALUE IF NOT EXISTS '${value}'`));
        logger.info(`Verified ${value} exists in ${typeName}`);
      } catch (err: any) {
        if (err.message?.includes("already exists")) return;
        logger.warn({ typeName, value, err: err.message }, "Notice: Could not add enum value (this is normal if it exists)");
      }
    };

    await addEnumValue('consultation_status', 'accepted');
    await addEnumValue('consultation_status', 'pending');
    await addEnumValue('application_status', 'under_review');
    await addEnumValue('application_status', 'pending_documents');

    // 2. Create Tasks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        lawyer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id VARCHAR(255) REFERENCES applications(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status task_status NOT NULL DEFAULT 'pending',
        priority task_priority NOT NULL DEFAULT 'medium',
        due_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Create Invoices table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        lawyer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        applicant_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id VARCHAR(255) REFERENCES applications(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status invoice_status NOT NULL DEFAULT 'draft',
        due_date TIMESTAMP,
        items JSONB,
        tax_rate DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) DEFAULT 0,
        legal_entity_name VARCHAR(255),
        inn VARCHAR(20),
        oked VARCHAR(10),
        mfo VARCHAR(10),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Ensure missing columns exist in invoices table
    try {
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) DEFAULT 0;`);
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0;`);
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;`);
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS legal_entity_name VARCHAR(255);`);
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS inn VARCHAR(20);`);
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS oked VARCHAR(10);`);
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS mfo VARCHAR(10);`);
    } catch (e) {
      logger.warn({ error: e }, "Could not ensure invoice columns");
    }

    // 4. Add indexes
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS tasks_lawyer_id_idx ON tasks(lawyer_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS invoices_lawyer_id_idx ON invoices(lawyer_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS invoices_applicant_id_idx ON invoices(applicant_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);`);
    } catch (e) { logger.warn({ err: e }, "Index creation partial failure"); }

    // 5. Ensure Companies table exists (standard schema)
    try {
      logger.info("Verifying companies table...");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS companies (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          industry VARCHAR(100),
          size VARCHAR(50),
          description TEXT,
          website TEXT,
          logo TEXT,
          subdomain VARCHAR(63) UNIQUE,
          branding_config JSONB,
          is_active BOOLEAN DEFAULT true,
          is_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Ensure missing columns exist in companies table
      try {
        await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT;`);
        await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);`);
        await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);`);
        await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);`);
      } catch (e) {
        // Ignored
      }
    } catch (e) { logger.error({ err: e }, "Failed to ensure companies table"); }

    // Ensure missing columns exist in applications table (Fix for missing column error)
    try {
      logger.info("Verifying applications table columns...");
      const columns = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'applications'
      `);
      const existingCols = columns.rows.map((r: any) => r.column_name);
      logger.info({ existingCols }, "Existing columns in applications table");

      if (!existingCols.includes('encrypted_passport')) {
        logger.info("Adding missing encrypted_passport to applications...");
        await db.execute(sql`ALTER TABLE applications ADD COLUMN "encrypted_passport" TEXT;`);
      }
      if (!existingCols.includes('encrypted_dob')) {
        logger.info("Adding missing encrypted_dob to applications...");
        await db.execute(sql`ALTER TABLE applications ADD COLUMN "encrypted_dob" TEXT;`);
      }

      // Also ensure users don't have this column if it was erroneously added
      try {
        await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS "encrypted_passport";`);
      } catch (e) { /* ignore */ }

      logger.info("Verifying messages table columns...");
      const msgColumns = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'messages'
      `);
      const existingMsgCols = msgColumns.rows.map((r: any) => r.column_name);
      logger.info({ existingMsgCols }, "Existing columns in messages table");

      if (!existingMsgCols.includes('is_read')) {
        logger.info("Adding missing is_read to messages...");
        await db.execute(sql`ALTER TABLE messages ADD COLUMN "is_read" BOOLEAN DEFAULT false;`);
      }
      if (!existingMsgCols.includes('application_id')) {
        logger.info("Adding missing application_id to messages...");
        await db.execute(sql`ALTER TABLE messages ADD COLUMN "application_id" TEXT;`);
      }

    } catch (e) {
      logger.error({ error: e }, "Could not ensure applications or messages columns");
    }

    // 6. Ensure Leads (CRM) table exists
    try {
      logger.info("Verifying leads table...");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          lawyer_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100),
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          country VARCHAR(2),
          visa_interest VARCHAR(100),
          stage lead_stage NOT NULL DEFAULT 'inquiry',
          source VARCHAR(100),
          referred_by VARCHAR(255),
          notes TEXT,
          estimated_value DECIMAL(10, 2),
          next_follow_up TIMESTAMP,
          converted_to_application_id VARCHAR(255) REFERENCES applications(id),
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    } catch (e) { logger.error({ err: e }, "Failed to ensure leads table"); }

    // 7. Ensure Deadlines table exists
    try {
      logger.info("Verifying deadlines table...");
      await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deadlines (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id VARCHAR(255) REFERENCES applications(id) ON DELETE CASCADE,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        lawyer_id VARCHAR(255) REFERENCES users(id),
        type deadline_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP NOT NULL,
        reminder_days INTEGER DEFAULT 7,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        priority task_priority NOT NULL DEFAULT 'medium',
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    } catch (e) { logger.error({ err: e }, "Failed to ensure deadlines table"); }

    // 8. Ensure Document Checklists templates
    try {
      logger.info("Verifying document_checklists table...");
      await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_checklists (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        visa_type VARCHAR(100) NOT NULL,
        country VARCHAR(2) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        items JSONB NOT NULL,
        is_template BOOLEAN NOT NULL DEFAULT true,
        created_by VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    } catch (e) { logger.error({ err: e }, "Failed to ensure document_checklists table"); }

    // 9. Ensure Checklist Items
    try {
      logger.info("Verifying checklist_items table...");
      await db.execute(sql`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id VARCHAR(255) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        checklist_id VARCHAR(255) REFERENCES document_checklists(id),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        is_required BOOLEAN NOT NULL DEFAULT true,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        document_id VARCHAR(255) REFERENCES documents(id),
        completed_at TIMESTAMP,
        completed_by VARCHAR(255) REFERENCES users(id),
        notes TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    } catch (e) { logger.error({ err: e }, "Failed to ensure checklist_items table"); }

    // 10. Ensure Time Entries
    try {
      logger.info("Verifying time_entries table...");
      await db.execute(sql`
      CREATE TABLE IF NOT EXISTS time_entries (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id VARCHAR(255) REFERENCES applications(id) ON DELETE SET NULL,
        client_id VARCHAR(255) REFERENCES users(id),
        invoice_id VARCHAR(255) REFERENCES invoices(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        hourly_rate DECIMAL(10, 2),
        is_billable BOOLEAN NOT NULL DEFAULT true,
        is_billed BOOLEAN NOT NULL DEFAULT false,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        category VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    } catch (e) { logger.error({ err: e }, "Failed to ensure time_entries table"); }

    // 11. Ensure Reminders
    try {
      logger.info("Verifying reminders table...");
      await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id VARCHAR(255) REFERENCES applications(id) ON DELETE CASCADE,
        deadline_id VARCHAR(255) REFERENCES deadlines(id) ON DELETE CASCADE,
        type reminder_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        scheduled_for TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        is_sent BOOLEAN NOT NULL DEFAULT false,
        channel VARCHAR(50) DEFAULT 'email',
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    } catch (e) { logger.error({ err: e }, "Failed to ensure reminders table"); }

    // 12. Ensure Background Jobs table exists
    try {
      logger.info("Verifying background_jobs table...");
      await db.execute(sql`
      CREATE TABLE IF NOT EXISTS background_jobs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payload JSONB,
        result JSONB,
        error TEXT,
        progress INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    } catch (e) { logger.error({ err: e }, "Failed to ensure background_jobs table"); }

    await db.execute(sql`CREATE INDEX IF NOT EXISTS background_jobs_status_idx ON background_jobs(status);`);

    // 13. Ensure refresh_tokens table exists (Critical for auth)
    try {
      logger.info("Verifying refresh_tokens table...");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          revoked BOOLEAN DEFAULT false NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
        );
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);`);
    } catch (e) { logger.error({ err: e }, "Failed to ensure refresh_tokens table"); }

    logger.info("✅ ERP tables initialization complete");
  } catch (error) {
    logger.error({ error }, "Failed to initialize ERP tables (Critical)");
    // Don't throw, let the app try to start anyway
  }
}

import { researchArticles } from "@shared/schema";
import { refreshImmigrationNews } from "./news";

export async function ensureResearchDataExists() {
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(researchArticles);
    const count = Number(result[0]?.count || 0);

    if (count === 0) {
      logger.info("[Auto-Seed] Research library empty. Triggering initial news fetch...");
      // Run in background to not block startup
      refreshImmigrationNews().catch(err => logger.error({ err }, "Auto-seed failed"));
    } else {
      logger.info(`[Auto-Seed] Research library has ${count} items. Skipping seed.`);
    }
  } catch (error) {
    logger.warn({ error }, "Failed to check research library status");
  }
}
