import { useState } from 'react'
import { Search } from 'lucide-react'

export default function ExplorePage() {
  const [q, setQ] = useState('')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Explore</h1>
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles, tags, handles"
          className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
        />
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-700">
          {q.trim() ? `No results for “${q.trim()}”` : 'Search the catalog'}
        </p>
        <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
          Results will only include real uploaded or imported content. No fabricated titles are indexed.
        </p>
      </div>
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Interest filters</h2>
        <div className="flex flex-wrap gap-2">
          {['Gaming', 'Tech', 'Music', 'IRL', 'Creative', 'Esports', 'Education'].map((t) => (
            <button
              key={t}
              className="h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-[#2C729B]/40 hover:text-[#2C729B]"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
