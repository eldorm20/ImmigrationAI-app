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
      } catch (sqlExecErr) {
        logger.error({ sqlExecErr }, "SQL execution failed");
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

    // ==========================================
    // MANUAL FIX FOR NEW FEATURES (Employer, Referrals, Audit, Signatures)
    // ==========================================
    try {
      logger.info("Running manual schema updates for new features...");

      // 1. Users table updates
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text");

      // Fix for portal_token (Critical Login Fix)
      try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token VARCHAR(255)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_token_expiry TIMESTAMP");
        try {
          await pool.query("ALTER TABLE users ADD CONSTRAINT users_portal_token_unique UNIQUE (portal_token)");
        } catch (constraintErr) {
          // Ignore if constraint already exists or fails
        }
        logger.info("✓ portal_token columns verified/added manually");
      } catch (err) {
        logger.error({ err }, "Failed to manually add portal_token columns");
      }

      // ensure role column exists (already should, but safe to check)
      // await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'applicant'"); 

      // 2. Companies table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            logo TEXT,
            website TEXT,
            industry TEXT,
            size TEXT,
            subdomain TEXT UNIQUE,
            branding_config JSONB,
            is_active BOOLEAN DEFAULT true,
            is_verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Add columns if they don't exist (for existing tables)
      try {
        await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT");
        await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE");
        await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_config JSONB");
        await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true");

        // 2b. B2B Billing
        await pool.query("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id) ON DELETE CASCADE");
        await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_email TEXT");
        await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT");
        await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT");

      } catch (err) {
        // Silently continue - columns likely already exist
      }

      // 3. Jobs table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            requirements JSONB,
            location TEXT NOT NULL,
            salary_range TEXT,
            type TEXT DEFAULT 'full-time',
            status TEXT DEFAULT 'active',
            visa_sponsorship BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 4. Referrals table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            referrer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            referred_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'pending',
            reward_amount DECIMAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 5. Audit Logs table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id TEXT,
            metadata JSONB,
            ip_address TEXT,
            user_agent TEXT,
            timestamp TIMESTAMP DEFAULT NOW()
        )
      `);

      // 6. Signature Requests table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS signature_requests (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            requester_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            signer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            document_id TEXT,
            status TEXT DEFAULT 'pending',
            signature_url TEXT,
            signed_at TIMESTAMP,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 6b. Background Jobs
      await pool.query(`
        CREATE TABLE IF NOT EXISTS background_jobs (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending' NOT NULL,
            payload JSONB,
            result JSONB,
            error TEXT,
            progress INTEGER DEFAULT 0,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 7. Verification Chain (Blockchain)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS verification_chain (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
            file_hash VARCHAR(64) NOT NULL,
            previous_hash VARCHAR(64) NOT NULL,
            block_hash VARCHAR(64) NOT NULL,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 8. AI Dataset (Fine-Tuning)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_dataset (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            query TEXT NOT NULL,
            response TEXT NOT NULL,
            rating INTEGER,
            category VARCHAR(50),
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 9. Community & News
      await pool.query(`
        CREATE TABLE IF NOT EXISTS research_articles (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            slug VARCHAR(255) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            summary TEXT,
            body TEXT,
            category VARCHAR(50),
            type VARCHAR(50),
            tags TEXT[],
            language VARCHAR(10) DEFAULT 'en',
            source VARCHAR(255),
            source_url TEXT,
            is_published BOOLEAN DEFAULT TRUE,
            created_by_user_id VARCHAR(255),
            updated_by_user_id VARCHAR(255),
            published_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS article_comments (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            article_id TEXT REFERENCES research_articles(id) ON DELETE CASCADE,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS article_reactions (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            article_id TEXT REFERENCES research_articles(id) ON DELETE CASCADE,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL,
            UNIQUE(article_id, user_id, type)
        );
      `);

      logger.info("✓ Manual schema updates for new features completed");
    } catch (manualFixErr) {
      logger.error({ manualFixErr }, "Failed to apply manual schema updates");
    }

    // Verify research_articles.embedding column exists and create if missing
    try {
      // First ensure extension
      await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

      const embeddingCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'research_articles' AND column_name = 'embedding'
        )
      `);

      if (embeddingCheck.rows[0]?.exists) {
        logger.info("✓ embedding column verified in research_articles table");
      } else {
        logger.warn("⚠ embedding column not found in research_articles table - attempting manual creation");
        try {
          await pool.query("ALTER TABLE research_articles ADD COLUMN IF NOT EXISTS embedding vector(1536)");
          logger.info("✓ embedding column manually added to research_articles table");
        } catch (manualErr: any) {
          logger.warn({ manualErr }, "Could not add embedding column to research_articles table");
        }
      }
    } catch (checkErr) {
      logger.warn({ checkErr }, "Could not verify embedding column existence in research_articles table");
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
