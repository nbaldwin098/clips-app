import { useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getHomeFeed } from '../lib/contentService'
import { recordInteraction } from '../lib/algorithmEngine'
import { useContentSyncTick } from '../lib/useContentSync'
import ContentCard from './ContentCard'

const PAGE = 4

export default function HomeFeed({ onPlayItem }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const items = useMemo(() => getHomeFeed(user?.id || null), [user?.id, syncTick])
  const [offset, setOffset] = useState(0)

  const videos = items.filter((i) => i.type === 'video')
  const shorts = items.filter((i) => i.type !== 'video')

  const visible = shorts.length
    ? Array.from({ length: Math.min(PAGE, shorts.length) }, (_, i) => shorts[(offset + i) % shorts.length])
    : []

  const shift = useCallback(
    (dir) => {
      if (!shorts.length) return
      setOffset((o) => (o + dir + shorts.length) % shorts.length)
      const shown = shorts[(offset + dir + shorts.length) % shorts.length]
      if (shown && user?.id) {
        recordInteraction(user.id, {
          contentId: shown.id,
          type: 'impression',
          tags: shown.tags || [],
          creatorId: shown.creatorId || shown.userId,
        })
      }
    },
    [shorts, offset, user?.id]
  )

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full space-y-10">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Recommended</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Videos · YouTube layout · Clips · Shorts layout</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No posts yet</p>
          <p className="mt-1.5 text-xs text-zinc-500 max-w-md mx-auto">Upload with a title and description from +.</p>
        </div>
      ) : (
        <>
          {videos.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-zinc-200 mb-3">Videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {videos.map((item) => (
                  <ContentCard key={item.id} item={item} onOpen={onPlayItem} variant="video" />
                ))}
              </div>
            </section>
          )}

          {shorts.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-zinc-200 mb-3">Clips</h2>
              <div className="relative group">
                <button type="button" onClick={() => shift(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/70 border border-zinc-700 text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" aria-label="Previous">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-1">
                  {visible.map((item, idx) => (
                    <ContentCard key={`${item.id}-${offset}-${idx}`} item={item} onOpen={onPlayItem} variant="short" />
                  ))}
                </div>
                <button type="button" onClick={() => shift(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/70 border border-zinc-700 text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" aria-label="Next">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shorts.slice(0, 12).map((item) => (
                  <ContentCard key={`row-${item.id}`} item={item} onOpen={onPlayItem} variant="short" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
