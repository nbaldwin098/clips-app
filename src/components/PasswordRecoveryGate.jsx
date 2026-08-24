import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { sanitizeAuthError } from '../lib/authBrand'

export default function PasswordRecoveryGate() {
  const { updatePassword, clearPasswordRecovery } = useAuth()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (pw !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(pw)
      clearPasswordRecovery()
    } catch (err) {
      setError(sanitizeAuthError(err?.message) || 'Could not save password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[#2f2f37] bg-[#1f1f23] p-5 space-y-3">
        <h2 className="text-lg font-semibold text-white">Choose a new password</h2>
        <p className="text-xs text-zinc-500">You opened Clips from a reset email. Set a new password for this account.</p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="New password"
          className="w-full h-11 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-white"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm"
          className="w-full h-11 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-3 text-sm text-white"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" disabled={busy || pw.length < 6} className="w-full h-10 rounded-lg bg-white text-black text-sm font-bold disabled:opacity-50">
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  )
}
