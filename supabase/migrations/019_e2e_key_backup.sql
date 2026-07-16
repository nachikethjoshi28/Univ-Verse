-- 019: Password-encrypted E2EE key backup
-- Stores the ECDH private key encrypted with PBKDF2(login_password, salt)
-- so users can restore their key pair on any device after login — the same
-- approach WhatsApp uses with its encrypted cloud key backup.
--
-- The server never sees the plaintext private key. Only the user's password
-- can decrypt it (250,000 PBKDF2 iterations, AES-GCM-256 wrap).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT,
  ADD COLUMN IF NOT EXISTS e2e_key_salt          TEXT,
  ADD COLUMN IF NOT EXISTS e2e_key_iv            TEXT;
