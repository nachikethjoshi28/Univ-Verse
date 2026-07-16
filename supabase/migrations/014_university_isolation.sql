-- 014: enforce strict university isolation on profiles and posts

-- ── Helper: get current user's university_id without triggering RLS recursion ──
CREATE OR REPLACE FUNCTION auth_university_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT university_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ── profiles: restrict SELECT to own profile, admin, or same university ─────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    -- Always see own profile
    auth.uid() = id
    -- Admins see all
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
    -- Same university (both must have a non-null university_id)
    OR (
      university_id IS NOT NULL
      AND university_id = auth_university_id()
    )
  );

-- ── posts: restrict SELECT to own posts or same-university author ─────────────
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    -- Own posts always visible
    auth.uid() = user_id
    -- Same university: both viewer and author must have a matching non-null university_id
    OR (
      auth_university_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles author
        WHERE author.id = posts.user_id
          AND author.university_id IS NOT NULL
          AND author.university_id = auth_university_id()
      )
    )
  );
