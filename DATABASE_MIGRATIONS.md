# Database Migration Guide

This guide explains how to create the database tables needed for the newly implemented features.

## Prerequisites

- PostgreSQL database running
- Drizzle ORM configured (already in project)
- `.env` file with DATABASE_URL set

## Migration Steps

### Option 1: Using Drizzle (Recommended)

Create a new migration file in `migrations/`:

```bash
# Generate migration from schema changes
npm run db:generate
```

### Option 2: Manual SQL Migrations

Create migration files for each feature group:

---

## Migration Files to Create

### 1. Analytics Tables

**File**: `migrations/0003_analytics.sql`

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'document_upload', 'consultation_scheduled', 'application_submitted',
    'visa_enquiry', 'page_visit', 'search_performed', 'lawyer_contacted'
  ))
);

CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);

-- User analytics summary table
CREATE TABLE user_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  documents_uploaded INTEGER DEFAULT 0,
  consultations_scheduled INTEGER DEFAULT 0,
  applications_submitted INTEGER DEFAULT 0,
  engagement_score DECIMAL(3,2) DEFAULT 0,
  last_activity TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Gamification Tables

**File**: `migrations/0004_gamification.sql`

```sql
CREATE TABLE gamification_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  unlocked_badges TEXT[] DEFAULT '{}',
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  badges_json JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_user_id ON gamification_achievements(user_id);
CREATE INDEX idx_achievements_level ON gamification_achievements(current_level);

-- Leaderboard view for top users
CREATE VIEW user_leaderboard AS
SELECT 
  u.id,
  u.name,
  ga.total_points,
  ga.current_level,
  ga.unlocked_badges,
  RANK() OVER (ORDER BY ga.total_points DESC) as rank
FROM gamification_achievements ga
JOIN users u ON u.id = ga.user_id
WHERE ga.total_points > 0
LIMIT 100;
```

### 3. Lawyer Verification Tables

**File**: `migrations/0005_lawyer_verification.sql`

```sql
CREATE TABLE lawyer_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(100) NOT NULL UNIQUE,
  jurisdiction VARCHAR(50) NOT NULL,
  verification_status VARCHAR(20) DEFAULT 'pending',
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
  CONSTRAINT valid_jurisdiction CHECK (jurisdiction IN ('UK', 'USA', 'Canada', 'Australia'))
);

CREATE INDEX idx_credentials_lawyer_id ON lawyer_credentials(lawyer_id);
CREATE INDEX idx_credentials_jurisdiction ON lawyer_credentials(jurisdiction);
CREATE INDEX idx_credentials_status ON lawyer_credentials(verification_status);

-- Lawyer ratings
CREATE TABLE lawyer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_rating DECIMAL(2,1) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  communication_rating DECIMAL(2,1),
  expertise_rating DECIMAL(2,1),
  responsiveness_rating DECIMAL(2,1),
  professionalism_rating DECIMAL(2,1),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT no_self_review CHECK (lawyer_id != reviewer_id)
);

CREATE INDEX idx_ratings_lawyer_id ON lawyer_ratings(lawyer_id);
CREATE INDEX idx_ratings_reviewer_id ON lawyer_ratings(reviewer_id);
CREATE INDEX idx_ratings_created_at ON lawyer_ratings(created_at);

-- Lawyer summary for quick lookups
CREATE TABLE lawyer_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  average_rating DECIMAL(2,1),
  total_reviews INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  specializations TEXT[],
  languages TEXT[],
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Forum Tables

**File**: `migrations/0006_forum.sql`

```sql
CREATE TABLE forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO forum_categories (name, description, icon, display_order) VALUES
  ('Work Visa', 'Discussions about work visa applications', 'briefcase', 1),
  ('Study Visa', 'Discussions about student visa applications', 'book', 2),
  ('Family Sponsorship', 'Family reunion and sponsorship discussions', 'users', 3),
  ('Immigration Help', 'General immigration support', 'help-circle', 4),
  ('Document Help', 'Document preparation and requirements', 'file-text', 5);

CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  pinned BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_author_id ON forum_posts(author_id);
CREATE INDEX idx_posts_category_id ON forum_posts(category_id);
CREATE INDEX idx_posts_created_at ON forum_posts(created_at);

CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_replies_post_id ON forum_replies(post_id);
CREATE INDEX idx_replies_author_id ON forum_replies(author_id);
```

### 5. Document Analysis Tables

**File**: `migrations/0007_documents.sql`

```sql
CREATE TABLE document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50),
  extracted_data JSONB,
  confidence_scores JSONB,
  quality_score DECIMAL(3,2),
  completion_percentage DECIMAL(3,2),
  missing_fields TEXT[],
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_document_id ON document_analysis(document_id);
CREATE INDEX idx_analysis_user_id ON document_analysis(user_id);
CREATE INDEX idx_analysis_quality_score ON document_analysis(quality_score);
```

### 6. Progress Tracking Tables

**File**: `migrations/0008_progress.sql`

```sql
CREATE TABLE user_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMP,
  progress_percentage DECIMAL(3,2) DEFAULT 0,
  sub_milestones JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_user_id ON user_milestones(user_id);
CREATE INDEX idx_milestones_due_date ON user_milestones(due_date);
CREATE INDEX idx_milestones_completed_at ON user_milestones(completed_at);
```

### 7. Batch Processing Tables

**File**: `migrations/0009_batch.sql`

```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  items_total INTEGER,
  items_processed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT valid_type CHECK (type IN ('document_analysis', 'bulk_export', 'user_migration', 'data_sync')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_batch_job_id ON batch_jobs(job_id);
CREATE INDEX idx_batch_status ON batch_jobs(status);
CREATE INDEX idx_batch_started_at ON batch_jobs(started_at);
```

### 8. Calendar Integration Tables

**File**: `migrations/0010_calendar.sql`

```sql
CREATE TABLE calendar_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL,
  access_token VARCHAR(255),
  refresh_token VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_provider CHECK (provider_name IN ('google', 'outlook', 'local')),
  CONSTRAINT unique_provider PER USER CHECK (user_id, provider_name)
);

CREATE INDEX idx_calendar_user_id ON calendar_providers(user_id);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES calendar_providers(id) ON DELETE SET NULL,
  external_event_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  timezone VARCHAR(50),
  attendees TEXT[],
  reminders JSONB,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
```

### 9. Multi-Tenant Tables

**File**: `migrations/0011_tenants.sql`

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  customization_level VARCHAR(20) DEFAULT 'basic',
  enabled_features TEXT[] DEFAULT '{}',
  max_users INTEGER,
  max_storage INTEGER,
  api_rate_limit INTEGER DEFAULT 60,
  sso_enabled BOOLEAN DEFAULT FALSE,
  white_label BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_level CHECK (customization_level IN ('basic', 'standard', 'premium'))
);

CREATE TABLE tenant_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  logo TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  favicon TEXT,
  custom_domain VARCHAR(255) UNIQUE,
  support_email VARCHAR(255),
  terms_url TEXT,
  privacy_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_domain ON tenant_branding(custom_domain);

-- Link users to tenants
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
```

### 10. Payment & Subscription Tables

**File**: `migrations/0012_payments.sql`

```sql
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_events_type ON stripe_events(type);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_sub_status CHECK (status IN ('active', 'cancelled', 'suspended'))
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending',
  stripe_id VARCHAR(255),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

CREATE INDEX idx_payments_user_id ON payment_records(user_id);
CREATE INDEX idx_payments_status ON payment_records(status);
CREATE INDEX idx_payments_created_at ON payment_records(created_at);
```

---

## Running Migrations

### Using Drizzle Kit

```bash
# If using Drizzle schema files:
npm run db:push

# Or generate SQL files first:
npm run db:generate
npm run db:migrate
```

### Using Raw SQL

```bash
# Connect to your database and run migrations in order:
psql -U postgres -d immigration_ai < migrations/0003_analytics.sql
psql -U postgres -d immigration_ai < migrations/0004_gamification.sql
psql -U postgres -d immigration_ai < migrations/0005_lawyer_verification.sql
psql -U postgres -d immigration_ai < migrations/0006_forum.sql
psql -U postgres -d immigration_ai < migrations/0007_documents.sql
psql -U postgres -d immigration_ai < migrations/0008_progress.sql
psql -U postgres -d immigration_ai < migrations/0009_batch.sql
psql -U postgres -d immigration_ai < migrations/0010_calendar.sql
psql -U postgres -d immigration_ai < migrations/0011_tenants.sql
psql -U postgres -d immigration_ai < migrations/0012_payments.sql
```

### Update Migration Journal

After running migrations, update `migrations/meta/_journal.json` to track the new migration:

```json
{
  "version": "5",
  "dialect": "postgresql",
  "entries": [
    // ... existing entries ...
    {
      "idx": 3,
      "version": "0003_analytics",
      "when": 1234567890000,
      "tag": "analytics_tables",
      "breakpoints": false
    }
    // ... continue for each migration ...
  ]
}
```

---

## Integration Steps

After migrations are created:

1. **Update Database Types** - Regenerate types if using Drizzle:
   ```bash
   npm run db:push
   ```

2. **Update Service Functions** - Replace mock data with database queries:
   - `server/lib/analytics.ts` - Query `analytics_events` table
   - `server/lib/gamification.ts` - Query `gamification_achievements` table
   - `server/lib/lawyer-verification.ts` - Query `lawyer_credentials` and `lawyer_ratings`
   - `server/lib/payment.ts` - Query `payment_records` and `subscriptions`
   - Etc.

3. **Test All Services** - Verify database integration:
   ```bash
   npm test -- server/lib/
   ```

4. **Deploy** - Follow standard deployment process

---

## Quick Rollback

If you need to rollback a migration:

```bash
# For Drizzle:
npm run db:rollback

# For raw SQL, drop tables in reverse order:
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS stripe_events CASCADE;
// ... etc in reverse order
```

---

## Verification

After running migrations, verify tables exist:

```sql
-- List all new tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'analytics_events', 'gamification_achievements', 'lawyer_credentials',
  'lawyer_ratings', 'forum_categories', 'forum_posts', 'document_analysis',
  'user_milestones', 'batch_jobs', 'calendar_providers', 'tenants',
  'subscription', 'payment_records'
);

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
```

---

## Notes

- All migrations include proper foreign key constraints
- Indexes are created for frequently queried columns
- Constraints ensure data integrity
- JSONB columns for flexible nested data storage
- Timestamps included for audit trails
- Cascading deletes to prevent orphaned records

