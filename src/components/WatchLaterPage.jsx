import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { getSaved } from '../lib/storage'
import { getWatchItem } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import MediaShelves from './MediaShelves'
import PageHeader from './PageHeader'

export default function WatchLaterPage({ onNavigate, onPlayItem }) {
  const syncTick = useContentSyncTick()
  const savedIds = useMemo(() => getSaved(), [syncTick])
  const savedItems = useMemo(() => savedIds.map((id) => getWatchItem(id)).filter(Boolean), [savedIds, syncTick])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Watch Later" onBack={() => onNavigate?.('home')} />
      {savedItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Clock className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">Nothing saved yet</p>
        </div>
      ) : (
        <MediaShelves items={savedItems} onPlayItem={onPlayItem} />
      )}
    </div>
  )
}
