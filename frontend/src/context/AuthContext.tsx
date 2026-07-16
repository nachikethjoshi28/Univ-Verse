import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  loadKeyPairFromStorage,
  saveKeyPairToStorage,
  clearKeyPairFromStorage,
  deriveWrapKey,
  wrapPrivKey,
  unwrapPrivKey,
  randomHex,
  type E2EKeyPair,
} from '../lib/e2e'
import type { Profile } from '../types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  e2eKeyPair: E2EKeyPair | null
  /** Call after login with the user's plaintext password to unlock E2EE on this device. */
  setupE2E: (userId: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [e2eKeyPair, setE2eKeyPair] = useState<E2EKeyPair | null>(null)
  // Prevent duplicate uploads when onAuthStateChange fires multiple times
  const uploadedPubKeyFor = useRef<string | null>(null)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*, university:universities(*)')
      .eq('id', userId)
      .single()
    setProfile(data as Profile | null)
  }

  // On page load/refresh: restore the key pair from the localStorage cache if the
  // cached public key matches what's in the DB (i.e. this device is already set up).
  // If there's no cache, or it doesn't match the DB, we wait for setupE2E (called
  // from LoginPage with the user's password) to decrypt and restore the key.
  async function initE2EForUser(userId: string) {
    if (uploadedPubKeyFor.current === userId) return
    uploadedPubKeyFor.current = userId
    try {
      const cached = await loadKeyPairFromStorage(userId)
      if (!cached) return  // no cache; needs setupE2E after explicit login

      const { data } = await supabase.from('profiles')
        .select('public_key')
        .eq('id', userId)
        .maybeSingle()
      const dbPub = (data as any)?.public_key as string | null

      if (dbPub && dbPub !== JSON.stringify(cached.publicKeyJwk)) {
        // Stale cache (e.g. another device changed the key) — wipe it and wait for login
        clearKeyPairFromStorage(userId)
        return
      }
      setE2eKeyPair(cached)
    } catch {
      // non-fatal
    }
  }

  // Called from LoginPage right after supabase.auth.signInWithPassword succeeds.
  // Uses the user's plaintext password to derive a PBKDF2 wrapping key and decrypt
  // the ECDH private key stored in the DB — exactly how WhatsApp restores your key
  // from an encrypted cloud backup when you log in on a new device.
  async function setupE2E(userId: string, password: string): Promise<void> {
    try {
      const { data } = await supabase.from('profiles')
        .select('encrypted_private_key, e2e_key_salt, e2e_key_iv, public_key')
        .eq('id', userId)
        .maybeSingle()
      const d = data as Record<string, string> | null

      if (d?.encrypted_private_key && d?.e2e_key_salt && d?.e2e_key_iv && d?.public_key) {
        // Existing key — decrypt with this password
        const wrapKey = await deriveWrapKey(password, d.e2e_key_salt)
        const privateKey = await unwrapPrivKey(d.encrypted_private_key, d.e2e_key_iv, wrapKey)
        const publicKeyJwk = JSON.parse(d.public_key) as JsonWebKey
        const kp: E2EKeyPair = { privateKey, publicKeyJwk }
        setE2eKeyPair(kp)
        // Refresh localStorage cache for fast access on refresh
        const privJwk = await crypto.subtle.exportKey('jwk', privateKey)
        saveKeyPairToStorage(userId, publicKeyJwk, privJwk)
        uploadedPubKeyFor.current = userId
      } else {
        // First-time setup — generate a fresh ECDH key pair
        const rawKp = await crypto.subtle.generateKey(
          { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
        )
        const [pub, priv] = await Promise.all([
          crypto.subtle.exportKey('jwk', rawKp.publicKey),
          crypto.subtle.exportKey('jwk', rawKp.privateKey),
        ])
        saveKeyPairToStorage(userId, pub, priv)
        setE2eKeyPair({ privateKey: rawKp.privateKey, publicKeyJwk: pub })
        // Encrypt the private key with PBKDF2(password) and persist to DB
        const salt = randomHex(16)
        const wrapKey = await deriveWrapKey(password, salt)
        const { wrapped, iv } = await wrapPrivKey(rawKp.privateKey, wrapKey)
        await supabase.from('profiles').update({
          public_key: JSON.stringify(pub),
          encrypted_private_key: wrapped,
          e2e_key_salt: salt,
          e2e_key_iv: iv,
        }).eq('id', userId)
        uploadedPubKeyFor.current = userId
      }
    } catch (err) {
      console.error('[E2EE] setupE2E failed:', err)
      // Non-fatal — the user can still use the app; Chats will show "channel not ready"
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function signOut() {
    const uid = user?.id
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setE2eKeyPair(null)
    uploadedPubKeyFor.current = null
    // Clear cache so the next login always re-derives the key via setupE2E (DB path),
    // preventing a stale cache from being used if the key rotated on another device.
    if (uid) clearKeyPairFromStorage(uid)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
        initE2EForUser(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        initE2EForUser(session.user.id)
      } else {
        setProfile(null)
        setE2eKeyPair(null)
        uploadedPubKeyFor.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, e2eKeyPair, setupE2E, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
