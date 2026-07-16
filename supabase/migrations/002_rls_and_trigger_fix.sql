-- ============================================================
-- 002: Fix trigger (university_id) + all missing RLS policies
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ─── 1. Fix handle_new_user trigger ───────────────────────────────────────────
-- Original trigger never looked up university_id, so every profile had NULL
-- university_id, causing all university-scoped queries to silently return nothing.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_university_id UUID;
BEGIN
  SELECT id INTO v_university_id
  FROM public.universities
  WHERE name = (NEW.raw_user_meta_data->>'university_name');

  INSERT INTO public.profiles (
    id, email, full_name, dob,
    university_id, enrollment_year, graduation_year, is_alumni
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'dob')::DATE, NOW()::DATE),
    v_university_id,
    COALESCE((NEW.raw_user_meta_data->>'enrollment_year')::INTEGER, EXTRACT(YEAR FROM NOW())::INTEGER),
    COALESCE((NEW.raw_user_meta_data->>'graduation_year')::INTEGER, EXTRACT(YEAR FROM NOW())::INTEGER + 4),
    COALESCE((NEW.raw_user_meta_data->>'is_alumni')::BOOLEAN, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 2. Backfill university_id for existing profiles ──────────────────────────
UPDATE public.profiles p
SET
  university_id = u.id,
  is_alumni = COALESCE((au.raw_user_meta_data->>'is_alumni')::BOOLEAN, FALSE)
FROM auth.users au
JOIN public.universities u ON u.name = (au.raw_user_meta_data->>'university_name')
WHERE au.id = p.id
  AND p.university_id IS NULL;

-- ─── 3. Fix profiles UPDATE policy to allow admin to verify users ──────────────
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- ─── 4. Connections ───────────────────────────────────────────────────────────
CREATE POLICY "connections_select" ON connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "connections_insert" ON connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "connections_update" ON connections FOR UPDATE
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "connections_delete" ON connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ─── 5. Post likes ────────────────────────────────────────────────────────────
-- SELECT is open so the liked_by_me join in the home feed works
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT USING (TRUE);

CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 6. Post comments ─────────────────────────────────────────────────────────
CREATE POLICY "post_comments_select" ON post_comments FOR SELECT USING (TRUE);

CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_comments_delete" ON post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 7. Dating profiles ───────────────────────────────────────────────────────
CREATE POLICY "dating_profiles_select" ON dating_profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      is_active = TRUE
      AND EXISTS (
        SELECT 1 FROM profiles viewer
        JOIN profiles owner ON owner.id = dating_profiles.user_id
        WHERE viewer.id = auth.uid()
          AND viewer.university_id IS NOT NULL
          AND viewer.university_id = owner.university_id
      )
    )
  );

CREATE POLICY "dating_profiles_insert" ON dating_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dating_profiles_update" ON dating_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "dating_profiles_delete" ON dating_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 8. Dating swipes ─────────────────────────────────────────────────────────
CREATE POLICY "dating_swipes_select" ON dating_swipes FOR SELECT
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

CREATE POLICY "dating_swipes_insert" ON dating_swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);

-- ─── 9. Dating matches ────────────────────────────────────────────────────────
CREATE POLICY "dating_matches_select" ON dating_matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ─── 10. Marketplace listings ─────────────────────────────────────────────────
CREATE POLICY "marketplace_select" ON marketplace_listings FOR SELECT
  USING (
    auth.uid() = seller_id
    OR (
      is_flagged = FALSE
      AND EXISTS (
        SELECT 1 FROM profiles viewer
        WHERE viewer.id = auth.uid()
          AND viewer.university_id = marketplace_listings.university_id
      )
    )
  );

CREATE POLICY "marketplace_insert" ON marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "marketplace_update" ON marketplace_listings FOR UPDATE
  USING (
    auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY "marketplace_delete" ON marketplace_listings FOR DELETE
  USING (
    auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- ─── 11. Conversations ────────────────────────────────────────────────────────
CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- Any authenticated user can create a conversation (participants are added next)
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (TRUE);

-- ─── 12. Conversation participants ────────────────────────────────────────────
-- Allow seeing all participants in a conversation you're part of
CREATE POLICY "conv_participants_select" ON conversation_participants FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM conversation_participants my_cp
      WHERE my_cp.conversation_id = conversation_participants.conversation_id
        AND my_cp.user_id = auth.uid()
    )
  );

-- Allow inserting any participants when creating a conversation
CREATE POLICY "conv_participants_insert" ON conversation_participants FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "conv_participants_update" ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── 13. Communities ──────────────────────────────────────────────────────────
CREATE POLICY "communities_select" ON communities FOR SELECT
  USING (
    is_flagged = FALSE
    AND EXISTS (
      SELECT 1 FROM profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.university_id = communities.university_id
    )
  );

CREATE POLICY "communities_insert" ON communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "communities_update" ON communities FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = communities.id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
  );

-- ─── 14. Community members ────────────────────────────────────────────────────
CREATE POLICY "community_members_select" ON community_members FOR SELECT
  USING (TRUE);

CREATE POLICY "community_members_insert" ON community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_members_update" ON community_members FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin', 'moderator')
        AND cm.status = 'active'
    )
  );

-- ─── 15. Community posts ──────────────────────────────────────────────────────
CREATE POLICY "community_posts_select" ON community_posts FOR SELECT
  USING (
    is_flagged = FALSE
    AND (
      -- Public community: visible to same-university users
      EXISTS (
        SELECT 1 FROM communities c
        JOIN profiles v ON v.id = auth.uid()
        WHERE c.id = community_posts.community_id
          AND c.is_private = FALSE
          AND c.university_id = v.university_id
      )
      OR
      -- Private community: only active members
      EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = community_posts.community_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
      )
    )
  );

CREATE POLICY "community_posts_insert" ON community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_posts.community_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

CREATE POLICY "community_posts_delete" ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 16. Reports ──────────────────────────────────────────────────────────────
CREATE POLICY "reports_insert" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select" ON reports FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY "reports_update" ON reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));
