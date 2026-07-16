-- Add archive support to posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient archived-post queries per user
CREATE INDEX IF NOT EXISTS posts_user_archived_idx ON posts(user_id, is_archived);
