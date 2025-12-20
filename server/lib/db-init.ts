import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function ensureErpTablesExist() {
  try {
    logger.info("Ensuring ERP tables and enums exist...");

    // 1. Create Enums if they don't exist, and ensure all values are present
    await db.execute(sql`
      DO $$ BEGIN
        -- task_status
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
          CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'archived');
        END IF;
        
        -- task_priority
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
          CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
        END IF;

        -- invoice_status
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
          CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue');
        END IF;

        -- consultation_status (crucial for confirmation fix)
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_status') THEN
          CREATE TYPE consultation_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show', 'accepted', 'pending');
        ELSE
          -- Ensure new values exist if the type was created by an older version
          BEGIN
            ALTER TYPE consultation_status ADD VALUE 'accepted';
          EXCEPTION
            WHEN duplicate_object THEN null;
          END;
          BEGIN
            ALTER TYPE consultation_status ADD VALUE 'pending';
          EXCEPTION
            WHEN duplicate_object THEN null;
          END;
        END IF;
      END $$;
    `);

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
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Add indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS tasks_lawyer_id_idx ON tasks(lawyer_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS invoices_lawyer_id_idx ON invoices(lawyer_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS invoices_applicant_id_idx ON invoices(applicant_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);`);

    logger.info("✅ ERP tables initialization complete");
  } catch (error) {
    logger.error({ error }, "Failed to initialize ERP tables");
    // Don't throw, let the app try to start anyway
  }
}
