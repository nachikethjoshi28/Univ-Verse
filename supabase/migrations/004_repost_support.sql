-- Add repost support to the posts table
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS repost_of_id  UUID REFERENCES posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reposts_count INTEGER NOT NULL DEFAULT 0;

-- Trigger to keep reposts_count accurate
CREATE OR REPLACE FUNCTION handle_repost_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.repost_of_id IS NOT NULL THEN
    UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.repost_of_id;
  ELSIF TG_OP = 'DELETE' AND OLD.repost_of_id IS NOT NULL THEN
    UPDATE posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.repost_of_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS posts_repost_count_trigger ON posts;
CREATE TRIGGER posts_repost_count_trigger
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION handle_repost_count();
