import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import { getLiked } from '../lib/storage'
import { getById } from '../lib/contentService'
import ContentCard from './ContentCard'
import ClipsShelf from './ClipsShelf'
import PageHeader from './PageHeader'

export default function LikedPage({ onNavigate, onPlayItem }) {
  const likedIds = useMemo(() => getLiked(), [])

  const likedItems = useMemo(() => {
    return likedIds.map((id) => getById(id)).filter(Boolean)
  }, [likedIds])
  const videos = useMemo(() => likedItems.filter((i) => i.type === 'video'), [likedItems])
  const shorts = useMemo(() => likedItems.filter((i) => i.type !== 'video'), [likedItems])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <PageHeader title="Liked" onBack={() => onNavigate?.('home')} />

      {likedItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Heart className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">No liked videos yet</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Give a thumbs up to videos and clips you enjoy to see them grouped here.
          </p>
        </div>
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
