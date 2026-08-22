import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/** Email + password only (sign up also asks display name + handle). */
export default function AuthModal({ open, onClose, initialMode = 'signin' }) {
  const { login } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      setPassword('')
    }
  }, [open, initialMode])

  if (!open) return null

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const mail = email.trim().toLowerCase()
    if (!mail || !mail.includes('@')) {
      setError('Enter a valid email.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (mode === 'signup') {
      const name = displayName.trim()
      const h = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (!name) {
        setError('Enter a display name.')
        return
      }
      if (h.length < 3) {
        setError('Handle must be at least 3 characters.')
        return
      }
      login({ email: mail, displayName: name, handle: h, provider: 'email' })
    } else {
      login({ email: mail, displayName: mail.split('@')[0], provider: 'email' })
    }
    setEmail('')
    setPassword('')
    setDisplayName('')
    setHandle('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-[#121218] shadow-2xl border border-zinc-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-[#007ACC]">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800">
            <X className="h-4 w-4 text-[#007ACC]" />
          </button>
        </div>

        <div className="p-5">
          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-[#007ACC]">Display name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#007ACC]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-[#007ACC]">Handle</span>
                  <div className="mt-1 flex">
                    <span className="h-10 flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-800 bg-zinc-900 text-sm text-[#007ACC]">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())}
                      className="h-10 flex-1 rounded-r-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#007ACC]"
                    />
                  </div>
                </label>
              </>
            )}
            <label className="block">
              <span className="text-xs font-medium text-[#007ACC]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#007ACC]"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#007ACC]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#007ACC]"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" className="w-full h-10 rounded-lg bg-[#007ACC] text-white text-sm font-medium hover:bg-[#0098ff]">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-zinc-500 text-center mt-4">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button type="button" className="text-[#007ACC] font-medium" onClick={() => setMode('signup')}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Have an account?{' '}
                <button type="button" className="text-[#007ACC] font-medium" onClick={() => setMode('signin')}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
