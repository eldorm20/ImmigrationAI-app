import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { logger } from "./logger";
import { resolve } from "path";
import { existsSync, readdirSync } from "fs";

export async function runMigrationsIfNeeded(): Promise<void> {
  // Always run migrations if DATABASE_URL is set
  // This ensures the database schema is up to date on every app start
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set, skipping migrations");
    return;
  }

  logger.info(`Current working directory: ${process.cwd()}`);

  // Resolve migrations path - check multiple locations
  const possiblePaths = [
    resolve(process.cwd(), "migrations"),
    resolve(process.cwd(), ".", "migrations"),
    "migrations",
  ];

  let migrationsPath = null;
  for (const path of possiblePaths) {
    const absPath = resolve(path);
    logger.info(`Checking for migrations at: ${absPath}`);
    if (existsSync(absPath)) {
      try {
        const files = readdirSync(absPath);
        logger.info(`Found migrations folder with ${files.length} files: ${files.join(", ")}`);
        migrationsPath = absPath;
        break;
      } catch (err) {
        logger.warn(`Error reading migrations directory at ${absPath}: ${err}`);
      }
    } else {
      logger.info(`Migrations not found at: ${absPath}`);
    }
  }

  if (!migrationsPath) {
    logger.error(
      { checkedPaths: possiblePaths.map((p) => resolve(p)) },
      "Migrations folder not found in any expected location - database schema will not be initialized"
    );
    // Don't throw - let the app start in degraded mode
    // throw new Error("Migrations folder not found");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // First, verify database connection
    logger.info("Verifying database connection...");
    const result = await pool.query("SELECT 1 as connection_test");
    logger.info("✓ Database connection successful");

    logger.info(`Running database migrations from: ${migrationsPath}`);
    await migrate(db, { migrationsFolder: migrationsPath });
    logger.info("✓ Database migrations completed successfully");
  } catch (err) {
    logger.error(
      { err, stack: (err as any)?.stack },
      "✗ Database migration failed - tables may not exist"
    );
    // Don't throw - let the app continue so we can see the actual error
  } finally {
    try {
      await pool.end();
    } catch (e) {
      logger.warn("Error closing pool after migrations", e);
    }
  }
}
