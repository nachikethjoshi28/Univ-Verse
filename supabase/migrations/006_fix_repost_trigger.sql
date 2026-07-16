-- Allow null content and media for repost rows
ALTER TABLE posts ALTER COLUMN content DROP NOT NULL;

-- Also allow null media_urls (it may already be nullable, this is safe)
ALTER TABLE posts ALTER COLUMN media_urls DROP NOT NULL;

-- Fix trigger to use SECURITY DEFINER so it can UPDATE other users' posts
-- (bypasses RLS when incrementing/decrementing reposts_count)
CREATE OR REPLACE FUNCTION handle_repost_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.repost_of_id IS NOT NULL THEN
    UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.repost_of_id;
  ELSIF TG_OP = 'DELETE' AND OLD.repost_of_id IS NOT NULL THEN
    UPDATE posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.repost_of_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
