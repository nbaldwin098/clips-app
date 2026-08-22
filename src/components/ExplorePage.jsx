import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getExplore } from '../lib/contentService'
import ContentCard from './ContentCard'

export default function ExplorePage() {
  const [q, setQ] = useState('')
  const results = useMemo(() => getExplore(q), [q])

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Explore</h1>
        <p className="text-xs text-slate-500 mt-0.5">Search titles and tags from real imports</p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
        />
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">
          {q ? 'No matches.' : 'Nothing to explore yet — import content to fill the catalog.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {results.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
