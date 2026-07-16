-- 011: page accounts, tagging, field change requests

-- ── New columns on profiles ──────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user'
  CHECK (account_type IN ('user', 'page'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS page_category TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_tagging BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

-- ── post_tags ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tagged_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagger_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, tagged_user_id)
);

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_tags_select" ON post_tags;
CREATE POLICY "post_tags_select" ON post_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_tags_insert" ON post_tags;
CREATE POLICY "post_tags_insert" ON post_tags FOR INSERT
  WITH CHECK (auth.uid() = tagger_id);

DROP POLICY IF EXISTS "post_tags_delete" ON post_tags;
CREATE POLICY "post_tags_delete" ON post_tags FOR DELETE
  USING (auth.uid() = tagged_user_id OR auth.uid() = tagger_id);

-- ── page_follows ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, page_id)
);

ALTER TABLE page_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_follows_select" ON page_follows;
CREATE POLICY "page_follows_select" ON page_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "page_follows_insert" ON page_follows;
CREATE POLICY "page_follows_insert" ON page_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "page_follows_delete" ON page_follows;
CREATE POLICY "page_follows_delete" ON page_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Trigger: keep followers_count in sync
CREATE OR REPLACE FUNCTION update_page_followers_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = COALESCE(followers_count, 0) + 1
    WHERE id = NEW.page_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = GREATEST(0, COALESCE(followers_count, 0) - 1)
    WHERE id = OLD.page_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_page_follow_count ON page_follows;
CREATE TRIGGER trg_page_follow_count
  AFTER INSERT OR DELETE ON page_follows
  FOR EACH ROW EXECUTE FUNCTION update_page_followers_count();

-- ── field_change_requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS field_change_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  field_name       TEXT NOT NULL CHECK (field_name IN ('degree', 'major', 'graduation_year')),
  current_value    TEXT,
  requested_value  TEXT NOT NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE field_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcr_own_select" ON field_change_requests;
CREATE POLICY "fcr_own_select" ON field_change_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcr_own_insert" ON field_change_requests;
CREATE POLICY "fcr_own_insert" ON field_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcr_admin_select" ON field_change_requests;
CREATE POLICY "fcr_admin_select" ON field_change_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "fcr_admin_update" ON field_change_requests;
CREATE POLICY "fcr_admin_update" ON field_change_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
