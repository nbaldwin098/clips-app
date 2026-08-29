import { Radio } from 'lucide-react'
import { StudioAreaChart, StudioBarChart } from '../dash/StudioShell'
import { formatCount } from '../../lib/uiFormat'
import { liveBadgeLabel } from '../../lib/liveStatus'
import { getViews } from '../../lib/engagement'
import { formatPostedAt, postedAtOf } from '../../lib/mediaMeta'

function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`border border-[#2a2a2a] bg-[#141414] ${className}`}>
      {(title || action) ? (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {action || null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

function LinkBtn({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300 hover:text-white">
      {children}
    </button>
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
  approved = false,
  verified = false,
  onGoLive,
  onOpenUpload,
  onNavigate,
  onOpenAnalytics,
  onOpenContent,
  onOpenEarnings,
}) {
  const name = user?.displayName || user?.handle || 'Creator'
  const handle = user?.handle ? `@${user.handle}` : 'Your channel'
  const liveOn = !!(live && (live.isLive || live.status === 'live' || live.status === 'lobby'))
  const viewLine = (series.views || []).map((r) => Number(r.value) || 0)
  const followLine = (series.followers || []).map((r) => Number(r.value) || 0)
  const weekPosts = (series.posts || []).slice(-7)
  const published = (posts || []).slice(0, 6)

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#0b0b0b] text-zinc-200">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] overflow-hidden shrink-0">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="h-full w-full flex items-center justify-center text-sm font-semibold">{String(name)[0]}</span>}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white truncate">Welcome back, {name}</h1>
            <p className="text-xs text-zinc-500 truncate">{handle} · Channel dashboard</p>
          </div>
        </div>
        <button type="button" onClick={onGoLive} className="h-10 px-4 inline-flex items-center gap-2 bg-[#eb0400] text-white text-xs font-bold shrink-0">
          <Radio className="h-3.5 w-3.5" /> GO LIVE
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 min-w-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Latest video performance" action={<LinkBtn onClick={onOpenAnalytics}>Go to analytics</LinkBtn>}>
              {lastPost ? (
                <>
                  <p className="text-sm text-white truncate">{lastPost.title || 'Untitled'}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{lastPost.type || 'post'} · {formatPostedAt(postedAtOf(lastPost)) || '—'}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-zinc-500">Views</dt><dd className="tabular-nums text-white">{formatCount(getViews(lastPost.id) || lastPost.views || 0)}</dd></div>
                    <div className="flex justify-between"><dt className="text-zinc-500">Likes</dt><dd className="tabular-nums text-white">{formatCount(likes)}</dd></div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-zinc-500">No video yet. Upload one and this card fills from real views.</p>
              )}
            </Panel>

            <Panel title="Latest stream summary" action={<LinkBtn onClick={onGoLive}>Open stream</LinkBtn>}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Status</p>
                  <p className="mt-1 text-lg font-semibold text-white">{liveOn ? liveBadgeLabel(live) : 'Offline'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Followers</p>
                  <p className="mt-1 text-lg font-semibold text-white tabular-nums">{formatCount(followers)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">VODs</p>
                  <p className="mt-1 text-lg font-semibold text-white tabular-nums">{vods.length}</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Channel analytics" action={<LinkBtn onClick={onOpenAnalytics}>View analytics</LinkBtn>}>
              <p className="text-[10px] uppercase text-zinc-500">Current followers</p>
              <p className="mt-1 text-3xl font-semibold text-white tabular-nums">{formatCount(followers)}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{formatCount(premiumSubs)} premium</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-zinc-500">Views</dt><dd className="tabular-nums text-white">{formatCount(views)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Likes</dt><dd className="tabular-nums text-white">{formatCount(likes)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Posts</dt><dd className="tabular-nums text-white">{posts.length}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Estimated revenue</dt><dd className="tabular-nums text-white">${Number(earningsUsd || 0).toFixed(2)}</dd></div>
              </dl>
            </Panel>
            <Panel title="Views vs followers" action={<span className="text-[11px] text-zinc-500">14 days</span>}>
              <StudioAreaChart seriesA={viewLine} seriesB={followLine} height={140} />
              <div className="mt-2 flex gap-4 text-[10px] text-zinc-500"><span>Views</span><span>Followers</span></div>
            </Panel>
          </div>

          <Panel title="Published videos" action={<LinkBtn onClick={onOpenContent}>See all</LinkBtn>}>
            {published.length === 0 ? (
              <p className="text-sm text-zinc-500">Nothing published yet.</p>
            ) : (
              <ul className="divide-y divide-[#2a2a2a]">
                {published.map((p) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="text-sm text-white truncate">{p.title || p.id}</span>
                    <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{formatCount(getViews(p.id) || 0)} views</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Next moves">
            <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={onGoLive} className="text-left border border-[#2a2a2a] bg-[#101010] p-3">
                <p className="text-sm text-white">Go live</p>
                <p className="mt-1 text-[11px] text-zinc-500">OBS or browser into the lobby.</p>
              </button>
              <button type="button" onClick={() => onOpenUpload?.('video')} className="text-left border border-[#2a2a2a] bg-[#101010] p-3">
                <p className="text-sm text-white">Upload a video</p>
                <p className="mt-1 text-[11px] text-zinc-500">Fills latest performance.</p>
              </button>
              <button type="button" onClick={onOpenEarnings} className="text-left border border-[#2a2a2a] bg-[#101010] p-3">
                <p className="text-sm text-white">Set payout</p>
                <p className="mt-1 text-[11px] text-zinc-500">Studio → Earnings.</p>
              </button>
            </div>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Analytics highlights">
            <StudioBarChart values={weekPosts.map((r) => Number(r.value) || 0)} labels={weekPosts.map((r) => r.day)} />
            <p className="mt-2 text-[11px] text-zinc-500">Posts per day this week. Empty means no uploads those days.</p>
          </Panel>
          <Panel title="Revenue">
            <p className="text-3xl font-semibold text-white tabular-nums">${Number(earningsUsd || 0).toFixed(2)}</p>
            <p className="mt-1 text-[11px] text-zinc-500">Available to withdraw. $0 until a real Stripe charge lands.</p>
            <button type="button" onClick={onOpenEarnings} className="mt-3 text-[11px] font-semibold text-zinc-300">Open earnings</button>
          </Panel>
          <Panel title="Channel">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-zinc-500">Creator</span><span className="text-white">{approved ? 'Approved' : 'Viewer / apply'}</span></li>
              <li className="flex justify-between"><span className="text-zinc-500">Verified</span><span className="text-white">{verified ? 'Yes' : 'No'}</span></li>
              <li className="flex justify-between"><span className="text-zinc-500">Live</span><span className="text-white">{liveBadgeLabel(live) || 'Offline'}</span></li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
