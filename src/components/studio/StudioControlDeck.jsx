import { useMemo, useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Heart, Star, Eye, Smile } from 'lucide-react'
import { formatCount } from '../../lib/uiFormat'
import { formatPostedAt, postedAtOf } from '../../lib/mediaMeta'
import { liveBadgeLabel } from '../../lib/liveStatus'
import { readLocalLiveChat, resolveLiveChatChannelId } from '../../lib/liveChatSync'
import { getMembershipPrice, getViews } from '../../lib/engagement'
import { cn } from '../../lib/utils'

const WHITE = '#ffffff'
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function deltaPct(values) {
  const vals = (values || []).map((v) => Number(v) || 0)
  if (vals.length < 14) return null
  const last = vals.slice(-7).reduce((a, b) => a + b, 0)
  const prev = vals.slice(-14, -7).reduce((a, b) => a + b, 0)
  if (prev <= 0) return null
  return ((last - prev) / prev) * 100
}

function sparkLabels(rows = []) {
  return rows.slice(-7).map((r) => {
    const parts = String(r?.day || '').split('-')
    if (parts.length < 2) return ''
    const d = new Date(new Date().getFullYear(), Number(parts[0]) - 1, Number(parts[1]))
    if (!Number.isFinite(d.getTime())) return ''
    return DAYS[d.getDay()]
  })
}

function formatDurationClock(sec) {
  const n = Math.max(0, Math.round(Number(sec) || 0))
  if (!n) return ''
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  const s = n % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function SparkBars({ values = [], labels = [] }) {
  const vals = values.length ? values : [0, 0, 0, 0, 0, 0, 0]
  const max = Math.max(1, ...vals)
  return (
    <div className="mt-4">
      <div className="flex h-14 items-end gap-[3px]">
        {vals.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${Math.max(10, (v / max) * 100)}%`, background: WHITE }}
          />
        ))}
      </div>
      {labels.length ? (
        <div className="mt-1 flex gap-[3px]">
          {labels.map((lab, i) => (
            <span key={i} className="flex-1 text-center text-[9px] text-zinc-500">{lab}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value, series = [], labels = [], onClick }) {
  const d = deltaPct(series)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      className="rounded-xl border border-white/10 bg-[#141414] p-4 text-left hover:bg-[#181818] cursor-pointer"
    >
      <p className="text-[13px] font-medium text-white">{label}</p>
      <p className="mt-1 text-[11px] text-zinc-500">Last 7 Days</p>
      <p className="mt-2 text-[28px] font-semibold tabular-nums leading-none text-white">{value}</p>
      {d != null ? (
        <p className="mt-2 text-[12px] font-semibold" style={{ color: WHITE }}>
          +{Math.abs(d).toFixed(1)}%
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-zinc-500">No prior week to compare</p>
      )}
      <SparkBars values={series.slice(-7)} labels={labels} />
    </div>
  )
}

function Panel({ title, action, children, className = '' }) {
  return (
    <div className={cn('rounded-xl border border-white/10 bg-[#141414] flex flex-col min-h-0', className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-[14px] font-semibold text-white">{title}</h2>
        {action}
      </div>
      <div className="px-4 pb-4 flex-1 min-h-0">{children}</div>
    </div>
  )
}

function typeLabel(type) {
  if (type === 'pic') return 'Pic'
  if (type === 'short') return 'Clip'
  return 'Video'
}

function activityMeta(ev) {
  if (ev.type === 'subscribe') return { label: 'Followed you', Icon: Heart }
  if (ev.type === 'like') return { label: 'Liked a post', Icon: Star }
  if (ev.type === 'view') return { label: 'Viewed a post', Icon: Eye }
  if (ev.type === 'skip') return { label: 'Skipped a post', Icon: Eye }
  return { label: ev.type || 'Activity', Icon: Star }
}

export default function StudioControlDeck({
  user,
  views = 0,
  followers = 0,
  premiumSubs = 0,
  posts = [],
  series = null,
  interactions = [],
  live,
  hasPayout = false,
  verified = false,
  onGoLive,
  onOpenUpload,
  onOpenAnalytics,
  onOpenContent,
  onOpenEarnings,
  onOpenPost,
  onOpenAuth,
}) {
  const name = user?.displayName || user?.handle || 'there'
  const liveOn = Boolean(live?.live || live?.isLive)
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState('all')
  const menuRef = useRef(null)
  const membership = user?.id ? getMembershipPrice(user.id) : 0
  const chat = readLocalLiveChat(resolveLiveChatChannelId(user?.id)).slice(-8)

  const viewRows = series?.views || []
  const followRows = series?.followers || []
  const postRows = series?.posts || []
  const viewSeries = viewRows.map((r) => Number(r.value) || 0)
  const followSeries = followRows.map((r) => Number(r.value) || 0)
  const postSeries = postRows.map((r) => Number(r.value) || 0)

  const filtered = useMemo(() => {
    if (tab === 'video') return posts.filter((p) => p.type === 'video')
    if (tab === 'clip') return posts.filter((p) => p.type === 'short')
    if (tab === 'pic') return posts.filter((p) => p.type === 'pic')
    return posts
  }, [posts, tab])

  const duration = (() => {
    if (!live?.startedAt) return liveOn ? 'Live' : '—'
    const ms = Date.now() - new Date(live.startedAt).getTime()
    if (!Number.isFinite(ms) || ms < 0) return '—'
    const m = Math.floor(ms / 60000)
    if (m < 60) return `${m}m`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  })()

  const watchers = Number(live?.watchers || live?.viewers || 0) || 0

  const setup = [
    { id: 'upload', label: 'Upload a post', done: posts.length > 0, go: onOpenUpload },
    { id: 'payout', label: 'Add a payout method', done: hasPayout, go: onOpenEarnings },
    { id: 'verify', label: 'Get verified', done: verified, go: null },
  ]

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <div className="flex gap-4 min-h-0 h-full">
      <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pr-1 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-white">
              Welcome back, {name}
            </h1>
            <p className="mt-1 text-[13px] text-zinc-500">{"Here's what's happening with your channel today."}</p>
          </div>
          <div className="flex items-center gap-2">
            {!user ? (
              <button type="button" onClick={onOpenAuth} className="h-10 px-4 rounded-lg bg-white text-black text-[13px] font-semibold">
                Sign in
              </button>
            ) : null}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-10 px-4 rounded-lg border border-white/15 bg-[#141414] text-[13px] font-semibold text-white inline-flex items-center gap-2"
              >
                + Quick Action <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-white/10 bg-[#141414] py-1 z-20 shadow-xl">
                  <button type="button" onClick={() => { setMenuOpen(false); onGoLive?.() }} className="w-full text-left px-3 py-2 text-[13px] text-zinc-200 hover:bg-white/5">Go live</button>
                  <button type="button" onClick={() => { setMenuOpen(false); onOpenUpload?.('video') }} className="w-full text-left px-3 py-2 text-[13px] text-zinc-200 hover:bg-white/5">Upload</button>
                  <button type="button" onClick={() => { setMenuOpen(false); onOpenAnalytics?.() }} className="w-full text-left px-3 py-2 text-[13px] text-zinc-200 hover:bg-white/5">Analytics</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Views" value={formatCount(views)} series={viewSeries} labels={sparkLabels(viewRows)} onClick={onOpenAnalytics} />
          <MetricCard label="Followers" value={formatCount(followers)} series={followSeries} labels={sparkLabels(followRows)} onClick={onOpenAnalytics} />
          <MetricCard label="Posts" value={String(posts.length)} series={postSeries} labels={sparkLabels(postRows)} onClick={onOpenContent} />
          <MetricCard label="Subscribers" value={formatCount(premiumSubs)} series={[]} labels={[]} onClick={onOpenEarnings} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Panel
            title="Stream summary"
            action={
              <button type="button" onClick={onOpenAnalytics} className="text-[12px] font-medium" style={{ color: WHITE }}>
                View Full Analytics
              </button>
            }
          >
            {liveOn ? (
              <dl className="space-y-2.5 text-[13px]">
                <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd className="text-white">{liveBadgeLabel(live)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Duration</dt><dd className="text-white tabular-nums">{duration}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Watchers now</dt><dd className="text-white tabular-nums">{watchers}</dd></div>
              </dl>
            ) : (
              <p className="text-[13px] text-zinc-500">Offline. Numbers here come from a live session — nothing is invented.</p>
            )}
            <button
              type="button"
              onClick={onGoLive}
              className="mt-4 h-9 w-full rounded-lg text-[13px] font-semibold text-black"
              style={{ background: WHITE }}
            >
              Go live
            </button>
          </Panel>

          <Panel
            title="Recent activity"
            action={
              <button type="button" onClick={onOpenAnalytics} className="text-[12px] font-medium" style={{ color: WHITE }}>
                View All Activity
              </button>
            }
          >
            {interactions.length ? (
              <ul className="space-y-2.5">
                {interactions.slice(0, 8).map((ev, i) => {
                  const meta = activityMeta(ev)
                  const Icon = meta.Icon
                  return (
                    <li key={ev.id || `${ev.type}-${ev.at}-${i}`} className="flex items-center gap-2 text-[13px]">
                      <span className="h-7 w-7 rounded-full bg-white/5 inline-flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-zinc-300" />
                      </span>
                      <span className="text-zinc-200 min-w-0 truncate flex-1">{meta.label}</span>
                      <span className="text-[11px] text-zinc-500 shrink-0">{formatPostedAt(ev.at) || ''}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-[13px] text-zinc-500">No follows or likes logged yet.</p>
            )}
          </Panel>

          <Panel title="My chat">
            <div className="flex flex-col min-h-[180px]">
              {chat.length ? (
                <ul className="space-y-2 flex-1 overflow-y-auto max-h-40">
                  {chat.map((m) => (
                    <li key={m.id || m.at} className="text-[13px]">
                      <span className="font-medium" style={{ color: WHITE }}>{m.handle || m.displayName || 'User'}</span>
                      <span className="text-zinc-300"> {m.body || m.text || ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-zinc-500 flex-1">Empty until people chat on your live.</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg border border-white/10 inline-flex items-center justify-center text-zinc-500">
                  <Smile className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  disabled
                  placeholder={liveOn ? 'Chat from the live page' : 'Chat when you\'re live'}
                  className="flex-1 h-9 rounded-lg border border-white/10 bg-black px-3 text-[13px] text-zinc-400"
                />
                <button type="button" disabled className="h-9 px-3 rounded-lg text-[12px] font-semibold text-black disabled:opacity-40" style={{ background: WHITE }}>
                  Chat
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          title="Content"
          action={
            <button type="button" onClick={onOpenContent} className="text-[12px] font-medium text-zinc-400 hover:text-white">See all</button>
          }
        >
          <div className="flex gap-4 border-b border-white/10 mb-3">
            {[
              { id: 'all', label: 'All' },
              { id: 'video', label: 'Videos' },
              { id: 'clip', label: 'Clips' },
              { id: 'pic', label: 'Pics' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'h-9 text-[13px] font-medium border-b-2 -mb-px rounded-none',
                  tab === t.id ? 'text-white' : 'text-zinc-500 border-transparent hover:text-white'
                )}
                style={tab === t.id ? { borderColor: WHITE } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
          {filtered.length ? (
            <ul className="divide-y divide-white/10">
              {filtered.slice(0, 8).map((p) => {
                const dur = formatDurationClock(p.durationSec)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onOpenPost?.(p)}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-white/5 rounded-lg px-1"
                    >
                      <div className="relative h-16 w-28 rounded-md bg-black overflow-hidden shrink-0">
                        {p.thumbUrl || p.mediaUrl ? (
                          <img src={p.thumbUrl || p.mediaUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                        {dur ? (
                          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] tabular-nums text-white">{dur}</span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-white truncate">{p.title || 'Untitled'}</p>
                        <p className="text-[11px] text-zinc-500">{typeLabel(p.type)} · {formatPostedAt(postedAtOf(p)) || '—'}</p>
                      </div>
                      <span className="text-[12px] text-zinc-500 tabular-nums shrink-0">{formatCount(getViews(p.id))} views</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-[13px] text-zinc-500">No posts in this filter yet.</p>
          )}
        </Panel>
      </div>

      <div className="hidden xl:flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto pb-6">
        <Panel
          title="Memberships"
          action={
            <button type="button" onClick={onOpenEarnings} className="text-[12px] font-medium" style={{ color: WHITE }}>Edit</button>
          }
        >
          <p className="text-[11px] text-zinc-500">Monthly price</p>
          <p className="mt-1 text-[22px] font-semibold text-white tabular-nums">{money(membership)} <span className="text-[13px] font-medium text-zinc-500">USD / month</span></p>
          <p className="mt-2 text-[12px] text-zinc-500">Price is set in Earnings. {premiumSubs} premium now.</p>
          <button
            type="button"
            onClick={onOpenEarnings}
            className="mt-4 h-9 w-full rounded-lg text-[13px] font-semibold text-black"
            style={{ background: WHITE }}
          >
            Open Earnings
          </button>
        </Panel>

        <Panel title="Setup">
          <ul className="space-y-3">
            {setup.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => s.go?.()}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <span
                    className="h-5 w-5 rounded-full shrink-0 inline-flex items-center justify-center"
                    style={{ background: s.done ? WHITE : 'transparent', border: s.done ? 'none' : '1px solid #3f3f46' }}
                  >
                    {s.done ? <Check className="h-3 w-3 text-black" /> : null}
                  </span>
                  <span className={cn('text-[13px]', s.done ? 'text-zinc-500' : 'text-zinc-200')}>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
