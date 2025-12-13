-- Migration: set subscriptionTier='enterprise' for lawyers without explicit tier
-- Run on the production DB after review. Back up first.

BEGIN;

-- 1) Set subscriptionTier to 'enterprise' for users with role 'lawyer' and no subscriptionTier
UPDATE users
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('subscriptionTier', 'enterprise', 'subscriptionUpdatedAt', now()::text)
WHERE role = 'lawyer'
  AND (metadata IS NULL OR (metadata->>'subscriptionTier') IS NULL);

-- 2) Optional: Ensure aiUsage object exists so increment operations don't fail
UPDATE users
SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{aiUsage}', COALESCE(metadata->'aiUsage','{}'::jsonb), true)
WHERE (metadata->'aiUsage') IS NULL;

COMMIT;
