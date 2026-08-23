import ContentCard from './ContentCard'

/** Keep 16:9 videos and 9:16 clips in separate shelves so the grid does not break. */
export default function MediaShelves({ items, onPlayItem, pinOverlay }) {
  const list = (items || []).filter((i) => i && i.type !== 'pic')
  const videos = list.filter((i) => i.type === 'video')
  const shorts = list.filter((i) => i.type !== 'video')

  if (!list.length) return null

  return (
    <div className="space-y-8">
      {videos.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {videos.map((item) => (
              <div key={item.id} className="relative">
                {pinOverlay?.(item)}
                <ContentCard item={item} onOpen={onPlayItem} variant="video" />
              </div>
            ))}
          </div>
        </section>
      )}
      {shorts.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Clips</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {shorts.map((item) => (
              <div key={item.id} className="relative">
                {pinOverlay?.(item)}
                <ContentCard item={item} onOpen={onPlayItem} variant="short" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
