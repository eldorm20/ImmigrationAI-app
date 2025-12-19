import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

async function up() {
    logger.info("Starting migration: 0014_lawyer_erp_tables");
    try {
        // Invoices
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lawyer_id text NOT NULL,
        client_id text NOT NULL,
        application_id uuid REFERENCES applications(id),
        number varchar(50) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'draft',
        amount decimal(10, 2) NOT NULL DEFAULT 0,
        currency varchar(3) DEFAULT 'USD',
        issue_date timestamp DEFAULT now(),
        due_date timestamp,
        paid_date timestamp,
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);

        // Invoice Items
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description text NOT NULL,
        quantity decimal(10, 2) DEFAULT 1,
        rate decimal(10, 2) DEFAULT 0,
        amount decimal(10, 2) NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);

        // Time Entries
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS time_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lawyer_id text NOT NULL,
        client_id text,
        application_id uuid REFERENCES applications(id),
        description text NOT NULL,
        start_time timestamp,
        end_time timestamp,
        duration_minutes integer NOT NULL,
        is_billable boolean DEFAULT true,
        rate decimal(10, 2),
        amount decimal(10, 2),
        status varchar(20) DEFAULT 'unbilled',
        invoice_id uuid REFERENCES invoices(id),
        date timestamp DEFAULT now(),
        created_at timestamp DEFAULT now()
      );
    `);

        // Tasks
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lawyer_id text NOT NULL,
        client_id text,
        application_id uuid REFERENCES applications(id),
        title varchar(255) NOT NULL,
        description text,
        status varchar(20) DEFAULT 'todo',
        priority varchar(10) DEFAULT 'medium',
        due_date timestamp,
        completed_at timestamp,
        assigned_to text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);

        // Document Templates
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lawyer_id text NOT NULL,
        title varchar(255) NOT NULL,
        description text,
        content text,
        category varchar(50),
        language varchar(10) DEFAULT 'en',
        is_system boolean DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);

        logger.info("Migration 0014_lawyer_erp_tables completed successfully");
    } catch (error) {
        logger.error({ error }, "Failed to run migration");
        throw error;
    }
}

up().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
