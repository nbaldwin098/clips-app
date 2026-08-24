import { useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  filterAnalyticsRows,
  getCreatorAnalytics,
  getCreatorRanking,
  listCreatorAnalyticsRows,
  summarizeAnalyticsRows,
} from '../lib/engagement'
import { listVods } from '../lib/vods'
import { formatCount } from '../lib/uiFormat'
import { formatPostedAt } from '../lib/mediaMeta'
import { cn } from '../lib/utils'

const RANGES = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
]

function typeLabel(type) {
  if (type === 'video') return 'Video'
  if (type === 'pic') return 'Pic'
  return 'Clip'
}

function MixBars({ byType }) {
  const total = (byType.video || 0) + (byType.short || 0) + (byType.pic || 0)
  if (!total) {
    return <p className="text-sm text-zinc-500">No posts in this range.</p>
  }
  const parts = [
    { key: 'video', label: 'Videos', n: byType.video || 0, className: 'bg-white' },
    { key: 'short', label: 'Clips', n: byType.short || 0, className: 'bg-zinc-500' },
    { key: 'pic', label: 'Pics', n: byType.pic || 0, className: 'bg-zinc-700' },
  ]
  return (
    <div className="space-y-3">
      <div className="h-2.5 w-full rounded-full overflow-hidden bg-zinc-900 flex">
        {parts.map((p) => (
          p.n ? (
            <div
              key={p.key}
              className={p.className}
              style={{ width: `${(p.n / total) * 100}%` }}
              title={`${p.label} ${p.n}`}
            />
          ) : null
        ))}
      </div>
      <ul className="space-y-1.5">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between text-xs text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${p.className}`} />
              {p.label}
            </span>
            <span className="text-white tabular-nums">{p.n}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReachChart({ rows }) {
  const top = [...rows].sort((a, b) => b.views - a.views).slice(0, 8)
  const max = Math.max(1, ...top.map((r) => r.views))
  if (!top.length) {
    return <p className="text-sm text-zinc-500">No view counts yet. This chart stays empty until people watch your posts.</p>
  }
  return (
    <div className="space-y-2">
      {top.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_72px] gap-3 items-center">
          <div className="min-w-0">
            <p className="text-xs text-white truncate">{r.title}</p>
            <div className="mt-1 h-1.5 rounded-full bg-zinc-900 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${(r.views / max) * 100}%` }} />
            </div>
          </div>
          <p className="text-xs text-zinc-400 text-right tabular-nums">{formatCount(r.views)}</p>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage({ onNavigate }) {
  const { user } = useAuth()
  const [range, setRange] = useState('all')
  const [tab, setTab] = useState('overview')
  const lifetime = getCreatorAnalytics(user?.id)
  const rank = getCreatorRanking(user?.id)
  const vods = listVods(user?.id)
  const allRows = useMemo(() => listCreatorAnalyticsRows(user?.id), [user?.id])
  const rows = useMemo(() => filterAnalyticsRows(allRows, range), [allRows, range])
  const sum = useMemo(() => summarizeAnalyticsRows(rows), [rows])

  const kpis = [
    { label: 'Views', value: formatCount(sum.views), hint: 'On posts in this range' },
    { label: 'Likes', value: formatCount(sum.likes), hint: 'On posts in this range' },
    { label: 'Posts', value: String(sum.posts), hint: range === 'all' ? 'All published' : 'Published in this range' },
    { label: 'Watch hours', value: lifetime.watchHours, hint: 'All time on this device' },
  ]

  return (
    <div className="min-h-full bg-[#000000]">
      <div className="p-4 md:p-6 max-w-[1120px] mx-auto">
        <PageHeader
          title="Analytics"
          subtitle="Your posts on this device. Money is not tied to a view rate."
          onBack={() => onNavigate?.('dashboard')}
          actions={(
            <div className="flex rounded-lg border border-zinc-800 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={cn(
                    'h-8 px-2.5 rounded-md text-[11px] font-semibold',
                    range === r.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        />

        <div className="flex gap-5 border-b border-zinc-800 mb-5">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'posts', label: 'Posts' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'h-9 text-sm font-medium border-b-2 -mb-px',
                tab === t.id ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-white'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((c) => (
                <div key={c.label} className="rounded-xl border border-zinc-800 bg-[#0c0c10] p-4">
                  <p className="text-[11px] text-zinc-500">{c.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white tabular-nums">{c.value}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">{c.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-3">
              <section className="lg:col-span-3 rounded-xl border border-zinc-800 bg-[#0c0c10] p-4">
                <p className="text-sm font-semibold text-white">Reach by post</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 mb-4">Highest view counts in this range. Empty until watches are recorded.</p>
                <ReachChart rows={rows} />
              </section>
              <section className="lg:col-span-2 rounded-xl border border-zinc-800 bg-[#0c0c10] p-4">
                <p className="text-sm font-semibold text-white">Post mix</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 mb-4">How many videos, clips, and pics you published.</p>
                <MixBars byType={sum.byType} />
                <dl className="mt-6 space-y-2 text-xs text-zinc-500">
                  <div className="flex justify-between gap-2">
                    <dt>Subscribers</dt>
                    <dd className="text-white tabular-nums">{formatCount(lifetime.subscribers)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Premium paid</dt>
                    <dd className="text-white tabular-nums">{formatCount(lifetime.premiumSubs)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Past lives</dt>
                    <dd className="text-white tabular-nums">{vods.length}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Rank on this device</dt>
                    <dd className="text-white tabular-nums">{rank ? `#${rank}` : '—'}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        ) : (
          <section className="rounded-xl border border-zinc-800 bg-[#0c0c10] overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-sm font-semibold text-white">Posts</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{sum.posts ? `${sum.posts} in this range` : 'Nothing published in this range.'}</p>
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-12 text-sm text-zinc-500 text-center">No posts to list.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="font-medium px-4 py-2.5">Title</th>
                      <th className="font-medium px-4 py-2.5">Type</th>
                      <th className="font-medium px-4 py-2.5 text-right">Views</th>
                      <th className="font-medium px-4 py-2.5 text-right">Likes</th>
                      <th className="font-medium px-4 py-2.5 text-right">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows].sort((a, b) => b.views - a.views).map((r) => (
                      <tr key={r.id} className="border-b border-zinc-900 last:border-0">
                        <td className="px-4 py-2.5 text-white max-w-[280px] truncate">{r.title}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{typeLabel(r.type)}</td>
                        <td className="px-4 py-2.5 text-right text-white tabular-nums">{formatCount(r.views)}</td>
                        <td className="px-4 py-2.5 text-right text-white tabular-nums">{formatCount(r.likes)}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-500">{formatPostedAt(r.createdAt) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <p className="mt-6 text-xs text-zinc-500 max-w-2xl">
          Site ads always run, but ad money is not a creator share and no ad revenue shows here. Apply to earn if you want payouts. This portal does not invent daily graphs.
        </p>
      </div>
    </div>
  )
}
