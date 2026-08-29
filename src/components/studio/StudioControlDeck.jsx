import { ArrowRight, Pencil } from 'lucide-react'

function Card({ title, action, children, onClick }) {
  const inner = (
    <>
      {(title || action) ? (
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1">
          <h2 className="text-[13px] font-semibold text-zinc-100">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-4 pt-3">{children}</div>
    </>
  )
  const cls = 'rounded-xl border border-white/10 bg-[#141414] text-left w-full'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} hover:bg-[#1a1a1a]`}>
        {inner}
      </button>
    )
  }
  return <section className={cls}>{inner}</section>
}

function Kpi({ label, value, hint, onClick }) {
  return (
    <Card onClick={onClick}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tabular-nums leading-none text-zinc-100">{value}</p>
      <div className="mt-3 h-[3px] rounded-full bg-white/10" />
      <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>
    </Card>
  )
}

function money(n) {
  const v = Number(n || 0)
  return `$${v.toFixed(2)}`
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
  live,
  lastPost = null,
  onGoLive,
  onOpenUpload,
  onOpenAnalytics,
  onOpenContent,
  onOpenEarnings,
}) {
  const handle = user?.handle || user?.username || 'channel'
  const name = user?.displayName || user?.name || 'Your channel'
  const postCount = Array.isArray(posts) ? posts.length : 0
  const vodCount = Array.isArray(vods) ? vods.length : 0
  const liveOn = Boolean(live?.live || live?.isLive)
  const bio = (user?.bio || user?.about || '').trim()

  return (
    <div className="space-y-3 text-zinc-200">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
        <div className="h-24 w-full bg-[#1a1a1a] md:h-32" />
        <div className="px-4 pb-4 md:px-5">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-24 w-24 rounded-full border border-white/10 object-cover" />
            ) : (
              <div className="h-24 w-24 shrink-0 rounded-full border border-white/10 bg-black" />
            )}
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your channel</p>
              <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight text-zinc-100">{name}</h1>
              <p className="text-[13px] text-zinc-400">
                @{handle} · {followers} followers · {postCount} videos
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenContent}
              className="mb-1 inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[12px] font-medium hover:bg-white/5"
            >
              <Pencil className="h-3.5 w-3.5" /> Customize
            </button>
          </div>
          <p className="mt-3 text-[13px] text-zinc-500">{bio || 'No description yet.'}</p>
        </div>
      </section>

      <h2 className="text-[18px] font-semibold text-zinc-100">Channel dashboard</h2>

      <Card onClick={onGoLive}>
        <div className="flex flex-wrap items-end gap-8">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${liveOn ? 'bg-red-600' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              {liveOn ? 'Live now' : 'Offline'}
            </span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Concurrent</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{liveOn ? (live?.viewers || 0) : 0}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Premium</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{premiumSubs || 0}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Session revenue</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{money(0)}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1 text-[12px] text-zinc-400">
          Stream manager <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue" value={money(earningsUsd)} hint="Opens earnings" onClick={onOpenEarnings} />
        <Kpi label="Audience" value={String(followers || 0)} hint={`${premiumSubs || 0} premium`} onClick={onOpenAnalytics} />
        <Kpi label="Views" value={String(views || 0)} hint={`${likes || 0} likes`} onClick={onOpenAnalytics} />
        <Kpi label="Posts" value={String(postCount)} hint={`${vodCount} VODs`} onClick={onOpenContent} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Latest video performance" onClick={onOpenContent}>
          {lastPost ? (
            <>
              <p className="truncate text-sm text-zinc-100">{lastPost.title || lastPost.caption || 'Untitled'}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Open in library</p>
            </>
          ) : (
            <p className="text-[13px] text-zinc-500">No video yet. Open library to upload.</p>
          )}
        </Card>
        <Card title="Last broadcast" onClick={onGoLive}>
          <p className="text-[13px] text-zinc-500">{liveOn ? 'You are live.' : 'No broadcast on record. Open stream manager.'}</p>
        </Card>
        <Card title="Channel analytics" onClick={onOpenAnalytics}>
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-zinc-500">Views</dt><dd>{views || 0}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Posts</dt><dd>{postCount}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Estimated revenue</dt><dd>{money(earningsUsd)}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card title="Published videos" onClick={onOpenContent}>
          {postCount ? (
            <ul className="divide-y divide-white/10">
              {posts.slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2 text-[13px]">
                  <span className="truncate">{p.title || p.caption || 'Untitled'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-zinc-500">Nothing published yet.</p>
          )}
        </Card>
        <Card title="Revenue" onClick={onOpenEarnings}>
          <p className="text-[32px] font-semibold tabular-nums text-zinc-100">{money(earningsUsd)}</p>
          <p className="mt-2 text-[12px] text-zinc-500">Stays $0 until a real charge lands.</p>
        </Card>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#141414] p-4">
        <h2 className="text-[13px] font-semibold text-zinc-100">Next moves</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={onGoLive} className="rounded-lg border border-white/10 bg-black p-3 text-left hover:bg-white/5">
            <p className="text-[13px] font-semibold">Go live</p>
            <p className="mt-1 text-[12px] text-zinc-500">OBS or browser into the lobby.</p>
          </button>
          <button type="button" onClick={onOpenUpload} className="rounded-lg border border-white/10 bg-black p-3 text-left hover:bg-white/5">
            <p className="text-[13px] font-semibold">Upload a video</p>
            <p className="mt-1 text-[12px] text-zinc-500">Fills latest performance.</p>
          </button>
          <button type="button" onClick={onOpenEarnings} className="rounded-lg border border-white/10 bg-black p-3 text-left hover:bg-white/5">
            <p className="text-[13px] font-semibold">Set payout</p>
            <p className="mt-1 text-[12px] text-zinc-500">Studio → Earnings.</p>
          </button>
        </div>
      </section>
    </div>
  )
}
