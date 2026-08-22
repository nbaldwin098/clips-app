import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const DEMO_USER = {
  id: 'user_demo',
  email: 'viewer@clips.local',
  displayName: 'Demo Viewer',
  handle: 'demoviewer',
  isCreator: false,
  avatar: null,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('viewer') // 'viewer' | 'creator'

  const login = useCallback((email = 'viewer@clips.local') => {
    setUser({ ...DEMO_USER, email })
    setMode('viewer')
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setMode('viewer')
  }, [])

  const enableCreatorMode = useCallback(() => {
    if (!user) return
    setUser(prev => ({
      ...prev,
      isCreator: true,
      handle: prev.handle || 'creator',
      displayName: prev.displayName || 'Creator',
    }))
    setMode('creator')
  }, [user])

  const switchMode = useCallback((next) => {
    if (next === 'creator' && user && !user.isCreator) {
      enableCreatorMode()
    } else {
      setMode(next)
    }
  }, [user, enableCreatorMode])

  const value = {
    user,
    isAuthenticated: !!user,
    mode,
    login,
    logout,
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
