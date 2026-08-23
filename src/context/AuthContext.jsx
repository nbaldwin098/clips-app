import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { lsGet, lsSet, lsRemove } from '../lib/storage'
import { indexUser, validateHandle, normalizeHandle } from '../lib/moderation'
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { pullWatchProgressFromCloud } from '../lib/watchProgress'

const AuthContext = createContext(null)
const DEFAULT_USER = {
  id: 'user_local', email: '', displayName: 'Viewer', handle: 'viewer',
  isCreator: false, creatorStatus: 'none', avatar: null,
}

function sanitizeUser(u) {
  if (!u || typeof u !== 'object') return null
  return u
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
    creatorStatus: meta.creatorStatus || sbUser.user_metadata?.creator_status || 'none',
    isCreator: !!(meta.isCreator || sbUser.user_metadata?.is_creator),
    isPlatformAdmin: String(handle).toLowerCase() === 'cs1',
    avatarUrl: meta.avatarUrl || sbUser.user_metadata?.avatar_url || null,
    bannerUrl: meta.bannerUrl || null,
    bio: meta.bio || '',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => sanitizeUser(lsGet('user', null)))
  const [mode, setMode] = useState(() => lsGet('mode', 'viewer'))
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured())

  useEffect(() => {
    if (user) lsSet('user', user)
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
          const mapped = mapSbUser(session.user)
          if (mapped.handle === 'cs1') {
            mapped.creatorStatus = 'approved'
            mapped.isCreator = true
            mapped.isPlatformAdmin = true
          }
          setUser(mapped)
          try { indexUser(mapped) } catch {}
          try { await pullWatchProgressFromCloud(mapped.id) } catch {}
        }
        const { data } = sb.auth.onAuthStateChange(async (_event, sess) => {
          if (sess?.user) {
            const mapped = mapSbUser(sess.user)
            if (mapped.handle === 'cs1') {
              mapped.creatorStatus = 'approved'
              mapped.isCreator = true
              mapped.isPlatformAdmin = true
            }
            setUser(mapped)
            try { indexUser(mapped) } catch {}
            try { await pullWatchProgressFromCloud(mapped.id) } catch {}
          } else {
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

  useEffect(() => {
    if (!user) return
    const h = String(user.handle || '').toLowerCase()
    if (h === 'cs1' && (user.creatorStatus !== 'approved' || !user.isPlatformAdmin)) {
      const next = { ...user, creatorStatus: 'approved', isCreator: true, isPlatformAdmin: true }
      setUser(next)
      lsSet('user', next)
      try { indexUser(next) } catch {}
      return
    }
    const indexed = lsGet('users_index', {})[user.id]
    if (
      indexed
      && indexed.creatorStatus
      && (indexed.creatorStatus !== user.creatorStatus || !!indexed.isCreator !== !!user.isCreator)
    ) {
      const next = {
        ...user,
        creatorStatus: indexed.creatorStatus,
        isCreator: indexed.creatorStatus === 'approved' || !!indexed.isCreator,
      }
      setUser(next)
    }
  }, [user?.id, user?.handle, user?.creatorStatus, user?.isCreator, user?.isPlatformAdmin])

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
            const mapped = mapSbUser(data.user, { displayName, handle })
            if (mapped.handle === 'cs1') {
              mapped.creatorStatus = 'approved'
              mapped.isCreator = true
              mapped.isPlatformAdmin = true
            }
            setUser(mapped)
            setMode('viewer')
            try { indexUser(mapped) } catch {}
            return mapped
          }
          return { pendingEmailConfirm: true, email }
        }
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw new Error(error.message)
        const mapped = mapSbUser(data.user, { displayName })
        if (mapped.handle === 'cs1') {
          mapped.creatorStatus = 'approved'
          mapped.isCreator = true
          mapped.isPlatformAdmin = true
        }
        setUser(mapped)
        setMode('viewer')
        try { indexUser(mapped) } catch {}
        try { await pullWatchProgressFromCloud(mapped.id) } catch {}
        return mapped
      }
    }

    const existing = sanitizeUser(lsGet('user', null))
    if (existing && existing.email === email) {
      const next = { ...existing, displayName }
      setUser(next)
      setMode('viewer')
      try { indexUser(next) } catch {}
      return next
    }
    const handle = pickUniqueHandle(handleRaw)
    const next = {
      ...DEFAULT_USER,
      id: `user_${Date.now()}`,
      email,
      displayName,
      handle,
      provider: 'local',
      creatorStatus: handle === 'cs1' ? 'approved' : 'none',
      isCreator: handle === 'cs1',
      isPlatformAdmin: handle === 'cs1',
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
    setUser(null)
    setMode('viewer')
    lsRemove('user')
    lsSet('mode', 'viewer')
  }, [])

  const updateProfile = useCallback((partial) => {
    if (partial && partial.handle != null) {
      const cur = lsGet('user', null)
      const v = validateHandle(partial.handle, { currentUserId: cur?.id })
      if (!v.ok) throw new Error(v.error || 'Invalid handle')
      partial = { ...partial, handle: v.handle }
    }
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      lsSet('user', next)
      try { indexUser(next) } catch {}
      return next
    })
  }, [])

  const enableCreatorMode = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, isCreator: true }
      lsSet('user', next)
      try { indexUser(next) } catch {}
      return next
    })
    setMode('creator')
  }, [])

  const switchMode = useCallback((next) => { setMode(next) }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    mode,
    authReady,
    backend: isSupabaseConfigured() ? 'supabase' : 'local',
    login,
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
