import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import { getLiked } from '../lib/storage'
import { getById } from '../lib/contentService'
import ContentCard from './ContentCard'
import PageHeader from './PageHeader'

export default function LikedPage({ onNavigate, onPlayItem }) {
  const likedIds = useMemo(() => getLiked(), [])

  const likedItems = useMemo(() => {
    return likedIds.map((id) => getById(id)).filter(Boolean)
  }, [likedIds])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Liked" onBack={() => onNavigate?.('home')} />
      <p className="text-xs text-zinc-500 mb-6">
        All clips and videos you have given a thumbs up to ({likedItems.length}).
      </p>

      {likedItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Heart className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">No liked videos yet</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Give a thumbs up to videos and clips you enjoy to see them grouped here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {likedItems.map((item) => (
            <ContentCard key={item.id} item={item} onOpen={onPlayItem} />
          ))}
        </div>
      )}
    </div>
  )
}
