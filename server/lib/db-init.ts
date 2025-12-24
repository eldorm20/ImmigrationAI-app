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
