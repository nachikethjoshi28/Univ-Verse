-- 012: add location and music_track columns to posts

ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS music_track TEXT;
