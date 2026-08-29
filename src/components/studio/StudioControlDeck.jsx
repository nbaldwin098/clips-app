import { Radio } from 'lucide-react'
import { StudioAreaChart, StudioBarChart } from '../dash/StudioShell'
import { formatCount } from '../../lib/uiFormat'
import { liveBadgeLabel } from '../../lib/liveStatus'

function Card({ title, action, children, className = '' }) {
  return (
    <section className={`border border-[#272727] bg-[#121212] ${className}`}>
      {(title || action) ? (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#272727]">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

function Kpi({ label, value, hint }) {
  return (
    <div className="border border-[#272727] bg-[#121212] p-4 min-h-[104px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-zinc-500">{hint}</p> : null}
      <div className="mt-3 h-px bg-[#2a2a2a]" />
    </div>
  )
}

export default function StudioControlDeck({
  user,
  views = 0,
  followers = 0,
  premiumSubs = 0,
  posts = [],
  likes = 0,
  vods = [],
  earningsUsd = 0,
  live = null,
  series = { views: [], followers: [], posts: [] },
  lastPost = null,
  onGoLive,
  onOpenUpload,
  onNavigate,
}) {
  const name = user?.displayName || user?.handle || 'Creator'
  const now = new Date()
  const when = now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const liveOn = !!(live && (live.isLive || live.status === 'live' || live.status === 'lobby'))
  const viewLine = (series.views || []).map((r) => Number(r.value) || 0)
  const followLine = (series.followers || []).map((r) => Number(r.value) || 0)
  const weekPosts = (series.posts || []).slice(-7)

  return (
    <div className="h-full min-h-0 overflow-y-auto space-y-4 max-w-[1280px] text-zinc-200">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Welcome back, {name}</h1>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">{when}</p>
        </div>
        <button
          type="button"
          onClick={onGoLive}
          className="h-10 px-4 inline-flex items-center gap-2 bg-[#eb0400] text-white text-xs font-bold"
        >
          <Radio className="h-3.5 w-3.5" /> GO LIVE
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-8 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-white">{liveOn ? liveBadgeLabel(live) : 'Offline'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Followers</p>
            <p className="mt-1 text-xl font-semibold text-white tabular-nums">{formatCount(followers)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Premium</p>
            <p className="mt-1 text-xl font-semibold text-white tabular-nums">{formatCount(premiumSubs)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Available</p>
            <p className="mt-1 text-xl font-semibold text-white tabular-nums">${Number(earningsUsd || 0).toFixed(2)}</p>
          </div>
        </div>
        <StudioAreaChart seriesA={viewLine} seriesB={followLine} height={160} />
        <div className="mt-2 flex gap-4 text-[10px] text-zinc-500">
          <span>Views</span>
          <span>Followers</span>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue" value={`$${Number(earningsUsd || 0).toFixed(2)}`} hint="Available to withdraw" />
        <Kpi label="Audience" value={formatCount(followers)} hint={`${formatCount(premiumSubs)} premium`} />
        <Kpi label="Views" value={formatCount(views)} hint={`${formatCount(likes)} likes`} />
        <Kpi label="Posts" value={String(posts.length || 0)} hint={`${vods.length} VODs`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Last broadcast" action={<span className="text-[10px] uppercase text-zinc-500">{liveOn ? 'Live' : 'Idle'}</span>}>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-[10px] uppercase text-zinc-500">Status</p><p className="mt-1 text-sm text-white">{liveBadgeLabel(live) || 'Offline'}</p></div>
            <div><p className="text-[10px] uppercase text-zinc-500">Followers</p><p className="mt-1 text-sm text-white tabular-nums">{formatCount(followers)}</p></div>
            <div><p className="text-[10px] uppercase text-zinc-500">Views</p><p className="mt-1 text-sm text-white tabular-nums">{formatCount(views)}</p></div>
          </div>
          <button type="button" onClick={onGoLive} className="mt-4 h-8 px-3 text-[11px] border border-[#272727] text-zinc-300">Open stream</button>
        </Card>
        <Card title="Last upload">
          {lastPost ? (
            <div>
              <p className="text-sm text-white truncate">{lastPost.title || lastPost.id}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{lastPost.type || 'post'} · {formatCount(lastPost.views || 0)} views</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No upload yet.</p>
          )}
          <button type="button" onClick={onOpenUpload} className="mt-4 h-8 px-3 text-[11px] border border-[#272727] text-zinc-300">Upload</button>
        </Card>
        <Card title="Weekly signal">
          <StudioBarChart values={weekPosts.map((r) => Number(r.value) || 0)} labels={weekPosts.map((r) => r.day)} />
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Milestones" className="lg:col-span-2">
          <ul className="space-y-3 text-sm">
            <li className="border-b border-[#272727] pb-3">
              <p className="text-white font-medium">{followers >= 1 ? `${formatCount(followers)} followers` : 'First follower'}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{followers >= 1 ? 'Live count from the catalog. Nothing padded.' : 'Follow stays free. This fills when someone follows you.'}</p>
            </li>
            <li className="border-b border-[#272727] pb-3">
              <p className="text-white font-medium">{posts.length ? `${posts.length} public posts` : 'Publish the first post'}</p>
              <p className="text-[11px] text-zinc-500 mt-1">Videos, clips, and pics you actually uploaded.</p>
            </li>
            <li>
              <p className="text-white font-medium">{Number(earningsUsd) > 0 ? `$${Number(earningsUsd).toFixed(2)} available` : 'First payout'}</p>
              <p className="text-[11px] text-zinc-500 mt-1">Earnings only move after a real Stripe charge.</p>
            </li>
          </ul>
        </Card>
        <Card title="Next moves">
          <div className="space-y-3">
            <button type="button" onClick={onGoLive} className="block w-full text-left">
              <p className="text-sm text-white">Go live</p>
              <p className="text-[11px] text-zinc-500">OBS or browser publish into the same lobby.</p>
            </button>
            <button type="button" onClick={onOpenUpload} className="block w-full text-left">
              <p className="text-sm text-white">Upload a video or clip</p>
              <p className="text-[11px] text-zinc-500">Public posts feed this dashboard.</p>
            </button>
            <button type="button" onClick={() => onNavigate?.('dashboard', 'earnings')} className="block w-full text-left">
              <p className="text-sm text-white">Set payout method</p>
              <p className="text-[11px] text-zinc-500">Studio → Earnings.</p>
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
