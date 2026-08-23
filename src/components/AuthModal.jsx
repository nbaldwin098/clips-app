import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ open, onClose, initialMode = 'signin' }) {
  const { login, backend } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      setPassword('')
      setBusy(false)
    }
  }, [open, initialMode])

  if (!open) return null

  const submit = async (e) => {
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
        setError('Username must be at least 3 characters.')
        return
      }
    }
    setBusy(true)
    try {
      const result = await login({
        email: mail,
        password,
        mode,
        displayName: displayName.trim() || mail.split('@')[0],
        handle: handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || undefined,
      })
      if (result?.pendingEmailConfirm) {
        setError('Check your email to confirm, then sign in.')
        setMode('signin')
        setBusy(false)
        return
      }
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2f2f37] bg-[#1f1f23] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f37]">
          <div>
            <h2 className="text-lg font-semibold text-[#efeff1]">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {backend === 'supabase' ? 'Synced across devices' : 'Local this device'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-white">Display name</span>
                  <input
                    value={displayName}
                    onChange={(e) => {
                      const v = e.target.value
                      setDisplayName(v)
                      if (!handle.trim()) setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))
                    }}
                    className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-white">Username</span>
                  <div className="mt-1 flex">
                    <span className="inline-flex items-center h-10 px-3 rounded-l-lg border border-r-0 border-[#2f2f37] bg-[#18181b] text-zinc-500 text-sm">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))}
                      className="h-10 flex-1 rounded-r-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>
                </label>
              </>
            )}
            <label className="block">
              <span className="text-xs font-medium text-white">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white" autoComplete="email" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-white">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </label>
            {mode === 'signup' && (
              <p className="text-[11px] text-zinc-500">Tip: use your name or brand as @username so people recognize your public profile.</p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="w-full h-10 rounded-lg bg-white text-black font-bold text-sm hover:bg-zinc-200 disabled:opacity-60 transition-all">
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="text-xs text-zinc-500 text-center mt-4">
            {mode === 'signin' ? (
              <>No account? <button type="button" className="text-white font-medium" onClick={() => setMode('signup')}>Sign up</button></>
            ) : (
              <>Have an account? <button type="button" className="text-white font-medium" onClick={() => setMode('signin')}>Sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
