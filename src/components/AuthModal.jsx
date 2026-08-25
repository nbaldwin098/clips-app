import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listIndexedUsers } from '../lib/moderation'
import { sanitizeAuthError } from '../lib/authBrand'
import BrandMark from './BrandMark'
import { findOwnerLogin } from '../data/ownerLogin'

const OAUTH = [
  { id: 'apple', label: 'Continue with Apple' },
  { id: 'azure', label: 'Continue with Microsoft' },
  { id: 'twitter', label: 'Continue with X' },
]

export default function AuthModal({ open, onClose, initialMode = 'signin' }) {
  const { login, loginWithOAuth, sendPhoneCode, verifyPhoneCode, sendPasswordReset: sendReset, synced } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [via, setVia] = useState('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [smsCode, setSmsCode] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setVia('email')
      setError('')
      setInfo('')
      setPassword('')
      setSmsSent(false)
      setSmsCode('')
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
      await sendReset(mail)
      setInfo('If that email is on Clips, we sent a reset link. Check inbox and spam.')
    } catch (err) {
      setError(sanitizeAuthError(err?.message) || 'Could not send reset email.')
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
    void match
    setInfo('If that email is on Clips, your @username is on your profile after you sign in. Check inbox if you forgot your password.')
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

    if (via === 'phone' && (mode === 'signin' || mode === 'signup')) {
      setBusy(true)
      try {
        if (!smsSent) {
          await sendPhoneCode(phone)
          setSmsSent(true)
          setInfo('We texted a Clips code to that number.')
        } else {
          const result = await verifyPhoneCode(phone, smsCode)
          if (!result?.needsMfa) onClose?.()
        }
      } catch (err) {
        setError(sanitizeAuthError(err?.message))
      } finally {
        setBusy(false)
      }
      return
    }

    const mail = email.trim().toLowerCase()
    if (!mail || (!mail.includes('@') && !findOwnerLogin(mail))) {
      setError('Enter a valid email or username.')
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
        setInfo('Check your email from Clips, then sign in.')
        setMode('signin')
        setBusy(false)
        return
      }
      if (!result?.needsMfa) onClose?.()
    } catch (err) {
      setError(sanitizeAuthError(err?.message) || 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2f2f37] bg-[#1f1f23] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f37]">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={32} withWord />
            <div>
              <h2 className="text-lg font-semibold text-[#efeff1]">{title}</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {synced ? 'Synced across devices' : 'Local this device'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="space-y-2">
                {OAUTH.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setError('')
                      setBusy(true)
                      try {
                        await loginWithOAuth(p.id)
                      } catch (err) {
                        setError(sanitizeAuthError(err?.message))
                        setBusy(false)
                      }
                    }}
                    className="w-full h-10 rounded-lg border border-[#2f2f37] bg-[#000000] text-sm font-semibold text-white hover:bg-[#18181b] disabled:opacity-60"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                CapCut cannot sign people into Clips. It is an editor. Export the file, then upload.
              </p>
              <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-zinc-600">
                <span className="h-px flex-1 bg-[#2f2f37]" />
                or
                <span className="h-px flex-1 bg-[#2f2f37]" />
              </div>
              <div className="mb-3 flex gap-1 rounded-full bg-white/10 p-1 w-fit">
                {['email', 'phone'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setVia(id); setError(''); setInfo(''); setSmsSent(false) }}
                    className={`h-7 px-3 rounded-full text-[11px] font-semibold ${via === id ? 'bg-white text-black' : 'text-white/70'}`}
                  >
                    {id === 'email' ? 'Email' : 'Phone'}
                  </button>
                ))}
              </div>
            </>
          )}
          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && via === 'email' && (
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
                    className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#000000] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-zinc-300">Username</span>
                  <div className="mt-1 flex">
                    <span className="inline-flex items-center h-10 px-3 rounded-l-lg border border-r-0 border-[#2f2f37] bg-[#18181b] text-zinc-500 text-sm">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))}
                      className="h-10 flex-1 rounded-r-lg border border-[#2f2f37] bg-[#000000] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>
                </label>
              </>
            )}

            {via === 'phone' && (mode === 'signin' || mode === 'signup') ? (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-zinc-300">Phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#000000] px-3 text-sm text-[#efeff1]"
                    autoComplete="tel"
                  />
                </label>
                {smsSent ? (
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-300">Text code</span>
                    <input
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      inputMode="numeric"
                      className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#000000] px-3 text-sm text-[#efeff1] tracking-widest"
                    />
                  </label>
                ) : null}
              </>
            ) : (
              <label className="block">
                <span className="text-xs font-medium text-zinc-300">Email or username</span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#000000] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </label>
            )}

            {(mode === 'signin' || mode === 'signup') && via === 'email' && (
              <label className="block">
                <span className="text-xs font-medium text-zinc-300">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#000000] px-3 text-sm text-[#efeff1] focus:outline-none focus:ring-1 focus:ring-white"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </label>
            )}

            {mode === 'forgot-pass' && (
              <p className="text-xs text-zinc-500">We’ll email a Clips reset link if this address has an account.</p>
            )}
            {mode === 'forgot-user' && (
              <p className="text-xs text-zinc-500">We’ll look up @username for this email on this device.</p>
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
                : mode === 'signup' && via === 'email'
                  ? 'Create account'
                  : mode === 'forgot-pass'
                    ? 'Send reset link'
                    : mode === 'forgot-user'
                      ? 'Find username'
                      : via === 'phone' && !smsSent
                        ? 'Text me a code'
                        : via === 'phone'
                          ? 'Sign in'
                          : 'Sign in'}
            </button>
          </form>

          {mode === 'signin' && (
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <button type="button" className="text-white font-medium" onClick={() => { setMode('forgot-pass'); setVia('email'); setError(''); setInfo('') }}>
                Forgot password?
              </button>
              <button type="button" className="text-white font-medium" onClick={() => { setMode('forgot-user'); setVia('email'); setError(''); setInfo('') }}>
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
