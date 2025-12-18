import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { users } from "@shared/schema";
import { logger } from "./logger";

export async function ensureSchemaExists(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set, skipping schema initialization");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    logger.info("Checking if database schema exists...");

    // Check if users table exists
    const tableExists = await db
      .execute(
        sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        );
      `
      )
      .catch(() => null);

    if (!tableExists || !tableExists.rows?.[0]?.exists) {
      logger.warn(
        "Users table does not exist - schema may not be initialized. Running migrations..."
      );
      // Try to run migrations
      try {
        const { runMigrationsIfNeeded } = await import("./runMigrations");
        await runMigrationsIfNeeded();
      } catch (migErr) {
        logger.error(
          { err: migErr },
          "Migrations failed - application will start but database operations will fail"
        );
      }
    } else {
      logger.info("✓ Database schema exists, tables are available");
    }
  } catch (err) {
    logger.error({ err }, "Error checking database schema");
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  }
}
