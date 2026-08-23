import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { getSaved } from '../lib/storage'
import { getById } from '../lib/contentService'
import ContentCard from './ContentCard'
import ClipsShelf from './ClipsShelf'
import PageHeader from './PageHeader'

export default function WatchLaterPage({ onNavigate, onPlayItem }) {
  const savedIds = useMemo(() => getSaved(), [])

  const savedItems = useMemo(() => {
    return savedIds.map((id) => getById(id)).filter(Boolean)
  }, [savedIds])
  const videos = useMemo(() => savedItems.filter((i) => i.type === 'video'), [savedItems])
  const shorts = useMemo(() => savedItems.filter((i) => i.type !== 'video'), [savedItems])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <PageHeader title="Watch Later" onBack={() => onNavigate?.('home')} />

      {savedItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Clock className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">Your Watch Later list is empty</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Click the bookmark icon on any clip or video to save it for later.
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
