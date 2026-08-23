import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { listIndexedUsers } from '../lib/moderation'

export default function AuthModal({ open, onClose, initialMode = 'signin' }) {
  const { login, loginWithGoogle, backend } = useAuth()
  const [mode, setMode] = useState(initialMode) // signin | signup | forgot-pass | forgot-user
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      setInfo('')
      setPassword('')
      setBusy(false)
    }
  }, [open, initialMode])

  if (!open) return null

  const title =
    mode === 'signup'
      ? 'Create account'
      : mode === 'forgot-pass'
        ? 'Reset password'
        : mode === 'forgot-user'
          ? 'Find username'
          : 'Sign in'

  const sendPasswordReset = async () => {
    setError('')
    setInfo('')
    const mail = email.trim().toLowerCase()
    if (!mail || !mail.includes('@')) {
      setError('Enter the email on your account.')
      return
    }
    setBusy(true)
    try {
      if (!isSupabaseConfigured()) {
        setError('Password reset needs Supabase. Sign up again on this device if you only used local login.')
        setBusy(false)
        return
      }
      const sb = await getSupabase()
      if (!sb) {
        setError('Could not reach auth service.')
        setBusy(false)
        return
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      const { error: resetErr } = await sb.auth.resetPasswordForEmail(mail, {
        redirectTo,
      })
      if (resetErr) throw new Error(resetErr.message)
      setInfo('If that email is registered, a reset link was sent. Check inbox and spam.')
    } catch (err) {
      setError(err?.message || 'Could not send reset email.')
    } finally {
      setBusy(false)
    }
  }

  const findUsername = () => {
    setError('')
    setInfo('')
    const mail = email.trim().toLowerCase()
    if (!mail || !mail.includes('@')) {
      setError('Enter the email on your account.')
      return
    }
    const users = listIndexedUsers()
    const match = users.find((u) => String(u.email || '').toLowerCase() === mail)
    if (match?.handle) {
      setInfo(`Your username is @${match.handle}`)
    } else {
      setInfo(
        'No username found on this device for that email. Sign in with email — your @username shows on your profile after login. Or check Supabase → Authentication → Users.'
      )
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (mode === 'forgot-pass') {
      await sendPasswordReset()
      return
    }
    if (mode === 'forgot-user') {
      findUsername()
      return
    }

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
            <h2 className="text-lg font-semibold text-[#efeff1]">{title}</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {backend === 'supabase' ? 'Synced across devices' : 'Local this device'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          {(mode === 'signin' || mode === 'signup') && backend === 'supabase' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setError('')
                  setBusy(true)
                  try {
                    await loginWithGoogle()
                  } catch (err) {
                    setError(err?.message || 'Google sign-in is not turned on in Supabase yet.')
                    setBusy(false)
                  }
                }}
                className="w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] text-sm font-semibold text-white hover:bg-[#18181b] disabled:opacity-60"
              >
                Continue with Google
              </button>
              <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-zinc-600">
                <span className="h-px flex-1 bg-[#2f2f37]" />
                or email
                <span className="h-px flex-1 bg-[#2f2f37]" />
              </div>
            </>
          )}
          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-zinc-300">Display name</span>
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
                  <span className="text-xs font-medium text-zinc-300">Username</span>
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
              <span className="text-xs font-medium text-zinc-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                autoComplete="email"
              />
            </label>

            {(mode === 'signin' || mode === 'signup') && (
              <label className="block">
                <span className="text-xs font-medium text-zinc-300">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </label>
            )}

            {mode === 'forgot-pass' && (
              <p className="text-xs text-zinc-500">We’ll email a reset link if this address has an account.</p>
            )}
            {mode === 'forgot-user' && (
              <p className="text-xs text-zinc-500">We’ll look up @username for this email on this device / index.</p>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
            {info && <p className="text-sm text-green-400">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-lg bg-white text-black text-sm font-bold hover:bg-zinc-200 disabled:opacity-60"
            >
              {busy
                ? 'Please wait…'
                : mode === 'signup'
                  ? 'Create account'
                  : mode === 'forgot-pass'
                    ? 'Send reset link'
                    : mode === 'forgot-user'
                      ? 'Find username'
                      : 'Sign in'}
            </button>
          </form>

          {mode === 'signin' && (
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <button type="button" className="text-white font-medium" onClick={() => { setMode('forgot-pass'); setError(''); setInfo('') }}>
                Forgot password?
              </button>
              <button type="button" className="text-white font-medium" onClick={() => { setMode('forgot-user'); setError(''); setInfo('') }}>
                Forgot username?
              </button>
            </div>
          )}

          <p className="text-xs text-zinc-500 text-center mt-4">
            {mode === 'signin' && (
              <>No account? <button type="button" className="text-white font-medium" onClick={() => setMode('signup')}>Sign up</button></>
            )}
            {mode === 'signup' && (
              <>Have an account? <button type="button" className="text-white font-medium" onClick={() => setMode('signin')}>Sign in</button></>
            )}
            {(mode === 'forgot-pass' || mode === 'forgot-user') && (
              <button type="button" className="text-white font-medium" onClick={() => { setMode('signin'); setError(''); setInfo('') }}>
                Back to sign in
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
