import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getHomeFeed } from '../lib/contentService'
import ContentCard from './ContentCard'
import ClipsShelf from './ClipsShelf'

export default function HomeFeed({ onPlayItem }) {
  const { user } = useAuth()
  const items = useMemo(() => getHomeFeed(user?.id || null), [user?.id])

  const videos = items.filter((i) => i.type === 'video')
  const shorts = items.filter((i) => i.type !== 'video')

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full space-y-10">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Recommended</h1>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No posts yet</p>
        </div>
      ) : (
        <>
          {shorts.length > 0 && <ClipsShelf items={shorts} onOpen={onPlayItem} title="Clips" />}

          {videos.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-zinc-200 mb-3">Videos</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 md:gap-5">
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
