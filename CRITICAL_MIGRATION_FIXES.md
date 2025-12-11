# Critical Fixes for Railway Deployment - Authentication 500 Error

## Root Cause Analysis
The POST /api/auth/login was returning 500 errors because:
1. **Migrations were not running** - The `users` table and other schema tables didn't exist in the Railway PostgreSQL database
2. **Migrations folder was not in Docker image** - The Dockerfile didn't copy the migrations folder, so even if migrations tried to run, they would fail with "migration files not found"
3. **AUTO_RUN_MIGRATIONS dependency** - The old code required an environment variable to be set, which wasn't configured in Railway

## Fixes Applied

### 1. ✅ Modified Dockerfile to include migrations folder
**File**: `Dockerfile`
**Change**: Added `COPY migrations ./migrations` before the EXPOSE line
**Why**: The production Docker image now includes the migration SQL files needed by Drizzle ORM

**Before**:
```dockerfile
COPY drizzle.config.ts ./
COPY shared ./shared

EXPOSE 5000
```

**After**:
```dockerfile
COPY drizzle.config.ts ./
COPY migrations ./migrations
COPY shared ./shared

EXPOSE 5000
```

### 2. ✅ Modified runMigrations.ts to always run migrations
**File**: `server/lib/runMigrations.ts`
**Change**: Removed the `AUTO_RUN_MIGRATIONS !== "true"` check - migrations now run whenever DATABASE_URL is set
**Why**: Ensures database schema is always up-to-date on app startup without requiring environment variable configuration

**Key changes**:
- Removed: `if (process.env.AUTO_RUN_MIGRATIONS !== "true") return;`
- Changed error log to warning for missing DATABASE_URL
- Improved logging messages to show migration status

**Before**:
```typescript
export async function runMigrationsIfNeeded(): Promise<void> {
  if (process.env.AUTO_RUN_MIGRATIONS !== "true") return;
  
  if (!process.env.DATABASE_URL) {
    logger.error("DATABASE_URL not set, cannot run migrations");
    throw new Error("DATABASE_URL not set");
  }
  // ... rest of migration code
}
```

**After**:
```typescript
export async function runMigrationsIfNeeded(): Promise<void> {
  // Always run migrations if DATABASE_URL is set
  // This ensures the database schema is up to date on every app start
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set, skipping migrations");
    return;
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    logger.info("Running database migrations...");
    await migrate(db, { migrationsFolder: "./migrations" });
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
```

## What This Fixes
- ✅ POST /api/auth/login will now return 200 with tokens instead of 500 error
- ✅ All user registration will work
- ✅ Token refresh will work
- ✅ All protected API endpoints will work once authenticated
- ✅ Database schema will be automatically created on first deployment and verified on every app restart

## Deployment Steps
1. These changes are already applied to the local codebase
2. Need to commit: `git add Dockerfile server/lib/runMigrations.ts`
3. Need to push to GitHub: `git push origin main`
4. Railway will automatically detect the GitHub push and redeploy with the new Docker image
5. On startup, the app will run migrations and create all tables
6. Authentication should now work

## Verification
After deployment to Railway, verify:
1. Check Railway logs - should see: "Running database migrations..." and "Database migrations completed successfully"
2. Try to register a new account - should succeed with 201 status
3. Try to login - should return 200 with accessToken and refreshToken
4. Use the token to call GET /api/auth/me - should return user info

## Environment Variables Required in Railway
- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - Secret for access token signing (required, must be different from REFRESH_SECRET)
- `REFRESH_SECRET` - Secret for refresh token signing (required, must be different from JWT_SECRET)
- `NODE_ENV` - Set to "production"

These should already be configured in Railway, but verify they exist and are not empty.
