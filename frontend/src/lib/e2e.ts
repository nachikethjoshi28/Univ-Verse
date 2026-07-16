const STORAGE_KEY = (uid: string) => `univ_e2e_${uid}`

export type E2EKeyPair = { privateKey: CryptoKey; publicKeyJwk: JsonWebKey }

// ── localStorage cache helpers ─────────────────────────────────────────────

export async function loadKeyPairFromStorage(userId: string): Promise<E2EKeyPair | null> {
  const stored = localStorage.getItem(STORAGE_KEY(userId))
  if (!stored) return null
  try {
    const { pub, priv } = JSON.parse(stored)
    const privateKey = await crypto.subtle.importKey(
      'jwk', priv,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,  // extractable so it can be wrapped for cloud backup
      ['deriveKey', 'deriveBits']
    )
    return { privateKey, publicKeyJwk: pub as JsonWebKey }
  } catch {
    return null
  }
}

export function saveKeyPairToStorage(userId: string, pub: JsonWebKey, priv: JsonWebKey): void {
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify({ pub, priv }))
}

export function clearKeyPairFromStorage(userId: string): void {
  localStorage.removeItem(STORAGE_KEY(userId))
}

// Kept for legacy callers that haven't migrated to setupE2E yet
export async function getOrCreateKeyPair(userId: string): Promise<E2EKeyPair> {
  const cached = await loadKeyPairFromStorage(userId)
  if (cached) return cached

  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
  const [pub, priv] = await Promise.all([
    crypto.subtle.exportKey('jwk', kp.publicKey),
    crypto.subtle.exportKey('jwk', kp.privateKey),
  ])
  saveKeyPairToStorage(userId, pub, priv)
  return { privateKey: kp.privateKey, publicKeyJwk: pub }
}

// ── Password-based encrypted key backup (WhatsApp-style) ──────────────────
// The ECDH private key is encrypted with a key derived from the user's login
// password via PBKDF2. The encrypted blob is stored in the DB so the same
// key pair is accessible from any device after login — without the server
// ever seeing the plaintext private key.

export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Derive an AES-GCM-256 wrapping key from the user's password + a random salt.
export async function deriveWrapKey(password: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

// AES-GCM wrap an ECDH private key → base64 blob + IV.
export async function wrapPrivKey(
  privateKey: CryptoKey,
  wrapKey: CryptoKey
): Promise<{ wrapped: string; iv: string }> {
  const ivBuf = new Uint8Array(12)
  crypto.getRandomValues(ivBuf)
  const wrapped = await crypto.subtle.wrapKey('jwk', privateKey, wrapKey, { name: 'AES-GCM', iv: ivBuf })
  const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  return { wrapped: toB64(wrapped), iv: toB64(ivBuf.buffer as ArrayBuffer) }
}

// AES-GCM unwrap → ECDH private key.
export async function unwrapPrivKey(
  wrappedB64: string,
  ivB64: string,
  wrapKey: CryptoKey
): Promise<CryptoKey> {
  const fromB64 = (s: string): ArrayBuffer => {
    const raw = atob(s); const buf = new ArrayBuffer(raw.length)
    const view = new Uint8Array(buf)
    for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
    return buf
  }
  return crypto.subtle.unwrapKey(
    'jwk',
    fromB64(wrappedB64),
    wrapKey,
    { name: 'AES-GCM', iv: fromB64(ivB64) },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,  // extractable so we can re-cache in localStorage
    ['deriveKey', 'deriveBits']
  )
}

export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  const theirPublicKey = await crypto.subtle.importKey(
    'jwk', theirPublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encode ArrayBuffer → base64 string
function b64(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < view.length; i++) str += String.fromCharCode(view[i])
  return btoa(str)
}

// Decode base64 string → ArrayBuffer (unambiguous ArrayBuffer, not ArrayBufferLike)
function unb64(s: string): ArrayBuffer {
  const raw = atob(s)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buf
}

export async function encryptMsg(
  text: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  // Use ArrayBuffer directly so the type is unambiguous for AesGcmParams.iv
  const ivBuf = new ArrayBuffer(12)
  crypto.getRandomValues(new Uint8Array(ivBuf))

  const encoded = new TextEncoder().encode(text)
  // Slice to get a plain ArrayBuffer (avoids SharedArrayBuffer union type)
  const textBuf: ArrayBuffer = encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength
  ) as ArrayBuffer

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBuf },
    key,
    textBuf
  )
  return { ciphertext: b64(cipherBuf), iv: b64(ivBuf) }
}

export async function decryptMsg(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(iv) },
    key,
    unb64(ciphertext)
  )
  return new TextDecoder().decode(buf)
}
