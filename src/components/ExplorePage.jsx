import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getExplore, listLegalLibrary } from '../lib/contentService'
import ContentCard from './ContentCard'

export default function ExplorePage() {
  const [q, setQ] = useState('')
  const results = useMemo(() => getExplore(q), [q])
  const byOrigin = useMemo(() => {
    const lib = listLegalLibrary()
    const map = {}
    for (const item of lib) {
      map[item.origin] = (map[item.origin] || 0) + 1
    }
    return map
  }, [])

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Explore</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Search legal library (NASA, Wikimedia, Archive.org) and your imports
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles, tags, attribution…"
          className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
        />
      </div>

      {!q && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byOrigin).map(([origin, count]) => (
            <button
              key={origin}
              type="button"
              onClick={() => setQ(origin)}
              className="h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-[#2C729B]/40"
            >
              {origin} · {count}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {results.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>

      {results.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">No matches.</p>
      )}
    </div>
  )
}
