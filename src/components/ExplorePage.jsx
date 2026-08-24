import { useEffect, useMemo, useState } from 'react'
import { getExplore, listCatalogTags } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import { cn } from '../lib/utils'
import { filterExploreItems } from '../lib/mediaMeta'
import { getSearchHistory, pushSearchHistory, clearSearchHistory } from '../lib/youtubeParity'
import MediaShelves from './MediaShelves'

const KINDS = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'clip', label: 'Clips' },
  { id: 'pic', label: 'Pics' },
]

const DATES = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
]

const DURS = [
  { id: 'any', label: 'Any length' },
  { id: 'short', label: 'Under 4 min' },
  { id: 'long', label: 'Over 4 min' },
]

export default function ExplorePage({ onPlayItem, onOpenPic, onOpenTag, initialQuery = '', onApplyQuery }) {
  const syncTick = useContentSyncTick()
  const q = String(initialQuery || '').trim()
  const [kind, setKind] = useState('all')
  const [date, setDate] = useState('any')
  const [duration, setDuration] = useState('any')
  const [sort, setSort] = useState('newest')
  const [history, setHistory] = useState(() => getSearchHistory())
  const raw = useMemo(() => getExplore(q, kind), [q, kind, syncTick])
  const results = useMemo(() => filterExploreItems(raw, { date, duration, sort }), [raw, date, duration, sort])
  const tags = useMemo(() => listCatalogTags(16), [syncTick])

  useEffect(() => {
    if (q.length >= 2) {
      pushSearchHistory(q)
      setHistory(getSearchHistory())
    }
  }, [q])

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

      <div className="flex flex-wrap gap-2">
        <select value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded-lg border border-zinc-800 bg-[#000000] px-2 text-xs text-zinc-200">
          {DATES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} className="h-8 rounded-lg border border-zinc-800 bg-[#000000] px-2 text-xs text-zinc-200">
          {DURS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 rounded-lg border border-zinc-800 bg-[#000000] px-2 text-xs text-zinc-200">
          <option value="newest">Newest</option>
          <option value="recommended">Most watched here</option>
        </select>
      </div>

      {!q && history.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">Recent</span>
          {history.slice(0, 8).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onApplyQuery?.(h)}
              className="h-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
            >
              {h}
            </button>
          ))}
          <button type="button" onClick={() => { clearSearchHistory(); setHistory([]) }} className="text-[11px] text-zinc-500 hover:text-white">
            Clear
          </button>
        </div>
      )}

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
