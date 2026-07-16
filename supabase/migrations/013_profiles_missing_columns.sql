-- 013: add missing profile columns that exist in the TypeScript types but were never migrated

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private         BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deactivated     BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alternative_email  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan  TEXT DEFAULT 'free'
  CHECK (subscription_plan IN ('free', 'silver', 'gold'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period_end   TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id        TEXT;
