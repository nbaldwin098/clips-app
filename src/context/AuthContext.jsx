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
    let handleRaw =
      (typeof payload === 'object' && payload.handle) || displayName || 'user'
    let v = validateHandle(handleRaw, {
      currentUserId: existing?.email === email ? existing.id : null,
    })
    if (!v.ok) {
      let base = normalizeHandle(handleRaw) || 'user'
      if (base.length < 3) base = 'user'
      for (let i = 0; i < 50; i++) {
        const tryH = (i === 0 ? base : `${base}${i}`).slice(0, 24)
        v = validateHandle(tryH, {
          currentUserId: existing?.email === email ? existing.id : null,
        })
        if (v.ok) break
      }
    }
    const next =
      existing && existing.email === email
        ? { ...existing, provider, displayName, handle: existing.handle || v.handle }
        : {
            ...DEFAULT_USER,
            id: `user_${Date.now()}`,
            email,
            displayName,
            handle: v.handle,
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
    setUser((prev) => {
      if (!prev) return prev
      let next = { ...prev, ...partial }
      if (partial.handle != null) {
        const v = validateHandle(partial.handle, { currentUserId: prev.id })
        if (!v.ok) throw new Error(v.error || 'Invalid handle')
        next.handle = v.handle
      }
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
