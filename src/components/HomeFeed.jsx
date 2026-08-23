import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getHomeFeed } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import MediaShelves from './MediaShelves'

export default function HomeFeed({ onPlayItem }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const items = useMemo(() => getHomeFeed(user?.id || null), [user?.id, syncTick])

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full space-y-8">
      <h1 className="text-lg font-semibold text-zinc-100">Recommended</h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No posts yet</p>
        </div>
      ) : (
        <MediaShelves items={items} onPlayItem={onPlayItem} />
      )}
    </div>
  )
}
