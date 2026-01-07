
import { sql } from "drizzle-orm";
import { pgEnum } from "drizzle-orm/pg-core";

export async function up(db: any) {
    // Add 'pending' to the enum
    await db.execute(sql`ALTER TYPE consultation_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'scheduled'`);

    // Update the default value for the status column
    await db.execute(sql`ALTER TABLE consultations ALTER COLUMN status SET DEFAULT 'pending'`);
}

export async function down(db: any) {
    // We cannot easily remove enum values in Postgres, so we revert the default only
    await db.execute(sql`ALTER TABLE consultations ALTER COLUMN status SET DEFAULT 'scheduled'`);
}
