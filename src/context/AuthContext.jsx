import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { lsGet, lsSet, lsRemove } from '../lib/storage'

const AuthContext = createContext(null)

const DEFAULT_USER = {
  id: 'user_local',
  email: '',
  displayName: 'Viewer',
  handle: 'viewer',
  isCreator: false,
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
    const next =
      existing && existing.email === email
        ? { ...existing, provider, displayName }
        : {
            ...DEFAULT_USER,
            id: `user_${Date.now()}`,
            email,
            displayName,
            handle:
              (typeof payload === 'object' && payload.handle
                ? String(payload.handle).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
                : '') ||
              displayName
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '')
                .slice(0, 24) ||
              'user',
            provider,
          }
    setUser(next)
    setMode('viewer')
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
      const next = { ...prev, ...partial }
      lsSet('user', next)
      return next
    })
  }, [])

  const enableCreatorMode = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        isCreator: true,
        handle: prev.handle || 'creator',
        displayName: prev.displayName || 'Creator',
      }
      lsSet('user', next)
      return next
    })
    setMode('creator')
  }, [])

  const switchMode = useCallback((next) => {
    if (next === 'creator') {
      setUser((prev) => {
        if (!prev) return prev
        if (prev.isCreator) return prev
        const updated = {
          ...prev,
          isCreator: true,
          handle: prev.handle || 'creator',
          displayName: prev.displayName || 'Creator',
        }
        lsSet('user', updated)
        return updated
      })
    }
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
