import { useEffect, useState } from 'react'
import { Smartphone, Monitor, Key } from 'lucide-react'
import { lsGet, lsRemove } from '../../lib/storage'
import { useAuth } from '../../context/AuthContext'
import { sanitizeAuthError } from '../../lib/authBrand'

export default function SecuritySettings() {
  const {
    logout, synced, listMfaFactors, startMfaEnroll, finishMfaEnroll, removeMfaFactor, updatePassword,
  } = useAuth()
  const [factors, setFactors] = useState([])
  const [enroll, setEnroll] = useState(null)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')
  const [pw, setPw] = useState({ next: '', confirm: '' })

  const refreshFactors = async () => {
    try {
      setFactors(await listMfaFactors())
    } catch {
      setFactors([])
    }
  }

  useEffect(() => { refreshFactors() }, [])

  const startEnroll = async () => {
    setStatus('')
    try {
      const data = await startMfaEnroll()
      setEnroll(data)
      setCode('')
    } catch (err) {
      setStatus(sanitizeAuthError(err?.message))
    }
  }

  const confirmEnroll = async () => {
    if (!enroll?.id) return
    setStatus('')
    try {
      await finishMfaEnroll(enroll.id, code)
      setEnroll(null)
      setCode('')
      setStatus('2FA is on. Use your authenticator app when you sign in.')
      await refreshFactors()
    } catch (err) {
      setStatus(sanitizeAuthError(err?.message))
    }
  }

  const turnOff = async (id) => {
    setStatus('')
    try {
      await removeMfaFactor(id)
      setStatus('2FA is off.')
      await refreshFactors()
    } catch (err) {
      setStatus(sanitizeAuthError(err?.message))
    }
  }

  const savePassword = async () => {
    setStatus('')
    if (pw.next !== pw.confirm) {
      setStatus('New passwords do not match.')
      return
    }
    try {
      await updatePassword(pw.next)
      setPw({ next: '', confirm: '' })
      setStatus('Password updated.')
    } catch (err) {
      setStatus(sanitizeAuthError(err?.message))
    }
  }

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: lsGet('user'),
      settings: lsGet('settings', {}),
      imports: lsGet('imports', []),
      liked: lsGet('liked', []),
      saved: lsGet('saved', []),
      history: lsGet('watchHistory', []),
      taste: lsGet('taste_profiles', {}),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clips-data-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearLocal = () => {
    if (!confirm('Clear all local Clips data on this device? You will be signed out.')) return
    lsRemove('user')
    lsRemove('mode')
    lsRemove('imports')
    lsRemove('liked')
    lsRemove('saved')
    lsRemove('settings')
    lsRemove('watchHistory')
    try {
      localStorage.removeItem('clips_taste_profiles')
      localStorage.removeItem('taste_profiles')
    } catch {}
    logout()
  }

  const totpOn = factors.some((f) => f.status === 'verified')

  return (
    <div className="space-y-8 text-neutral-800">
      <div>
        <p className="text-sm text-neutral-500">Password, two-factor, and this device.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Key className="h-4 w-4" /> Password</h2>
        <div className="grid gap-3 max-w-md">
          <input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} placeholder="New password" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900" />
          <input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900" />
          <button type="button" onClick={savePassword} className="h-9 w-fit px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium">Update password</button>
        </div>
      </section>

      <section className="pt-6 border-t border-neutral-200 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Smartphone className="h-4 w-4" /> Two-factor authentication</h2>
        <p className="text-sm text-neutral-500">
          An authenticator app on your phone. This is real 2FA for a Clips account — not a fake checkbox.
        </p>
        {!synced ? (
          <p className="text-sm text-neutral-600">Sign in with a synced Clips account to turn on 2FA.</p>
        ) : totpOn ? (
          <div className="space-y-2">
            <p className="text-sm text-neutral-900">2FA is on.</p>
            {factors.filter((f) => f.status === 'verified').map((f) => (
              <button key={f.id} type="button" onClick={() => turnOff(f.id)} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs text-neutral-800">
                Turn off 2FA
              </button>
            ))}
          </div>
        ) : enroll ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3 max-w-md">
            <p className="text-sm text-neutral-700">Scan this with Authy or any authenticator app, then enter the 6-digit code.</p>
            {enroll.totp?.qr_code ? (
              <img src={enroll.totp.qr_code} alt="2FA QR" className="h-40 w-40 bg-white rounded-lg p-2 border border-neutral-200" />
            ) : null}
            {enroll.totp?.secret ? (
              <p className="text-[11px] text-neutral-500 break-all">Or type this key: {enroll.totp.secret}</p>
            ) : null}
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="6-digit code" className="w-full h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 tracking-widest" />
            <button type="button" onClick={confirmEnroll} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium">Confirm 2FA</button>
          </div>
        ) : (
          <button type="button" onClick={startEnroll} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium">
            Turn on 2FA
          </button>
        )}
      </section>

      {status ? <p className="text-sm text-neutral-700">{status}</p> : null}

      <section className="pt-6 border-t border-neutral-200 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2"><Monitor className="h-4 w-4" /> This device</h2>
        <p className="text-xs text-neutral-500">Current browser · signed in here</p>
      </section>

      <section className="pt-6 border-t border-neutral-200 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Account actions</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={exportData} className="h-9 px-4 rounded-lg border border-neutral-200 text-sm text-neutral-800">Export my data</button>
          <button type="button" onClick={clearLocal} className="h-9 px-4 rounded-lg border border-red-200 text-sm text-red-600">Clear local data</button>
        </div>
      </section>
    </div>
  )
}
