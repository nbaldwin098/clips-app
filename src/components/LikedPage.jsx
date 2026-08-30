import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getLiked } from '../lib/storage'
import { getUserUpvotedIds } from '../lib/engagement'
import { resolvePlayableItem } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import MediaShelves from './MediaShelves'
import PageHeader from './PageHeader'

export default function LikedPage({ onNavigate, onPlayItem }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const likedIds = useMemo(() => {
    const ids = new Set([...(getLiked() || []), ...getUserUpvotedIds(user?.id)])
    return [...ids]
  }, [syncTick, user?.id])
  const likedItems = useMemo(() => likedIds.map((id) => resolvePlayableItem(id)).filter(Boolean), [likedIds, syncTick])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Liked" onBack={() => onNavigate?.('home')} />
      {likedItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Heart className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">No liked videos yet</p>
        </div>
      ) : (
        <MediaShelves items={likedItems} onPlayItem={onPlayItem} />
      )}
    </div>
  )
}
