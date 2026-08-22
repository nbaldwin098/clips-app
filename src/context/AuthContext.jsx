import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { lsGet, lsSet, lsRemove } from '../lib/storage'
import { indexUser, validateHandle, normalizeHandle } from '../lib/moderation'

const AuthContext = createContext(null)

const DEFAULT_USER = {
  id: 'user_local',
  email: '',
  displayName: 'Viewer',
  handle: 'viewer',
  isCreator: false,
  creatorStatus: 'none',
  avatar: null,
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => sanitizeUser(lsGet('user', null)))
  const [mode, setMode] = useState(() => lsGet('mode', 'viewer'))

  useEffect(() => {
    if (user) lsSet('user', user)
    else lsRemove('user')
  }, [user])

  useEffect(() => {
    lsSet('mode', mode)
  }, [mode])

  useEffect(() => {
    const raw = lsGet('user', null)
    if (raw && !sanitizeUser(raw)) {
      lsRemove('user')
      setUser(null)
      setMode('viewer')
    }
  }, [])

  const login = useCallback((payload = {}) => {
    const email =
      typeof payload === 'string' ? payload : payload.email || 'viewer@clips.local'
    const displayName =
      typeof payload === 'object' && payload.displayName
        ? payload.displayName
        : email.split('@')[0] || 'Viewer'
    const provider =
      typeof payload === 'object' && payload.provider ? payload.provider : 'email'

    const existing = sanitizeUser(lsGet('user', null))
    if (existing && existing.email === email) {
      const next = { ...existing, provider, displayName }
      setUser(next)
      setMode('viewer')
      try { indexUser(next) } catch {}
      return
    }

    const handle = pickUniqueHandle(
      (typeof payload === 'object' && payload.handle) || displayName || 'user'
    )
    const next = {
      ...DEFAULT_USER,
      id: `user_${Date.now()}`,
      email,
      displayName,
      handle,
      provider,
      creatorStatus: 'none',
    }
    setUser(next)
    setMode('viewer')
    try { indexUser(next) } catch {}
  }, [])

  const logout = useCallback(() => {
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

  const switchMode = useCallback((next) => {
    setMode(next)
  }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    mode,
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
