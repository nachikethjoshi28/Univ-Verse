-- ============================================================
-- 008: Fix notifications — DB triggers + RLS + Realtime
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ─── 1. Fix notifications RLS ─────────────────────────────────────────────────
-- The original "notifications_own" FOR ALL policy used USING as WITH CHECK,
-- which blocked cross-user inserts. Split into separate policies.

DROP POLICY IF EXISTS "notifications_own"                              ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications"       ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications"   ON notifications;
DROP POLICY IF EXISTS "notifications_select"                           ON notifications;
DROP POLICY IF EXISTS "notifications_insert"                           ON notifications;
DROP POLICY IF EXISTS "notifications_update"                           ON notifications;
DROP POLICY IF EXISTS "notifications_delete"                           ON notifications;

-- Only see your own
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Any authenticated user can insert for any recipient (needed for cross-user events)
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

-- Only update your own (mark as read)
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Only delete your own
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 2. Enable Realtime on notifications ──────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ─── 3. Fix likes_count trigger — add SECURITY DEFINER ────────────────────────
-- Without SECURITY DEFINER the trigger ran as the liker, whose uid ≠ post.user_id,
-- so the UPDATE on posts was blocked by the posts_update_own RLS policy.
CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── 4. Fix comments_count trigger — add SECURITY DEFINER ────────────────────
CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


-- ─── 5. Auto-notify on post like ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id   UUID;
  v_liker_name  TEXT;
BEGIN
  SELECT user_id INTO v_author_id FROM posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT full_name INTO v_liker_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'post_like',
    'Someone liked your post',
    COALESCE(v_liker_name, 'Someone') || ' liked your post',
    jsonb_build_object('post_id', NEW.post_id, 'liker_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON post_likes;
CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_post_like();


-- ─── 6. Auto-notify on repost ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_post_repost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id     UUID;
  v_reposter_name TEXT;
BEGIN
  IF NEW.repost_of_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO v_author_id FROM posts WHERE id = NEW.repost_of_id;
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT full_name INTO v_reposter_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'post_repost',
    'Someone reposted your post',
    COALESCE(v_reposter_name, 'Someone') || ' reposted your post',
    jsonb_build_object('post_id', NEW.repost_of_id, 'reposter_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_repost ON posts;
CREATE TRIGGER trg_notify_post_repost
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_post_repost();


-- ─── 7. Auto-notify on comment ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id      UUID;
  v_commenter_name TEXT;
BEGIN
  SELECT user_id INTO v_author_id FROM posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT full_name INTO v_commenter_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'post_comment',
    'New comment on your post',
    COALESCE(v_commenter_name, 'Someone') || ' commented: "' || LEFT(NEW.content, 80) || '"',
    jsonb_build_object('post_id', NEW.post_id, 'commenter_id', NEW.user_id, 'comment_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON post_comments;
CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_post_comment();


-- ─── 8. Backfill likes_count for existing posts ───────────────────────────────
UPDATE posts p
SET likes_count = (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id);

-- ─── 9. Backfill comments_count for existing posts ────────────────────────────
UPDATE posts p
SET comments_count = (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id);
