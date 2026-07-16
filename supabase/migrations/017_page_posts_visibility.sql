-- 017: allow any authenticated user to see page account posts and profiles
-- Page accounts have university_id = NULL so the university-match clause
-- never fires for them. This adds explicit OR branches for page visibility.

-- ── posts ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "posts_select" ON posts;

CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    -- own posts (personal or page)
    auth.uid() = user_id

    -- same university (personal accounts viewing personal posts)
    OR (
      auth_university_id() IS NOT NULL
      AND get_profile_university_id(posts.user_id) IS NOT NULL
      AND auth_university_id() = get_profile_university_id(posts.user_id)
    )

    -- page account posts are visible to every authenticated user
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = posts.user_id
          AND p.account_type = 'page'
      )
    )
  );

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;

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
    -- page profiles are visible to every authenticated user
    OR account_type = 'page'
  );
