-- ============================================================
-- 010: End-to-end encryption support
-- - profiles.public_key: stores each user's ECDH P-256 public key as JWK JSON
-- - messages.iv: AES-GCM IV (base64); NULL = legacy unencrypted message
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE messages  ADD COLUMN IF NOT EXISTS iv TEXT;
