import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { submitAppeal, listAppeals } from '../lib/youtubeParity'
import PageHeader from './PageHeader'
import AuthRequired from './AuthRequired'

export default function AppealsPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [note, setNote] = useState('')
  const [, bump] = useState(0)
  const mine = useMemo(
    () => (listAppeals(user?.id) || []),
    [user?.id, bump],
  )

  if (!isAuthenticated) {
    return <AuthRequired title="Appeals" description="Sign in to file an appeal." onOpenAuth={onOpenAuth} />
  }

  const onSubmit = (e) => {
    e?.preventDefault?.()
    const r = String(reason || '').trim()
    if (!r) {
      setNote('Pick a reason.')
      return
    }
    submitAppeal({
      userId: user.id,
      handle: user.handle,
      reason: r,
      detail: String(detail || '').trim().slice(0, 2000),
    })
    setReason('')
    setDetail('')
    setNote('Appeal submitted.')
    bump((n) => n + 1)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <PageHeader title="Appeals" onBack={() => onNavigate?.('home')} />

      <form onSubmit={onSubmit} className="space-y-3 border border-zinc-800 bg-[#0c0c10] p-4">
        <label className="block text-xs text-zinc-400">
          Reason
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full h-10 border border-zinc-700 bg-[#121218] px-3 text-sm text-white"
          >
            <option value="">Select…</option>
            <option value="strike">Strike / warning</option>
            <option value="takedown">Content takedown</option>
            <option value="ban">Account restriction</option>
            <option value="payout">Payout / earnings</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-xs text-zinc-400">
          Details
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-zinc-700 bg-[#121218] px-3 py-2 text-sm text-white"
            placeholder="What happened?"
          />
        </label>
        <button type="submit" className="h-10 px-4 bg-white text-black text-sm font-semibold">
          Submit appeal
        </button>
        {note ? <p className="text-xs text-zinc-400">{note}</p> : null}
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Your appeals</p>
        {!mine.length ? (
          <p className="text-sm text-zinc-500">None yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 border border-zinc-800">
            {mine.map((a) => (
              <li key={a.id} className="px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-medium">{a.reason}</span>
                  <span className="text-[11px] text-zinc-500">{a.status}</span>
                </div>
                {a.detail ? <p className="mt-1 text-xs text-zinc-400">{a.detail}</p> : null}
                <p className="mt-1 text-[10px] text-zinc-600">{a.at?.slice?.(0, 16) || ''}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
