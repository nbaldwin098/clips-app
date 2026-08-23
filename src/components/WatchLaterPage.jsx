import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { getSaved } from '../lib/storage'
import { getById } from '../lib/contentService'
import ContentCard from './ContentCard'
import PageHeader from './PageHeader'

export default function WatchLaterPage({ onNavigate, onPlayItem }) {
  const savedIds = useMemo(() => getSaved(), [])

  const savedItems = useMemo(() => {
    return savedIds.map((id) => getById(id)).filter(Boolean)
  }, [savedIds])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Watch Later" onBack={() => onNavigate?.('home')} />
      <p className="text-xs text-zinc-500 mb-6">
        Clips and videos you bookmarked to watch at another time ({savedItems.length}).
      </p>

      {savedItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Clock className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">Your Watch Later list is empty</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Click the bookmark icon on any clip or video to save it for later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {savedItems.map((item) => (
            <ContentCard key={item.id} item={item} onOpen={onPlayItem} />
          ))}
        </div>
      )}
    </div>
  )
}
