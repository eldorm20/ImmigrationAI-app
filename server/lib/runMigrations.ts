import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { logger } from "./logger";

export async function runMigrationsIfNeeded(): Promise<void> {
  if (process.env.AUTO_RUN_MIGRATIONS !== "true") return;

  if (!process.env.DATABASE_URL) {
    logger.error("DATABASE_URL not set, cannot run migrations");
    throw new Error("DATABASE_URL not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    logger.info("AUTO_RUN_MIGRATIONS=true — running migrations...");
    await migrate(db, { migrationsFolder: "./migrations" });
    logger.info("Database migrations completed");
  } catch (err) {
    logger.error({ err }, "Auto migration failed");
    throw err;
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  }
}
