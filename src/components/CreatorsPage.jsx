import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { listPopularCreators } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'

export default function CreatorsPage() {
  const syncTick = useContentSyncTick()
  const ranked = useMemo(() => listPopularCreators(24), [syncTick])

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <h1 className="text-lg font-semibold text-white">Creators</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-5">
        People who posted, ranked by watch time, rewatches, and skips — not follower count.
      </p>
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Users className="h-8 w-8 text-white mx-auto" />
          <p className="mt-4 text-sm text-zinc-200">No one has posted yet</p>
          <p className="mt-1.5 text-xs text-zinc-500 max-w-sm mx-auto">
            The first person who publishes a working video, clip, or pic shows up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { if (typeof window !== 'undefined') window.__clipsOpenProfile?.(c.handle, c.id) }}
              className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3 text-left hover:border-zinc-600"
            >
              <div className="h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" /> : (c.displayName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 truncate">{c.displayName}</p>
                <p className="text-xs text-zinc-500">
                  @{c.handle || 'creator'}
                  {c.postCount ? ` · ${c.postCount} post${c.postCount === 1 ? '' : 's'}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
