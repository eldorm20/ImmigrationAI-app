import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function ensureErpTablesExist() {
  try {
    logger.info("Ensuring ERP tables and enums exist...");

    // 1. Create Enums if they don't exist
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'archived'); END IF; END $$;`);
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high'); END IF; END $$;`);
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue'); END IF; END $$;`);
    await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_status') THEN CREATE TYPE consultation_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show', 'accepted', 'pending'); END IF; END $$;`);

    // 2. Add new values to existing enums (Drizzle-friendly way)
    // Note: ALTER TYPE ... ADD VALUE cannot be executed in a transaction block
    const addEnumValue = async (typeName: string, value: string) => {
      try {
        await db.execute(sql.raw(`ALTER TYPE ${typeName} ADD VALUE IF NOT EXISTS '${value}'`));
      } catch (err: any) {
        if (err.message?.includes("already exists")) return;
        logger.warn({ typeName, value, err: err.message }, "Attempted to add enum value");
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
