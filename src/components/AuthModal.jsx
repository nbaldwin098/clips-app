import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ open, onClose, initialMode = 'signin' }) {
  const { login } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const finish = (provider, extra = {}) => {
    const mail =
      provider === 'apple'
        ? extra.email || `apple_${Date.now()}@privaterelay.appleid.com`
        : email.trim()
    login({
      email: mail,
      displayName: extra.displayName || displayName.trim() || mail.split('@')[0],
      provider,
    })
    onClose()
  }

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('Enter your name.')
      return
    }
    finish('email')
  }

  const appleSignIn = () => {
    finish('apple', {
      displayName: displayName.trim() || 'Apple User',
      email: `apple_${Date.now()}@privaterelay.appleid.com`,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            type="button"
            onClick={appleSignIn}
            className="w-full h-10 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-900 flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
                  autoComplete="name"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
            >
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  className="text-[#2C729B] font-medium"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-[#2C729B] font-medium"
                  onClick={() => {
                    setMode('signin')
                    setError('')
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Watch without an account. Sign in to comment, post, upload, or go live.
          </p>
        </div>
      </div>
    </div>
  )
}
