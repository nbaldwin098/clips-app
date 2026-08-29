import { useMemo, useState } from 'react'
import { Scale } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { submitAppeal, listAppeals, listStrikes } from '../lib/youtubeParity'
import { getEnforcement, STATUS_LABEL } from '../lib/trustSafety'
import AuthRequired from './AuthRequired'
import StudioShell, { StudioCard, StudioKpi } from './dash/StudioShell'

export default function AppealsPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [note, setNote] = useState('')
  const [, bump] = useState(0)
  const mine = useMemo(() => (listAppeals(user?.id) || []), [user?.id, bump])
  const enforcement = useMemo(() => getEnforcement(user?.id), [user?.id, bump])
  const parityStrikes = useMemo(() => (listStrikes(user?.id) || []), [user?.id, bump])
  const enfStrikes = Array.isArray(enforcement?.strikes)
    ? enforcement.strikes.filter((s) => !s.cleared)
    : []

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

  const status = enforcement?.status || 'ok'
  const hasRestriction = status !== 'ok'
    || enforcement?.noPost
    || enforcement?.noLive
    || enforcement?.readOnly
    || enfStrikes.length > 0
    || parityStrikes.length > 0

  return (
    <StudioShell
      title="Appeals portal"
      nav={[{ id: 'appeals', label: 'Appeals', icon: Scale, group: 'Support' }]}
      activeId="appeals"
      onNav={() => {}}
      onBack={() => onNavigate?.('home')}
    >
      <div className="space-y-5 max-w-2xl">
        <StudioKpi label="Open appeals" value={String(mine.filter((a) => a.status !== 'closed').length)} icon={Scale} />

        <StudioCard title="Current status">
          <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
            <span className={`px-2 py-1 font-semibold rounded ${
              status === 'banned' || status === 'suspended'
                ? 'bg-rose-950 text-rose-300'
                : status === 'limited'
                  ? 'bg-amber-950 text-amber-300'
                  : 'bg-[#18181f] text-zinc-300'
            }`}
            >
              {STATUS_LABEL[status] || status}
            </span>
            {enforcement?.until ? (
              <span className="text-zinc-500">Until {new Date(enforcement.until).toLocaleString()}</span>
            ) : null}
          </div>
          {enforcement?.reason ? <p className="text-xs text-zinc-400 mb-2">{enforcement.reason}</p> : null}
          {!hasRestriction && !enfStrikes.length && !parityStrikes.length ? (
            <p className="text-xs text-zinc-500">No active bans, suspensions, or strikes.</p>
          ) : null}
          {[...enfStrikes, ...parityStrikes].map((s, i) => (
            <div key={s.id || `s-${i}`} className="text-xs text-zinc-400 border border-[#272727] px-2.5 py-2 mb-1 rounded-lg">
              <span className="text-white font-medium">{s.reason || s.type || 'Strike'}</span>
              {s.at ? <span className="block text-[10px] text-zinc-500 mt-0.5">{String(s.at).slice(0, 16)}</span> : null}
            </div>
          ))}
        </StudioCard>

        <StudioCard title="File an appeal">
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-xs text-zinc-400">
              Reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full h-10 border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-white rounded-lg"
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
                className="mt-1 w-full border border-[#272727] bg-[#0f0f0f] px-3 py-2 text-sm text-white rounded-lg"
                placeholder="What happened?"
              />
            </label>
            <button type="submit" className="h-10 px-4 bg-white text-black text-sm font-semibold rounded-lg">
              Submit appeal
            </button>
            {note ? <p className="text-xs text-zinc-500">{note}</p> : null}
          </form>
        </StudioCard>

        <StudioCard title="Your appeals">
          {!mine.length ? (
            <p className="text-sm text-zinc-500">None yet.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((a) => (
                <li key={a.id} className="border border-[#272727] rounded-lg px-3 py-2 text-sm">
                  <p className="font-medium text-white">{a.reason}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.status} · {String(a.at || '').slice(0, 16)}</p>
                  {a.detail ? <p className="text-xs text-zinc-400 mt-1">{a.detail}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </StudioCard>
      </div>
    </StudioShell>
  )
}
