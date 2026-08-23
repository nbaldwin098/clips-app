import ContentCard from './ContentCard'

/** Keep 16:9 videos, 9:16 clips, and square pics on separate shelves. */
export default function MediaShelves({ items, onPlayItem, onOpenPic, pinOverlay }) {
  const videos = (items || []).filter((i) => i && i.type === 'video')
  const shorts = (items || []).filter((i) => i && i.type === 'short')
  const pics = (items || []).filter((i) => i && i.type === 'pic')

  if (!videos.length && !shorts.length && !pics.length) return null

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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {shorts.map((item) => (
              <div key={item.id} className="relative">
                {pinOverlay?.(item)}
                <ContentCard item={item} onOpen={onPlayItem} variant="short" />
              </div>
            ))}
          </div>
        </section>
      )}
      {pics.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Pics</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-0.5">
            {pics.map((pic) => (
              <button
                key={pic.id}
                type="button"
                onClick={() => (onOpenPic || onPlayItem)?.(pic)}
                className="relative block w-full aspect-square overflow-hidden bg-zinc-800"
              >
                {(pic.thumbUrl || pic.mediaUrl) ? (
                  <img src={pic.thumbUrl || pic.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
