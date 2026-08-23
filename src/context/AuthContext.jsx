import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { lsGet, lsSet, lsRemove } from '../lib/storage'
import { indexUser, validateHandle, normalizeHandle, isPlatformOwner } from '../lib/moderation'
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { pullWatchProgressFromCloud } from '../lib/watchProgress'
import { setGraphActor, syncGraphFromCloud } from '../lib/graphSync'
import { ensureOwnProfile, privilegesFromProfile } from '../lib/profiles'
import { hashSecret, verifySecret } from '../lib/secrets'

const AuthContext = createContext(null)
const DEFAULT_USER = {
  id: 'user_local', email: '', displayName: 'Viewer', handle: 'viewer',
  isCreator: false, creatorStatus: 'none', avatar: null, role: 'user',
}
const PRIVILEGE_KEYS = new Set(['isPlatformAdmin', 'isCreator', 'creatorStatus', 'role', 'id', 'provider'])

function persistableUser(u) {
  if (!u || typeof u !== 'object') return null
  return {
    id: String(u.id || '').slice(0, 80),
    email: String(u.email || '').slice(0, 200),
    displayName: String(u.displayName || 'Viewer').slice(0, 80),
    handle: normalizeHandle(u.handle) || 'viewer',
    provider: u.provider === 'supabase' ? 'supabase' : 'local',
    avatarUrl: u.avatarUrl || null,
    bannerUrl: u.bannerUrl || null,
    bio: String(u.bio || '').slice(0, 500),
    passwordHash: u.passwordHash || undefined,
    isCreator: false,
    creatorStatus: 'none',
    isPlatformAdmin: false,
    role: 'user',
  }
}

function sanitizeUser(u) {
  const persisted = persistableUser(u)
  if (!persisted?.id) return null
  return {
    ...DEFAULT_USER,
    ...persisted,
    isCreator: false,
    creatorStatus: 'none',
    isPlatformAdmin: false,
    role: 'user',
  }
}

function pickUniqueHandle(raw, exceptUserId = null) {
  let v = validateHandle(raw, { currentUserId: exceptUserId })
  if (v.ok) return v.handle
  let base = normalizeHandle(raw) || 'user'
  if (base.length < 3) base = 'user'
  if (!/^[a-z]/.test(base)) base = `u${base}`.slice(0, 24)
  for (let i = 0; i < 99; i++) {
    const tryH = (i === 0 ? base : `${base}${i}`).slice(0, 24)
    v = validateHandle(tryH, { currentUserId: exceptUserId })
    if (v.ok) return v.handle
  }
  return `user${Date.now().toString(36).slice(-6)}`
}

function mapSbUser(sbUser, meta = {}) {
  const email = sbUser.email || meta.email || ''
  const handle =
    meta.handle || sbUser.user_metadata?.handle || pickUniqueHandle(email.split('@')[0] || 'user')
  const displayName =
    meta.displayName || sbUser.user_metadata?.display_name || email.split('@')[0] || 'Viewer'
  return {
    ...DEFAULT_USER,
    id: sbUser.id,
    email,
    displayName,
    handle: String(handle).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user',
    provider: 'supabase',
    creatorStatus: 'none',
    isCreator: false,
    isPlatformAdmin: false,
    role: 'user',
    avatarUrl: meta.avatarUrl || sbUser.user_metadata?.avatar_url || null,
    bannerUrl: meta.bannerUrl || null,
    bio: meta.bio || '',
  }
}

async function hydratePrivileges(mapped) {
  if (!mapped) return mapped
  try {
    const profile = await ensureOwnProfile(mapped)
    const owner = isPlatformOwner({ ...mapped, role: profile?.role })
    const priv = privilegesFromProfile(profile, owner)
    return { ...mapped, ...priv }
  } catch {
    const owner = isPlatformOwner(mapped)
    return {
      ...mapped,
      isPlatformAdmin: owner,
      isCreator: owner,
      creatorStatus: owner ? 'approved' : 'none',
      role: owner ? 'admin' : 'user',
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => sanitizeUser(lsGet('user', null)))
  const [mode, setMode] = useState(() => lsGet('mode', 'viewer'))
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured())

  useEffect(() => {
    if (user) lsSet('user', persistableUser(user))
    else lsRemove('user')
  }, [user])
  useEffect(() => { lsSet('mode', mode) }, [mode])

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      if (!isSupabaseConfigured()) { setAuthReady(true); return }
      try {
        const sb = await getSupabase()
        if (!sb) { setAuthReady(true); return }
        const { data: { session } } = await sb.auth.getSession()
        if (session?.user) {
          const mapped = await hydratePrivileges(mapSbUser(session.user))
          setUser(mapped)
          try { indexUser(mapped) } catch {}
          try { await pullWatchProgressFromCloud(mapped.id) } catch {}
          setGraphActor(mapped)
          try { await syncGraphFromCloud() } catch {}
        } else {
          setGraphActor(null)
          setUser((prev) => (prev?.provider === 'supabase' ? null : sanitizeUser(prev)))
        }
        const { data } = sb.auth.onAuthStateChange(async (_event, sess) => {
          if (sess?.user) {
            const mapped = await hydratePrivileges(mapSbUser(sess.user))
            setUser(mapped)
            try { indexUser(mapped) } catch {}
            try { await pullWatchProgressFromCloud(mapped.id) } catch {}
            setGraphActor(mapped)
            try { await syncGraphFromCloud() } catch {}
          } else {
            setGraphActor(null)
            setUser((prev) => (prev?.provider === 'supabase' ? null : prev))
          }
        })
        unsub = () => data.subscription.unsubscribe()
      } catch (e) {
        console.warn('[Clips] Supabase session restore failed', e)
      } finally {
        setAuthReady(true)
      }
    })()
    return () => unsub()
  }, [])

  const login = useCallback(async (payload = {}) => {
    const email = typeof payload === 'string' ? payload : payload.email || ''
    const password = typeof payload === 'object' ? payload.password || '' : ''
    const displayName =
      typeof payload === 'object' && payload.displayName
        ? payload.displayName
        : email.split('@')[0] || 'Viewer'
    const modeAuth = typeof payload === 'object' && payload.mode === 'signup' ? 'signup' : 'signin'
    const handleRaw = (typeof payload === 'object' && payload.handle) || displayName || 'user'

    if (isSupabaseConfigured() && email && password) {
      const sb = await getSupabase()
      if (sb) {
        if (modeAuth === 'signup') {
          const handle = pickUniqueHandle(handleRaw)
          const { data, error } = await sb.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: { data: { display_name: displayName, handle } },
          })
          if (error) throw new Error(error.message)
          if (data.user) {
            const mapped = await hydratePrivileges(mapSbUser(data.user, { displayName, handle }))
            setUser(mapped)
            setMode('viewer')
            try { indexUser(mapped) } catch {}
            setGraphActor(mapped)
            try { await syncGraphFromCloud() } catch {}
            return mapped
          }
          return { pendingEmailConfirm: true, email }
        }
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw new Error(error.message)
        const mapped = await hydratePrivileges(mapSbUser(data.user, { displayName }))
        setUser(mapped)
        setMode('viewer')
        try { indexUser(mapped) } catch {}
        try { await pullWatchProgressFromCloud(mapped.id) } catch {}
        setGraphActor(mapped)
        try { await syncGraphFromCloud() } catch {}
        return mapped
      }
      throw new Error('Sign-in is temporarily unavailable. Try again.')
    }

    if (isSupabaseConfigured()) {
      throw new Error('Use your synced email and password.')
    }

    if (!email || !password || password.length < 6) {
      throw new Error('Email and a password of at least 6 characters are required.')
    }

    const existing = sanitizeUser(lsGet('user', null))
    if (existing && existing.email === email) {
      const stored = lsGet('user', null)
      if (!stored?.passwordHash) {
        throw new Error('This local account cannot be recovered. Create a new one.')
      }
      const ok = await verifySecret(password, stored.passwordHash)
      if (!ok) throw new Error('Invalid email or password')
      const next = { ...existing, displayName, passwordHash: stored.passwordHash }
      setUser(next)
      setMode('viewer')
      try { indexUser(next) } catch {}
      return next
    }

    const handle = pickUniqueHandle(handleRaw)
    const passwordHash = await hashSecret(password)
    const next = {
      ...DEFAULT_USER,
      id: `user_${Date.now()}`,
      email,
      displayName,
      handle,
      provider: 'local',
      passwordHash,
      creatorStatus: 'none',
      isCreator: false,
      isPlatformAdmin: false,
      role: 'user',
    }
    setUser(next)
    setMode('viewer')
    try { indexUser(next) } catch {}
    return next
  }, [])

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        const sb = await getSupabase()
        if (sb) await sb.auth.signOut()
      }
    } catch {}
    setGraphActor(null)
    setUser(null)
    setMode('viewer')
    lsRemove('user')
    lsSet('mode', 'viewer')
  }, [])

  const loginWithOAuth = useCallback(async (provider) => {
    const labels = { apple: 'Apple', azure: 'Microsoft' }
    if (!labels[provider]) throw new Error('That sign-in is not available.')
    if (!isSupabaseConfigured()) {
      throw new Error(`${labels[provider]} sign-in needs Supabase on this deploy.`)
    }
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not reach auth.')
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) throw new Error(error.message)
    return { redirected: true }
  }, [])

  const updateProfile = useCallback((partial) => {
    if (!partial || typeof partial !== 'object') return
    const safe = { ...partial }
    for (const key of PRIVILEGE_KEYS) delete safe[key]
    if (safe.handle != null) {
      const cur = lsGet('user', null)
      const v = validateHandle(safe.handle, { currentUserId: cur?.id })
      if (!v.ok) throw new Error(v.error || 'Invalid handle')
      safe.handle = v.handle
    }
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...safe }
      lsSet('user', persistableUser(next))
      try { indexUser(next) } catch {}
      return next
    })
  }, [])

  const enableCreatorMode = useCallback(() => {
    setUser((prev) => {
      if (prev?.creatorStatus === 'approved') {
        queueMicrotask(() => setMode('creator'))
      }
      return prev
    })
  }, [])

  const switchMode = useCallback((next) => { setMode(next) }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    mode,
    authReady,
    backend: isSupabaseConfigured() ? 'supabase' : 'local',
    login,
    loginWithOAuth,
    logout,
    updateProfile,
    enableCreatorMode,
    switchMode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
