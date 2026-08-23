import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getExplore } from '../lib/contentService'
import ContentCard from './ContentCard'
import ClipsShelf from './ClipsShelf'

export default function ExplorePage({ onPlayItem }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => getExplore(q), [q])
  const videos = useMemo(() => results.filter((i) => i.type === 'video'), [results])
  const shorts = useMemo(() => results.filter((i) => i.type !== 'video'), [results])

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Explore</h1>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full h-11 rounded-full border border-zinc-800 bg-[#121218] pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white focus:border-white/40"
        />
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-12">
          {q ? 'No matches.' : 'No items found.'}
        </p>
      ) : (
        <>
          {shorts.length > 0 && <ClipsShelf items={shorts} onOpen={onPlayItem} title="Clips" />}

          {videos.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-zinc-200 mb-3">Videos</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {videos.map((item) => (
                  <ContentCard key={item.id} item={item} onOpen={onPlayItem} variant="video" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
