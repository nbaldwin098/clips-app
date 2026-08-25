import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function MfaGate() {
  const { completeMfa } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await completeMfa(code.trim())
    } catch (err) {
      setError(err?.message || 'That code did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" role="presentation">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-gate-title"
        className="w-full max-w-sm rounded-2xl border border-[#2f2f37] bg-[#1f1f23] p-5 space-y-3"
      >
        <h2 id="mfa-gate-title" className="text-lg font-semibold text-white">Enter your 2FA code</h2>
        <p className="text-xs text-zinc-500">Open your authenticator app. This is a calabi code, not a text from anyone else.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          className="w-full h-11 rounded-lg border border-[#2f2f37] bg-[#000000] px-3 text-sm text-white tracking-widest"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" disabled={busy || code.length < 6} className="w-full h-10 rounded-lg bg-white text-black text-sm font-bold disabled:opacity-50">
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
