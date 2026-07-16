-- ============================================================
-- 009: Extended notifications
-- - Connection new post / repost  → notify all friends
-- - Community post like / comment → notify post author
-- - New community post            → notify all community members
-- - Community join request        → notify community admins/owner
-- - Fix community likes/comments count triggers (SECURITY DEFINER)
-- ============================================================


-- ─── 1. Connection new post / repost ──────────────────────────────────────────
-- When a user posts or reposts, notify all their accepted connections.
CREATE OR REPLACE FUNCTION notify_connection_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poster_name TEXT;
  v_friend_id   UUID;
BEGIN
  SELECT full_name INTO v_poster_name FROM profiles WHERE id = NEW.user_id;

  FOR v_friend_id IN
    SELECT CASE
      WHEN requester_id = NEW.user_id THEN addressee_id
      ELSE requester_id
    END
    FROM connections
    WHERE (requester_id = NEW.user_id OR addressee_id = NEW.user_id)
      AND status = 'accepted'
  LOOP
    IF NEW.repost_of_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        v_friend_id,
        'connection_repost',
        COALESCE(v_poster_name, 'Someone') || ' reposted',
        COALESCE(v_poster_name, 'Someone') || ' reposted a post',
        jsonb_build_object('post_id', NEW.id, 'poster_id', NEW.user_id, 'actor_name', COALESCE(v_poster_name, 'Someone'))
      );
    ELSE
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        v_friend_id,
        'connection_post',
        COALESCE(v_poster_name, 'Someone') || ' posted something new',
        COALESCE(v_poster_name, 'Someone') || ' shared a new post',
        jsonb_build_object('post_id', NEW.id, 'poster_id', NEW.user_id, 'actor_name', COALESCE(v_poster_name, 'Someone'))
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_connection_post ON posts;
CREATE TRIGGER trg_notify_connection_post
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_connection_post();


-- ─── 2. Community post like → notify post author ──────────────────────────────
CREATE OR REPLACE FUNCTION notify_community_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id      UUID;
  v_liker_name     TEXT;
  v_community_name TEXT;
BEGIN
  SELECT cp.user_id, c.name
    INTO v_author_id, v_community_name
    FROM community_posts cp
    JOIN communities c ON c.id = cp.community_id
   WHERE cp.id = NEW.post_id;

  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT full_name INTO v_liker_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'community_post_like',
    'Someone liked your community post',
    COALESCE(v_liker_name, 'Someone') || ' liked your post in ' || COALESCE(v_community_name, 'a community'),
    jsonb_build_object('community_post_id', NEW.post_id, 'liker_id', NEW.user_id, 'actor_name', COALESCE(v_liker_name, 'Someone'))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_community_post_like ON community_post_likes;
CREATE TRIGGER trg_notify_community_post_like
  AFTER INSERT ON community_post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_community_post_like();


-- ─── 3. Community post comment → notify post author ───────────────────────────
CREATE OR REPLACE FUNCTION notify_community_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id      UUID;
  v_commenter_name TEXT;
  v_community_name TEXT;
BEGIN
  SELECT cp.user_id, c.name
    INTO v_author_id, v_community_name
    FROM community_posts cp
    JOIN communities c ON c.id = cp.community_id
   WHERE cp.id = NEW.post_id;

  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT full_name INTO v_commenter_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id,
    'community_post_comment',
    'New comment on your community post',
    COALESCE(v_commenter_name, 'Someone') || ' commented on your post in ' || COALESCE(v_community_name, 'a community'),
    jsonb_build_object('community_post_id', NEW.post_id, 'commenter_id', NEW.user_id, 'comment_id', NEW.id, 'actor_name', COALESCE(v_commenter_name, 'Someone'))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_community_post_comment ON community_post_comments;
CREATE TRIGGER trg_notify_community_post_comment
  AFTER INSERT ON community_post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_community_post_comment();


-- ─── 4. New community post → notify all active members ────────────────────────
CREATE OR REPLACE FUNCTION notify_community_new_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poster_name    TEXT;
  v_community_name TEXT;
  v_member_id      UUID;
BEGIN
  SELECT full_name INTO v_poster_name FROM profiles WHERE id = NEW.user_id;
  SELECT name       INTO v_community_name FROM communities WHERE id = NEW.community_id;

  FOR v_member_id IN
    SELECT user_id FROM community_members
     WHERE community_id = NEW.community_id
       AND status = 'active'
       AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_member_id,
      'community_post',
      'New post in ' || COALESCE(v_community_name, 'your community'),
      COALESCE(v_poster_name, 'Someone') || ' posted in ' || COALESCE(v_community_name, 'your community'),
      jsonb_build_object('community_post_id', NEW.id, 'community_id', NEW.community_id, 'poster_id', NEW.user_id, 'actor_name', COALESCE(v_poster_name, 'Someone'), 'community_name', COALESCE(v_community_name, 'your community'))
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_community_new_post ON community_posts;
CREATE TRIGGER trg_notify_community_new_post
  AFTER INSERT ON community_posts
  FOR EACH ROW EXECUTE FUNCTION notify_community_new_post();


-- ─── 5. Community join request → notify owner & admins ────────────────────────
CREATE OR REPLACE FUNCTION notify_community_join_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_requester_name TEXT;
  v_community_name TEXT;
  v_admin_id       UUID;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  SELECT full_name INTO v_requester_name FROM profiles WHERE id = NEW.user_id;
  SELECT name       INTO v_community_name FROM communities WHERE id = NEW.community_id;

  FOR v_admin_id IN
    SELECT user_id FROM community_members
     WHERE community_id = NEW.community_id
       AND status = 'active'
       AND role IN ('owner', 'admin', 'moderator')
       AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_admin_id,
      'community_join_request',
      'New join request for ' || COALESCE(v_community_name, 'your community'),
      COALESCE(v_requester_name, 'Someone') || ' wants to join ' || COALESCE(v_community_name, 'your community'),
      jsonb_build_object('community_id', NEW.community_id, 'requester_id', NEW.user_id, 'actor_name', COALESCE(v_requester_name, 'Someone'), 'community_name', COALESCE(v_community_name, 'your community'))
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_community_join_request ON community_members;
CREATE TRIGGER trg_notify_community_join_request
  AFTER INSERT ON community_members
  FOR EACH ROW EXECUTE FUNCTION notify_community_join_request();


-- ─── 6. Fix community likes/comments count triggers (add SECURITY DEFINER) ────

CREATE OR REPLACE FUNCTION sync_community_post_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Re-attach trigger (DROP IF EXISTS first in case it already exists without SECURITY DEFINER)
DROP TRIGGER IF EXISTS trg_community_post_likes_count ON community_post_likes;
CREATE TRIGGER trg_community_post_likes_count
  AFTER INSERT OR DELETE ON community_post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_community_post_likes_count();


CREATE OR REPLACE FUNCTION sync_community_post_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_comments_count ON community_post_comments;
CREATE TRIGGER trg_community_post_comments_count
  AFTER INSERT OR DELETE ON community_post_comments
  FOR EACH ROW EXECUTE FUNCTION sync_community_post_comments_count();


-- ─── 7. Backfill community post counts ────────────────────────────────────────
UPDATE community_posts cp
   SET likes_count    = (SELECT COUNT(*) FROM community_post_likes    l WHERE l.post_id = cp.id);
UPDATE community_posts cp
   SET comments_count = (SELECT COUNT(*) FROM community_post_comments c WHERE c.post_id = cp.id);
