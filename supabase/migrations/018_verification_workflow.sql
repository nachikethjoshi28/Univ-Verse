-- 018: full verification workflow
-- • Add verification_document_type and verification_submitted_at to profiles
-- • Set default verification_status to 'unverified' (was 'pending')
-- • Auto-approve page accounts (they don't need student ID verification)
-- • Add evidence_url to field_change_requests (or create the table if absent)
-- • RLS policies for field_change_requests

-- ── profiles: new verification columns ────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_document_type TEXT
    CHECK (verification_document_type IN ('student_id', 'diploma'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;

-- Change default so new accounts start as 'unverified', not 'pending'
ALTER TABLE profiles
  ALTER COLUMN verification_status SET DEFAULT 'unverified';

-- Backfill: any profile that already has no status gets 'unverified'
UPDATE profiles
SET verification_status = 'unverified'
WHERE verification_status IS NULL;

-- Page accounts need no student-ID verification — auto-approve them
UPDATE profiles
SET verification_status = 'verified'
WHERE account_type = 'page'
  AND verification_status IN ('unverified', 'pending');

-- ── field_change_requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS field_change_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  field_name       TEXT NOT NULL,
  current_value    TEXT,
  requested_value  TEXT NOT NULL,
  evidence_url     TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES profiles(id)
);

-- Add evidence_url if table already existed without it
ALTER TABLE field_change_requests
  ADD COLUMN IF NOT EXISTS evidence_url TEXT;

ALTER TABLE field_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "change_requests_select" ON field_change_requests;
CREATE POLICY "change_requests_select" ON field_change_requests FOR SELECT
  USING (auth.uid() = user_id OR auth_is_admin());

DROP POLICY IF EXISTS "change_requests_insert" ON field_change_requests;
CREATE POLICY "change_requests_insert" ON field_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "change_requests_update" ON field_change_requests;
CREATE POLICY "change_requests_update" ON field_change_requests FOR UPDATE
  USING (auth_is_admin());
