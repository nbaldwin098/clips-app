import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  filterAnalyticsRows,
  getCreatorAnalytics,
  getCreatorRanking,
  listCreatorAnalyticsRows,
  summarizeAnalyticsRows,
} from '../../lib/engagement'
import { listVods } from '../../lib/vods'
import { formatCount } from '../../lib/uiFormat'
import { formatPostedAt } from '../../lib/mediaMeta'
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsCard,
  SettingsKpiGrid,
  SettingsTabs,
  SettingsRangePicker,
  SettingsTable,
  SettingsStatList,
} from './SettingsTemplates'

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

export default function CreatorAnalyticsPanel({ embedded = false, showBack = false, onNavigate }) {
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

  const postColumns = [
    { key: 'title', label: 'Title', truncate: true },
    { key: 'type', label: 'Type', muted: true, render: (r) => typeLabel(r.type) },
    { key: 'views', label: 'Views', align: 'right', render: (r) => formatCount(r.views) },
    { key: 'likes', label: 'Likes', align: 'right', render: (r) => formatCount(r.likes) },
    {
      key: 'createdAt',
      label: 'Posted',
      align: 'right',
      muted: true,
      render: (r) => formatPostedAt(r.createdAt) || '—',
    },
  ]

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.views - a.views), [rows])

  return (
    <div className={embedded ? 'space-y-6 pb-8' : 'space-y-6'}>
      {showBack ? (
        <button type="button" onClick={() => onNavigate?.('dashboard')} className="text-sm text-zinc-400 hover:text-white">
          ← Back to dashboard
        </button>
      ) : null}
      <SettingsPageHeader
        title="Analytics"
        subtitle="Your posts on this device. Money is not tied to a view rate."
        actions={<SettingsRangePicker ranges={RANGES} value={range} onChange={setRange} />}
      />

      <SettingsTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'posts', label: 'Posts' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' ? (
        <SettingsSection>
          <SettingsKpiGrid items={kpis} />
          <div className="grid lg:grid-cols-5 gap-3 mt-4">
            <SettingsCard
              className="lg:col-span-3"
              title="Reach by post"
              description="Highest view counts in this range. Empty until watches are recorded."
            >
              <ReachChart rows={rows} />
            </SettingsCard>
            <SettingsCard
              className="lg:col-span-2"
              title="Post mix"
              description="How many videos, clips, and pics you published."
            >
              <MixBars byType={sum.byType} />
              <div className="mt-6">
                <SettingsStatList
                  items={[
                    { label: 'Followers', value: formatCount(lifetime.subscribers) },
                    { label: 'Premium paid', value: formatCount(lifetime.premiumSubs) },
                    { label: 'Past lives', value: String(vods.length) },
                    { label: 'Rank on this device', value: rank ? `#${rank}` : '—' },
                  ]}
                />
              </div>
            </SettingsCard>
          </div>
        </SettingsSection>
      ) : (
        <SettingsCard
          title="Posts"
          description={sum.posts ? `${sum.posts} in this range` : 'Nothing published in this range.'}
        >
          <SettingsTable
            columns={postColumns}
            rows={sortedRows}
            emptyMessage="No posts to list."
          />
        </SettingsCard>
      )}

      <p className="text-xs text-zinc-500 max-w-2xl">
        Site ads always run, but ad money is not a creator share and no ad revenue shows here. Apply to earn if you want payouts. This portal does not invent daily graphs.
      </p>

      {embedded ? (
        <button type="button" onClick={() => onNavigate?.('analytics')} className="text-xs text-white underline">
          Open full-screen analytics
        </button>
      ) : null}
    </div>
  )
}
