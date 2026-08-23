import { useMemo } from 'react'
import { getExplore } from '../lib/contentService'
import { listIndexedUsers } from '../lib/moderation'
import { useContentSyncTick } from '../lib/useContentSync'
import MediaShelves from './MediaShelves'

export default function ExplorePage({ onPlayItem, initialQuery = '' }) {
  const syncTick = useContentSyncTick()
  const q = String(initialQuery || '').trim()
  const results = useMemo(() => getExplore(q), [q, syncTick])
  const creators = useMemo(() => {
    const needle = q.toLowerCase()
    if (!needle) return []
    return listIndexedUsers()
      .filter((u) => {
        const handle = String(u.handle || '').toLowerCase()
        const name = String(u.displayName || '').toLowerCase()
        return handle.includes(needle) || name.includes(needle)
      })
      .slice(0, 8)
  }, [q, syncTick])

  const openProfile = (creator) => {
    if (typeof window !== 'undefined') window.__clipsOpenProfile?.(creator.handle, creator.id)
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-zinc-100">
        {q ? `Results for “${q}”` : 'Explore'}
      </h1>

      {creators.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300">Creators</h2>
          {creators.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openProfile(c)}
              className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3 text-left hover:border-zinc-600"
            >
              <span className="h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" /> : (c.displayName || '?')[0]?.toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-zinc-100 truncate">{c.displayName}</span>
                <span className="block text-xs text-zinc-500">@{c.handle}</span>
              </span>
            </button>
          ))}
        </section>
      )}

      {results.length === 0 && creators.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-12">
          {q ? 'No matches.' : 'Nothing here yet.'}
        </p>
      ) : results.length > 0 ? (
        <MediaShelves items={results} onPlayItem={onPlayItem} />
      ) : null}
    </div>
  )
}
