import { useMemo, useState } from 'react'
import { Scale, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { submitAppeal, listAppeals, listStrikes } from '../lib/youtubeParity'
import { getEnforcement, STATUS_LABEL } from '../lib/trustSafety'
import AuthRequired from './AuthRequired'
import StudioShell, { StudioCard, StudioKpi } from './dash/StudioShell'

const NAV = [
  { id: 'appeals', label: 'Appeals', icon: Scale, group: 'Support' },
  { id: 'history', label: 'History', icon: History, group: 'Support' },
]

export default function AppealsPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [tab, setTab] = useState('appeals')
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [note, setNote] = useState('')
  const [, bump] = useState(0)
  const mine = useMemo(() => (listAppeals(user?.id) || []), [user?.id, bump])
  const enforcement = useMemo(() => getEnforcement(user?.id), [user?.id, bump])
  const parityStrikes = useMemo(() => (listStrikes(user?.id) || []), [user?.id, bump])
  const allEnfStrikes = Array.isArray(enforcement?.strikes) ? enforcement.strikes : []
  const activeStrikes = allEnfStrikes.filter((s) => !s.cleared)

  if (!isAuthenticated) {
    return (
      <StudioShell tone="dark" title="Appeals portal" onBack={() => onNavigate?.('home')} onNotify={() => onNavigate?.('notifications')} onHelp={() => onNavigate?.('help')}>
        <AuthRequired title="Appeals" description="Sign in to file an appeal." onOpenAuth={onOpenAuth} />
      </StudioShell>
    )
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

  return (
    <StudioShell
      tone="dark"
      title="Appeals portal"
      nav={NAV}
      activeId={tab}
      onNav={setTab}
      onBack={() => onNavigate?.('home')}
      onNotify={() => onNavigate?.('notifications')}
      onHelp={() => onNavigate?.('help')}
    >
      <div className="space-y-5 max-w-2xl">
        {tab === 'appeals' ? (
          <>
            <StudioKpi label="Open appeals" value={String(mine.filter((a) => a.status !== 'closed').length)} icon={Scale} />
            <StudioCard title="Current status">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                <span className={`px-2 py-1 font-semibold ${
                  status === 'banned' || status === 'suspended'
                    ? 'bg-rose-500/20 text-rose-300'
                    : status === 'limited'
                      ? 'bg-amber-500/20 text-amber-200'
                      : 'bg-white/10 text-zinc-200'
                }`}
                >
                  {STATUS_LABEL[status] || status}
                </span>
                {enforcement?.until ? (
                  <span className="text-zinc-500">Until {new Date(enforcement.until).toLocaleString()}</span>
                ) : null}
              </div>
              {enforcement?.reason ? <p className="text-xs text-zinc-400 mb-2">{enforcement.reason}</p> : null}
              {!activeStrikes.length && !parityStrikes.filter((s) => !s.cleared).length ? (
                <p className="text-xs text-zinc-500">No active bans, suspensions, or strikes.</p>
              ) : null}
              {[...activeStrikes, ...parityStrikes.filter((s) => !s.cleared)].map((s, i) => (
                <div key={s.id || `s-${i}`} className="text-xs text-zinc-400 border border-white/10 px-2.5 py-2 mb-1">
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
                    className="mt-1 w-full h-10 border border-white/15 bg-black px-3 text-sm text-white"
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
                    className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white"
                    placeholder="What happened?"
                  />
                </label>
                <button type="submit" className="h-10 px-4 bg-white text-black text-sm font-semibold">
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
                    <li key={a.id} className="border border-white/10 px-3 py-2 text-sm">
                      <p className="font-medium text-white">{a.reason}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{a.status} · {String(a.at || '').slice(0, 16)}</p>
                      {a.detail ? <p className="text-xs text-zinc-400 mt-1">{a.detail}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </StudioCard>
          </>
        ) : (
          <StudioCard title="History">
            <p className="text-xs text-zinc-500 mb-3">Past strikes, bans, and closed appeals.</p>
            {!allEnfStrikes.length && !parityStrikes.length && !mine.length ? (
              <p className="text-sm text-zinc-500">No history yet.</p>
            ) : (
              <ul className="space-y-2">
                {allEnfStrikes.map((s, i) => (
                  <li key={s.id || `h-${i}`} className="border border-white/10 px-3 py-2 text-sm">
                    <p className="text-white">{s.reason || s.type || 'Strike'}{s.cleared ? ' · cleared' : ''}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{s.at ? String(s.at).slice(0, 16) : ''}</p>
                  </li>
                ))}
                {parityStrikes.map((s, i) => (
                  <li key={s.id || `p-${i}`} className="border border-white/10 px-3 py-2 text-sm">
                    <p className="text-white">{s.reason || s.type || 'Strike'}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{s.at ? String(s.at).slice(0, 16) : ''}</p>
                  </li>
                ))}
                {mine.filter((a) => a.status === 'closed').map((a) => (
                  <li key={a.id} className="border border-white/10 px-3 py-2 text-sm">
                    <p className="text-white">Appeal · {a.reason}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{a.status} · {String(a.at || '').slice(0, 16)}</p>
                  </li>
                ))}
              </ul>
            )}
          </StudioCard>
        )}
      </div>
    </StudioShell>
  )
}
