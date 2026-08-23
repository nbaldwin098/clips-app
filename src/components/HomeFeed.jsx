import { useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getHomeFeed } from '../lib/contentService'
import { recordInteraction } from '../lib/algorithmEngine'
import ContentCard from './ContentCard'

const PAGE = 3

export default function HomeFeed() {
  const { user } = useAuth()
  const items = useMemo(() => getHomeFeed(user?.id || null), [user?.id])
  const [offset, setOffset] = useState(0)

  const visible = items.length
    ? Array.from({ length: Math.min(PAGE, items.length) }, (_, i) => items[(offset + i) % items.length])
    : []

  const shift = useCallback(
    (dir) => {
      if (!items.length) return
      const current = items[offset]
      if (current && user?.id) {
        // Fast swipe past is an implicit skip signal
        recordInteraction(user.id, {
          contentId: current.id,
          type: 'skip',
          tags: current.tags || [],
          creatorId: current.creatorId || current.userId,
        })
      }
      setOffset((o) => {
        const next = (o + dir + items.length) % items.length
        const shown = items[next]
        if (shown && user?.id) {
          recordInteraction(user.id, {
            contentId: shown.id,
            type: 'impression',
            tags: shown.tags || [],
            creatorId: shown.creatorId || shown.userId,
          })
        }
        return next
      })
    },
    [items, offset, user?.id]
  )

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Recommended</h1>
          <p className="text-xs text-zinc-500 mt-0.5">For You · TikTok-style real-time learning (completion, loops, shares)</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No clips in the feed yet</p>
          <p className="mt-1.5 text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
            When creators import or upload, the learning ranker places them here. Live only appears if the algorithm surfaces it.
          </p>
        </div>
      ) : (
        <div className="relative group">
          <button type="button" onClick={() => shift(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/70 border border-zinc-700 text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:border-white hover:text-white" aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 px-2">
            {visible.map((item, idx) => (
              <ContentCard key={`${item.id}-${offset}-${idx}`} item={item} />
            ))}
          </div>
          <button type="button" onClick={() => shift(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/70 border border-zinc-700 text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:border-white hover:text-white" aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {items.slice(0, Math.min(items.length, 12)).map((item) => (
              <ContentCard key={`row-${item.id}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
