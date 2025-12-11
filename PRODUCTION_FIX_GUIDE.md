# Production Deployment Fix Guide

## Critical Issue: Avatar Column Missing

### Problem
The production database is missing the `avatar` column in the `users` table, which causes login failures with the error:
```
Login endpoint error: column "avatar" does not exist
```

### Root Cause
The TypeScript schema definition in `shared/schema.ts` includes an `avatar` field, but the database migration to add this column was never created. This is a common schema/migration divergence issue.

### Solution
A new migration has been created: `migrations/0006_add_avatar_column.sql`

## Deployment Steps

### Step 1: Deploy Code Changes
The authentication bug fixes and new migration have been committed to GitHub:
- Commit: `dc0e216`
- Message: "Add avatar column migration for schema consistency"

Pull the latest code on your production server:
```bash
git pull origin main
```

### Step 2: Run Database Migration
Run the migration on your production PostgreSQL database:

#### Option A: Using Drizzle CLI (Recommended)
```bash
npm run db:push
```

#### Option B: Manual SQL Execution
Connect to your PostgreSQL database and execute:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
```

#### Option C: Using psql
```bash
psql -U your_user -d your_database -f migrations/0006_add_avatar_column.sql
```

### Step 3: Verify the Fix
1. Check that the column was added:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='users' AND column_name='avatar';
```

2. Test the login endpoint:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

Expected response:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "email": "..." }
}
```

## Migration Details

### Migration File
- **File**: `migrations/0006_add_avatar_column.sql`
- **Content**:
  ```sql
  -- Add avatar column to users table
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
  ```
- **Safety**: Uses `IF NOT EXISTS` to prevent errors if column already exists
- **Type**: Optional text column for user profile pictures

## Database Schema Status

### Current Migrations (Completed)
| Migration | Purpose | Status |
|-----------|---------|--------|
| 0000_soft_steel_serpent.sql | Initial schema (all tables) | ✅ Applied |
| 0001_confused_microchip.sql | Research articles table | ✅ Applied |
| 0002_add_user_metadata.sql | User metadata support | ✅ Applied |
| 0003_add_document_s3_key.sql | Document S3 storage keys | ✅ Applied |
| 0003_add_metadata_safe.sql | Safe metadata addition | ✅ Applied |
| 0004_add_roadmap_items.sql | Application progress tracking | ✅ Applied |
| 0005_add_sample_research_data.sql | Sample research articles | ✅ Applied |
| **0006_add_avatar_column.sql** | **User avatar support** | **⏳ PENDING** |

### Users Table Schema (After Migration)
```sql
CREATE TABLE "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL UNIQUE,
  "hashed_password" text NOT NULL,
  "role" user_role DEFAULT 'applicant',
  "email_verified" boolean DEFAULT false,
  "email_verification_token" varchar(255),
  "email_verification_expires" timestamp,
  "password_reset_token" varchar(255),
  "password_reset_expires" timestamp,
  "first_name" varchar(100),
  "last_name" varchar(100),
  "phone" varchar(20),
  "avatar" text,                    -- ← NEW (from migration 0006)
  "metadata" jsonb DEFAULT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
)
```

## Authentication Fixes Applied

In addition to the avatar column migration, three critical authentication bugs were fixed in commit `883f092`:

### Bug 1: Duplicate /auth/me Endpoint
**Problem**: The endpoint was defined twice, causing conflicts
**Fix**: Removed duplicate definition, kept single properly configured endpoint
**File**: `server/routes/auth.ts`

### Bug 2: Inconsistent User ID Field Names
**Problem**: Code mixed `req.user.id` and `req.user.userId`, causing type errors
**Fix**: Standardized to use `userId` throughout:
- Middleware now sets: `req.user = { userId: payload.userId }`
- All routes query using: `req.user!.userId`
- TypeScript types updated in middleware
**Files**: `server/middleware/auth.ts`, `server/routes/auth.ts`

### Bug 3: Express Request Type Definition
**Problem**: Request type defined `user?: { id: string }` but code used `userId`
**Fix**: Updated to `user?: { userId: string }`
**File**: `server/middleware/auth.ts`

## Testing Checklist

After deployment, verify:

- [ ] Avatar column exists in users table
- [ ] Application starts without errors
- [ ] Login endpoint works (test with valid credentials)
- [ ] Token generation succeeds
- [ ] Protected routes accept tokens
- [ ] Logout works correctly
- [ ] User profile retrieves correctly
- [ ] No database connection errors in logs
- [ ] No "column does not exist" errors in logs

## Rollback Plan

If issues arise, revert the migration:
```sql
ALTER TABLE users DROP COLUMN IF EXISTS avatar;
```

## Support

If you encounter any issues:
1. Check that migration 0006 was executed successfully
2. Verify PostgreSQL connection and permissions
3. Check application logs for specific error messages
4. Ensure all code from commit `dc0e216` is deployed
5. Verify environment variables are correctly set

## Summary of Changes

- **New migration**: `0006_add_avatar_column.sql` (2 lines)
- **Bug fixes**: Authentication endpoint and field naming consistency
- **Database impact**: One new nullable column (text type)
- **Breaking changes**: None - backward compatible
- **Testing required**: Login flow verification
