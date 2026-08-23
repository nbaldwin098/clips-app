import { useMemo, useState } from 'react'
import { getExplore, listCatalogTags } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import { cn } from '../lib/utils'
import MediaShelves from './MediaShelves'

const KINDS = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'clip', label: 'Clips' },
  { id: 'pic', label: 'Pics' },
]

export default function ExplorePage({ onPlayItem, onOpenPic, onOpenTag, initialQuery = '' }) {
  const syncTick = useContentSyncTick()
  const q = String(initialQuery || '').trim()
  const [kind, setKind] = useState('all')
  const results = useMemo(() => getExplore(q, kind), [q, kind, syncTick])
  const tags = useMemo(() => listCatalogTags(16), [syncTick])

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-zinc-100">
        {q ? `Results for “${q}”` : 'Explore'}
      </h1>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-medium border',
              kind === k.id ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400'
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {!q && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => onOpenTag?.(t.tag)}
              className="h-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
            >
              #{t.tag}
            </button>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-12">
          {q ? 'No matches.' : 'Nothing here yet.'}
        </p>
      ) : (
        <MediaShelves items={results} onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
      )}
    </div>
  )
}
