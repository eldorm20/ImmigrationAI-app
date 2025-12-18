import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { logger } from "./logger";
import { resolve } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";

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

    // Try Drizzle's migrate function first
    try {
      await migrate(db, { migrationsFolder: migrationsPath });
      logger.info("✓ Database migrations completed successfully via Drizzle");
    } catch (drizzleErr: any) {
      logger.warn({ drizzleErr }, "Drizzle migration failed, attempting direct SQL execution");

      // Fallback: execute SQL files directly
      try {
        const files = readdirSync(migrationsPath)
          .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
          .sort();

        for (const file of files) {
          const filePath = resolve(migrationsPath, file);
          try {
            const sql = readFileSync(filePath, 'utf-8');

            // Split by statement breakpoint marker (Drizzle format)
            const statements = sql
              .split('-->')
              .map(s => s.replace(/^[^\w"]*/, '').trim()) // Remove leading non-word chars and comments
              .filter(s => s.length > 0 && !s.startsWith('statement-breakpoint'));

            for (const statement of statements) {
              const cleanedStatement = statement
                .replace(/--> statement-breakpoint\s*$/g, '') // Remove trailing marker
                .trim();

              if (cleanedStatement.length > 0 && !cleanedStatement.startsWith('--')) {
                try {
                  await pool.query(cleanedStatement);
                  logger.debug(`✓ Executed statement from ${file}`);
                } catch (stmtErr: any) {
                  // Some statements might fail if objects already exist, which is ok
                  const errMsg = stmtErr.message || '';
                  if (errMsg.includes('already exists') ||
                    errMsg.includes('already defined') ||
                    errMsg.includes('duplicate key')) {
                    logger.debug(`⚠ Skipped existing object in ${file}: ${errMsg}`);
                  } else {
                    logger.warn({ stmtErr }, `Error executing statement from ${file}`);
                  }
                }
              }
            }
            logger.info(`✓ Processed migration file: ${file}`);
          } catch (fileErr) {
            logger.error({ fileErr }, `Failed to process migration file: ${file}`);
          }
        }
      } catch (fallbackErr) {
        logger.error({ fallbackErr }, "Direct SQL execution also failed");
      }
    }

    // Verify avatar column exists
    try {
      const avatarCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'avatar'
        )
      `);

      if (avatarCheck.rows[0]?.exists) {
        logger.info("✓ Avatar column verified in users table");
      } else {
        logger.warn("⚠ Avatar column not found in users table - attempting manual creation");
        try {
          await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text");
          logger.info("✓ Avatar column manually added");
        } catch (manualErr: any) {
          logger.warn({ manualErr }, "Could not add avatar column manually");
        }
      }
    } catch (checkErr) {
      logger.warn({ checkErr }, "Could not verify avatar column existence");
    }

    // Verify documents.s3_key column exists and create if missing
    try {
      const s3KeyCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'documents' AND column_name = 's3_key'
        )
      `);

      if (s3KeyCheck.rows[0]?.exists) {
        logger.info("✓ s3_key column verified in documents table");
      } else {
        logger.warn("⚠ s3_key column not found in documents table - attempting manual creation");
        try {
          await pool.query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_key varchar(500)");
          logger.info("✓ s3_key column manually added to documents table");
        } catch (manualErr: any) {
          logger.warn({ manualErr }, "Could not add s3_key column to documents table");
        }
      }
    } catch (checkErr) {
      logger.warn({ checkErr }, "Could not verify s3_key column existence in documents table");
    }
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
      logger.warn({ err: e }, "Error closing pool after migrations");
    }
  }
}
