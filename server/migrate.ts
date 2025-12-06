import 'dotenv/config'; // <-- loads .env automatically
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from "pg";
const { Pool } = pkg;
import { logger } from "./lib/logger";

if (!process.env.DATABASE_URL) {
  logger.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function runMigrations() {
  try {
    logger.info("Running database migrations...");
    await migrate(db, { migrationsFolder: "./migrations" });
    logger.info("Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Migration failed");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();







