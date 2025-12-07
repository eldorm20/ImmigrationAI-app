import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { logger } from "./logger";
import { resolve } from "path";
import { existsSync } from "fs";

export async function runMigrationsIfNeeded(): Promise<void> {
  // Always run migrations if DATABASE_URL is set
  // This ensures the database schema is up to date on every app start
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set, skipping migrations");
    return;
  }

  // Resolve migrations path - check multiple locations
  const possiblePaths = [
    resolve(process.cwd(), "migrations"),
    resolve(__dirname, "../..", "migrations"),
    resolve(__dirname, "migrations"),
  ];

  let migrationsPath = null;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      migrationsPath = path;
      logger.info(`Found migrations at: ${path}`);
      break;
    }
  }

  if (!migrationsPath) {
    logger.error(
      { checkedPaths: possiblePaths },
      "Migrations folder not found in any expected location"
    );
    throw new Error("Migrations folder not found");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    logger.info(`Running database migrations from ${migrationsPath}...`);
    await migrate(db, { migrationsFolder: migrationsPath });
    logger.info("Database migrations completed successfully");
  } catch (err) {
    logger.error({ err }, "Database migration failed");
    throw err;
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  }
}
