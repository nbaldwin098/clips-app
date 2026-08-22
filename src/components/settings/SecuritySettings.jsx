import { useState } from 'react'
import { Shield, Smartphone, Monitor, Key } from 'lucide-react'

export default function SecuritySettings() {
  const [twoFactor, setTwoFactor] = useState(false)
  const [sessions] = useState([
    { id: 1, device: 'Current browser', location: 'Active now', current: true },
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Security & Privacy</h1>
        <p className="mt-1 text-sm text-slate-500">Password, two-factor authentication, and active sessions.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Key className="h-4 w-4" /> Password</h2>
        <div className="grid gap-3 max-w-md">
          <input type="password" placeholder="Current password" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          <input type="password" placeholder="New password" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          <input type="password" placeholder="Confirm new password" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          <button className="h-9 w-fit px-4 rounded-lg bg-[#2C729B] text-white text-sm font-medium">Update password</button>
        </div>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Smartphone className="h-4 w-4" /> Two-factor authentication</h2>
        <p className="text-sm text-slate-500">Use an authenticator app (TOTP) for additional protection.</p>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={twoFactor} onChange={e => setTwoFactor(e.target.checked)} className="rounded border-slate-300 text-[#2C729B] focus:ring-[#2C729B]" />
          <span className="text-sm text-slate-700">Enable 2FA</span>
        </label>
        {twoFactor && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Scan the QR code with Google Authenticator or Authy, then enter the verification code to complete setup. (Backend integration required for production keys.)
          </div>
        )}
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Monitor className="h-4 w-4" /> Active sessions</h2>
        <ul className="space-y-2">
          {sessions.map(s => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{s.device}</p>
                <p className="text-xs text-slate-500">{s.location}</p>
              </div>
              {s.current ? (
                <span className="text-xs font-medium text-emerald-600">Current</span>
              ) : (
                <button className="text-xs font-medium text-red-600 hover:underline">Revoke</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Account actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">Deactivate account</button>
          <button className="h-9 px-4 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50">Delete account</button>
          <button className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">Export my data</button>
        </div>
      </section>
    </div>
  )
}
