-- 015: recovery — safe university-scoped RLS using SECURITY DEFINER functions
-- to avoid RLS recursion and the "no policy = no access" failure from 014.

-- ── Step 1: drop broken policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "posts_select"    ON posts;

-- ── Step 2: create SECURITY DEFINER helpers (bypass RLS, no recursion) ───────
CREATE OR REPLACE FUNCTION auth_university_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT university_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_profile_university_id(uid UUID)
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT university_id FROM public.profiles WHERE id = uid
$$;

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()
$$;

-- ── Step 3: safe profiles SELECT policy ──────────────────────────────────────
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    -- own profile
    auth.uid() = id
    -- admins see all
    OR auth_is_admin()
    -- same university (both sides must be non-null)
    OR (
      university_id IS NOT NULL
      AND auth_university_id() IS NOT NULL
      AND university_id = auth_university_id()
    )
  );

-- ── Step 4: safe posts SELECT policy ─────────────────────────────────────────
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    -- own posts
    auth.uid() = user_id
    -- same university as viewer (no cross-table RLS, uses SECURITY DEFINER)
    OR (
      auth_university_id() IS NOT NULL
      AND get_profile_university_id(posts.user_id) IS NOT NULL
      AND auth_university_id() = get_profile_university_id(posts.user_id)
    )
  );
