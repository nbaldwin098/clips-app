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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => lsGet('user', null))
  const [mode, setMode] = useState(() => lsGet('mode', 'viewer'))

  useEffect(() => {
    if (user) lsSet('user', user)
    else lsRemove('user')
  }, [user])

  useEffect(() => {
    lsSet('mode', mode)
  }, [mode])

  const login = useCallback((email = 'viewer@clips.local') => {
    const existing = lsGet('user', null)
    const next = existing && existing.email === email
      ? existing
      : {
          ...DEFAULT_USER,
          id: `user_${Date.now()}`,
          email,
          displayName: email.split('@')[0] || 'Viewer',
          handle: (email.split('@')[0] || 'viewer').toLowerCase().replace(/[^a-z0-9_]/g, ''),
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
