import { useMemo } from 'react'
import { Radio, Upload, Film, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getHomeFeed } from '../lib/contentService'
import ContentCard from './ContentCard'

export default function HomeFeed({ onNavigate, onOpenImport }) {
  const { user } = useAuth()
  const items = useMemo(() => getHomeFeed(user?.id || null), [user?.id])

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Live now</h2>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#EBF4FA] flex items-center justify-center">
            <Radio className="h-6 w-6 text-[#2C729B]" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-800">No live broadcasts yet</p>
          <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Streams appear here when creators go live with a valid key.
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recommended</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by completion, rewatches, and shares — no follower bias
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              <Film className="h-4 w-4" />
              Studio
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#EBF4FA] flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-[#2C729B]" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-800">Your feed is ready</p>
            <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No placeholder videos. Import a link or upload after you sign in to start filling the feed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
