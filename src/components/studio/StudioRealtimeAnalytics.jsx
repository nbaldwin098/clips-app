import { useMemo, useState, useEffect } from 'react'
import { formatCount } from '../../lib/uiFormat'
import { formatPostedAt, postedAtOf } from '../../lib/mediaMeta'
import { INTERACTION_TYPES } from '../../lib/creatorInteractions'
import {
  activityBuckets,
  channelAnalyticsSnapshot,
  postAnalyticsSnapshot,
  listPostAnalyticsRows,
} from '../../lib/studioAnalytics'
import { cn } from '../../lib/utils'

function typeLabel(type) {
  if (type === 'video') return 'Video'
  if (type === 'pic') return 'Pic'
  return 'Clip'
}

function LiveDot({ on }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
      <span className={cn('relative flex h-2 w-2', on && 'animate-pulse')}>
        <span className="absolute inset-0 rounded-full bg-emerald-400/40" />
        <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      Live
    </span>
  )
}

function Sparkline({ buckets = [], accent = '#ffffff' }) {
  const vals = buckets.map((b) => Number(b.total) || 0)
  const max = Math.max(1, ...vals)
  const w = 320
  const h = 72
  const pad = 4
  if (!vals.length) {
    return <p className="text-xs text-zinc-600 py-6 text-center">Waiting for activity…</p>
  }
  const denom = Math.max(1, vals.length - 1)
  const pts = vals.map((v, i) => {
    const x = pad + (i / denom) * (w - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return `${x},${y}`
  })
  const area = `${pad},${h - pad} ${pts.join(' ')} ${w - pad},${h - pad}`
  const peak = vals.reduce((a, v, i) => (v > a.v ? { v, i } : a), { v: -1, i: 0 })
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="studioActFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#studioActFill)" />
        <polyline points={pts.join(' ')} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
        <span>{buckets[0]?.label || '—'}</span>
        <span>
          Peak {peak.v} · {buckets[peak.i]?.label || ''}
        </span>
        <span>Now</span>
      </div>
    </div>
  )
}

function Kpi({ label, value, hint, tone = 'default' }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] px-3 py-2.5 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums truncate',
          tone === 'hot' ? 'text-emerald-300' : 'text-white'
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{hint}</p> : null}
    </div>
  )
}

function TypeBreakdown({ byType = {} }) {
  const rows = INTERACTION_TYPES.map((t) => ({
    ...t,
    n: Number(byType[t.id]) || 0,
  })).filter((r) => r.n > 0)
  if (!rows.length) {
    return <p className="text-xs text-zinc-600">No audience actions in this range yet.</p>
  }
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex items-center justify-between text-[11px] mb-0.5">
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="text-zinc-400 tabular-nums">{formatCount(r.n)}</span>
          </div>
          <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: r.color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function formatWhen(iso) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * YouTube/Twitch-style realtime analytics for Creator Studio.
 * Channel overview + deep dive when a post is selected.
 */
export default function StudioRealtimeAnalytics({
  creatorId,
  posts = [],
  selectedPost = null,
  onSelectPost,
  range = '7d',
  onRangeChange,
  refreshing = false,
  onRefresh,
  tick = 0,
  untilMs = null,
  forcePostTab = false,
}) {
  const [tab, setTab] = useState(selectedPost || forcePostTab ? 'post' : 'channel')
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (selectedPost || forcePostTab) setTab('post')
  }, [selectedPost?.id, forcePostTab])

  const postSince = selectedPost
    ? Date.parse(selectedPost.createdAt || selectedPost.publishedAt || selectedPost.importedAt || '') || null
    : null

  const channel = useMemo(
    () => channelAnalyticsSnapshot(creatorId, posts, { range }),
    [creatorId, posts, range, tick, clock]
  )
  const postSnap = useMemo(
    () => (selectedPost
      ? postAnalyticsSnapshot(creatorId, selectedPost, {
          range: 'all',
          untilMs,
          sinceMs: postSince || undefined,
        })
      : null),
    [creatorId, selectedPost, untilMs, postSince, tick, clock]
  )
  const postRows = useMemo(
    () => listPostAnalyticsRows(creatorId, posts, { range: 'all' }),
    [creatorId, posts, tick, clock]
  )
  const buckets = useMemo(
    () => activityBuckets({
      creatorId,
      contentId: tab === 'post' && selectedPost ? selectedPost.id : null,
      hours: 24,
      posts,
    }),
    [creatorId, selectedPost?.id, tab, posts, tick, clock]
  )

  const ranges = [
    { id: '24h', label: '24h' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="h-full min-h-0 flex flex-col border border-zinc-800 bg-[#07070a]">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Analytics</p>
            <LiveDot on={!refreshing} />
          </div>
        </div>
        <div className="flex items-center gap-0.5 border border-zinc-800 p-0.5">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRangeChange?.(r.id)}
              className={cn(
                'h-7 px-2 text-[11px] font-semibold',
                range === r.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {onRefresh ? (
          <button
            type="button"
            disabled={refreshing}
            onClick={() => onRefresh()}
            className="h-7 px-2.5 text-[11px] font-semibold border border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-50"
          >
            {refreshing ? 'Syncing…' : 'Sync'}
          </button>
        ) : null}
      </div>

      {!forcePostTab ? (
      <div className="shrink-0 flex gap-4 px-3 border-b border-zinc-800">
        {[
          { id: 'channel', label: 'Channel' },
          { id: 'post', label: selectedPost ? `Post · ${selectedPost.title || 'Untitled'}` : 'Post' },
          { id: 'posts', label: 'All posts' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.id === 'post' && !selectedPost}
            onClick={() => setTab(t.id)}
            className={cn(
              'h-9 text-xs font-semibold border-b-2 -mb-px max-w-[10rem] truncate disabled:opacity-40',
              tab === t.id ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-white'
            )}
            title={t.label}
          >
            {t.label}
          </button>
        ))}
      </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {tab === 'channel' && !forcePostTab ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Kpi label="Views" value={formatCount(channel.views)} hint="All posts" />
              <Kpi label="Likes" value={formatCount(channel.likes)} />
              <Kpi label="Followers" value={formatCount(channel.followers)} />
              <Kpi label="Comments" value={formatCount(channel.comments)} />
              <Kpi label="Shares" value={formatCount(channel.shares)} hint={`Range ${range}`} />
              <Kpi
                label="Last hour"
                value={formatCount(channel.lastHourViews)}
                hint="View pulses"
                tone={channel.lastHourViews ? 'hot' : 'default'}
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] p-3">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-semibold text-zinc-300">Activity · last 24h</p>
                <p className="text-[10px] text-zinc-600">{formatCount(channel.people)} people · {formatCount(channel.events)} actions</p>
              </div>
              <Sparkline buckets={buckets} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] p-3">
                <p className="text-xs font-semibold text-zinc-300 mb-2">Audience mix</p>
                <TypeBreakdown byType={channel.byType} />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] p-3">
                <p className="text-xs font-semibold text-zinc-300 mb-2">Top posts</p>
                <ul className="space-y-1.5">
                  {postRows.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPost?.(r.id)
                          setTab('post')
                        }}
                        className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-zinc-900/80"
                      >
                        <p className="text-xs text-white truncate">{r.title}</p>
                        <p className="text-[10px] text-zinc-500 tabular-nums">
                          {formatCount(r.views)} views · {formatCount(r.likes)} likes
                          {r.lastHourViews ? ` · +${r.lastHourViews} /hr` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                  {!postRows.length ? (
                    <p className="text-xs text-zinc-600">Publish a post to see reach here.</p>
                  ) : null}
                </ul>
              </div>
            </div>
          </>
        ) : null}

        {(tab === 'post' || forcePostTab) && postSnap ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{typeLabel(postSnap.type)}</p>
                <p className="text-sm font-semibold text-white truncate">{postSnap.title}</p>
                <p className="text-[11px] text-zinc-500">
                  Posted {formatPostedAt(postedAtOf(selectedPost)) || '—'}
                </p>
              </div>
              {!forcePostTab ? (
                <button
                  type="button"
                  onClick={() => onSelectPost?.(null)}
                  className="text-[11px] text-zinc-400 hover:text-white shrink-0"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Kpi label="Views" value={formatCount(postSnap.views)} />
              <Kpi label="Likes" value={formatCount(postSnap.likes)} />
              <Kpi label="Comments" value={formatCount(postSnap.comments)} />
              <Kpi label="Shares" value={formatCount(postSnap.shares)} />
              <Kpi label="Engagement" value={`${postSnap.engagementRate}%`} hint="Likes+comments+shares / views" />
              <Kpi
                label="Last hour"
                value={formatCount(postSnap.lastHourViews)}
                tone={postSnap.lastHourViews ? 'hot' : 'default'}
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] p-3">
              <p className="text-xs font-semibold text-zinc-300 mb-1">Post activity · 24h</p>
              <Sparkline buckets={buckets} accent="#34d399" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] p-3">
                <p className="text-xs font-semibold text-zinc-300 mb-2">
                  On this post · {formatCount(postSnap.people)} people
                </p>
                <TypeBreakdown byType={postSnap.byType} />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] p-3">
                <p className="text-xs font-semibold text-zinc-300 mb-2">Recent events</p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {postSnap.recent.map((ev) => {
                    const meta = INTERACTION_TYPES.find((t) => t.id === ev.type)
                    return (
                      <li key={ev.id} className="flex items-center gap-2 text-[11px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta?.color || '#71717a' }} />
                        <span className="text-zinc-300 truncate">{meta?.label || ev.type}</span>
                        <span className="ml-auto text-zinc-600 tabular-nums shrink-0">{formatWhen(ev.at)}</span>
                      </li>
                    )
                  })}
                  {!postSnap.recent.length ? (
                    <p className="text-xs text-zinc-600">No events yet for this post.</p>
                  ) : null}
                </ul>
              </div>
            </div>
          </>
        ) : null}

        {(tab === 'post' || forcePostTab) && !postSnap ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            Select a post in Your posts to open its analytics.
          </p>
        ) : null}

        {tab === 'posts' && !forcePostTab ? (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0a0e] text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Post</th>
                  <th className="px-2 py-2 font-medium text-right">Views</th>
                  <th className="px-2 py-2 font-medium text-right hidden sm:table-cell">Likes</th>
                  <th className="px-2 py-2 font-medium text-right hidden md:table-cell">Comments</th>
                  <th className="px-2 py-2 font-medium text-right">1h</th>
                  <th className="px-3 py-2 font-medium text-right">Eng %</th>
                </tr>
              </thead>
              <tbody>
                {postRows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-b border-zinc-900 hover:bg-zinc-900/50 cursor-pointer',
                      selectedPost?.id === r.id && 'bg-zinc-900/80'
                    )}
                    onClick={() => {
                      onSelectPost?.(r.id)
                      setTab('post')
                    }}
                  >
                    <td className="px-3 py-2 min-w-0">
                      <p className="text-white truncate max-w-[14rem]">{r.title}</p>
                      <p className="text-[10px] text-zinc-600">{typeLabel(r.type)}</p>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-zinc-300">{formatCount(r.views)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-zinc-400 hidden sm:table-cell">{formatCount(r.likes)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-zinc-400 hidden md:table-cell">{formatCount(r.comments)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-emerald-400/90">{r.lastHourViews || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{r.engagementRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!postRows.length ? (
              <p className="p-4 text-xs text-zinc-600">No posts yet.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
