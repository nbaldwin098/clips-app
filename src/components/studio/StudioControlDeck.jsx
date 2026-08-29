import { ArrowRight, Pencil } from 'lucide-react'

function Card({ title, action, children }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#141414] text-left w-full">
      {(title || action) ? (
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1">
          <h2 className="text-[13px] font-semibold text-zinc-100">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-4 pt-3">{children}</div>
    </section>
  )
}

function Kpi({ label, value, hint, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-white/10 bg-[#141414] p-4 text-left hover:bg-[#1a1a1a]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tabular-nums leading-none text-zinc-100">{value}</p>
      <div className="mt-3 h-px bg-white/10" />
      <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>
    </button>
  )
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function ZeroBars() {
  return (
    <div className="flex h-28 items-end gap-1">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} className="flex-1 rounded-sm bg-white/10" style={{ height: '4px' }} />
      ))}
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
  const initial = String(name || 'c').trim().charAt(0).toLowerCase() || 'c'

  return (
    <div className="space-y-3 text-zinc-200">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
        <div className="h-24 w-full bg-[#0e0e12] md:h-32" />
        <div className="px-4 pb-4 md:px-5">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-24 w-24 rounded-xl border border-white/10 object-cover" />
            ) : (
              <div className="h-24 w-24 shrink-0 rounded-xl border border-white/10 bg-black text-3xl font-semibold text-zinc-100 grid place-items-center">{initial}</div>
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

      <button type="button" onClick={onGoLive} className="w-full rounded-xl border border-white/10 bg-[#141414] p-4 text-left hover:bg-[#1a1a1a]">
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
      </button>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue" value={money(earningsUsd)} hint="Opens earnings" onClick={onOpenEarnings} />
        <Kpi label="Audience" value={String(followers || 0)} hint={`${premiumSubs || 0} premium`} onClick={onOpenAnalytics} />
        <Kpi label="Views" value={String(views || 0)} hint={`${likes || 0} likes`} onClick={onOpenAnalytics} />
        <Kpi label="Posts" value={String(postCount)} hint={`${vodCount} VODs`} onClick={onOpenContent} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Published videos" action={
          <button type="button" onClick={onOpenUpload} className="text-[12px] font-medium text-zinc-300 hover:text-white">Upload</button>
        }>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-3 font-semibold">Title</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {postCount ? posts.slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="py-2 pr-3 truncate max-w-[220px]">{p.title || p.caption || 'Untitled'}</td>
                    <td className="py-2 pr-3 text-zinc-500">{p.type || 'video'}</td>
                    <td className="py-2 text-zinc-500">{String(p.createdAt || p.postedAt || '—').slice(0, 10)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="py-6 text-zinc-500">Nothing published. Upload fills this table from real posts.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Channel analytics" action={
          <button type="button" onClick={onOpenAnalytics} className="text-[12px] font-medium text-zinc-300 hover:text-white">Open</button>
        }>
          <ZeroBars />
          <p className="mt-2 text-[11px] text-zinc-500">Last 28 days · {views || 0} views · {money(earningsUsd)} revenue</p>
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
            <p className="mt-1 text-[12px] text-zinc-500">Fills the library table.</p>
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
