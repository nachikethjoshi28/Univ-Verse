-- 020: Fix verification_status CHECK constraint + reset unsubmitted accounts
--
-- Root causes fixed:
-- 1. Original schema CHECK only allows ('pending','verified','rejected').
--    Migration 018 set DEFAULT to 'unverified' but never expanded the CHECK,
--    so any new signup after 018 hits a constraint violation.
-- 2. Personal test accounts with no documents that were manually set to
--    'verified' in the Supabase dashboard bypass the VerificationGate — they
--    must be reset to 'unverified' regardless of their current status.

-- ── 1. Drop old CHECK constraint (find it by content, not assumed name) ────
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%verification_status%';

  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END;
$$;

-- ── 2. Add correct CHECK that includes 'unverified' ────────────────────────
ALTER TABLE profiles
  ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- ── 3. Ensure 'unverified' is the default for all new accounts ─────────────
ALTER TABLE profiles
  ALTER COLUMN verification_status SET DEFAULT 'unverified';

-- ── 4. Reset ALL personal accounts with no documents to 'unverified' ────────
-- This intentionally resets even manually-set 'verified' rows — if there is
-- no student_id_url on file, the admin never approved the account properly.
UPDATE profiles
SET verification_status = 'unverified'
WHERE (account_type = 'user' OR account_type IS NULL)
  AND is_admin = FALSE
  AND student_id_url IS NULL;

-- ── 5. Auto-approve page accounts ──────────────────────────────────────────
UPDATE profiles
SET verification_status = 'verified'
WHERE account_type = 'page';

-- ── 6. Fix handle_new_user to set account_type and verification from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account_type TEXT;
  v_verification TEXT;
BEGIN
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'user');
  v_verification := CASE WHEN v_account_type = 'page' THEN 'verified' ELSE 'unverified' END;

  INSERT INTO profiles (
    id, email, full_name, dob,
    enrollment_year, graduation_year,
    account_type, verification_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'dob')::DATE, NOW()::DATE),
    COALESCE((NEW.raw_user_meta_data->>'enrollment_year')::INTEGER,
             EXTRACT(YEAR FROM NOW())::INTEGER),
    COALESCE((NEW.raw_user_meta_data->>'graduation_year')::INTEGER,
             EXTRACT(YEAR FROM NOW())::INTEGER + 4),
    v_account_type,
    v_verification
  );
  RETURN NEW;
END;
$$;
