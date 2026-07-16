-- 016: ensure saved_posts table exists with proper RLS

CREATE TABLE IF NOT EXISTS saved_posts (
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_posts_select" ON saved_posts;
CREATE POLICY "saved_posts_select" ON saved_posts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_posts_insert" ON saved_posts;
CREATE POLICY "saved_posts_insert" ON saved_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_posts_delete" ON saved_posts;
CREATE POLICY "saved_posts_delete" ON saved_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Allow reading any post the user has saved (bypasses university filter for archived saves)
DROP POLICY IF EXISTS "posts_select_saved" ON posts;
CREATE POLICY "posts_select_saved" ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_posts
      WHERE saved_posts.post_id = posts.id
        AND saved_posts.user_id = auth.uid()
    )
  );
