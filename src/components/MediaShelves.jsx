import ContentCard from './ContentCard'
import { formatDuration, viewsLabel } from '../lib/uiFormat'
import { getViews } from '../lib/engagement'

/** Keep 16:9 videos, 9:16 clips, and square pics on separate shelves.
 * No ads here — recommended / home / profile grids are content only.
 * Clip and pic ads show while scrolling the player or pic viewer.
 */
export default function MediaShelves({ items, onPlayItem, onOpenPic, onOpenProfile, pinOverlay, filter = 'all' }) {
  const videos = (items || []).filter((i) => i && i.type === 'video')
  const shorts = (items || []).filter((i) => i && i.type === 'short')
  const pics = (items || []).filter((i) => i && i.type === 'pic')
  const showVideos = filter === 'all' || filter === 'video'
  const showShorts = filter === 'all' || filter === 'clip'
  const showPics = filter === 'all' || filter === 'pic'

  if (
    (showVideos ? videos.length : 0) + (showShorts ? shorts.length : 0) + (showPics ? pics.length : 0) === 0
  ) return null

  return (
    <div className="space-y-8">
      {showVideos && videos.length > 0 && (
        <section>
          {filter === 'all' ? <h2 className="text-lg font-semibold text-white mb-4">Videos</h2> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {videos.map((item) => (
              <div key={item.id} className="relative">
                {pinOverlay?.(item)}
                <ContentCard item={item} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant="video" />
              </div>
            ))}
          </div>
        </section>
      )}
      {showShorts && shorts.length > 0 && (
        <section>
          {filter === 'all' ? <h2 className="text-lg font-semibold text-white mb-4">Clips</h2> : null}
          <div className="flex gap-3 overflow-x-auto pb-2 chip-scroll">
            {shorts.map((item) => (
              <div key={item.id} className="relative w-[168px] sm:w-[180px] shrink-0">
                {pinOverlay?.(item)}
                <ContentCard item={item} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant="short" />
              </div>
            ))}
          </div>
        </section>
      )}
      {showPics && pics.length > 0 && (
        <section>
          {filter === 'all' ? <h2 className="text-lg font-semibold text-white mb-4">Pics</h2> : null}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
            {pics.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => (onOpenPic || onPlayItem)?.(item)}
                className="relative block w-full aspect-square overflow-hidden rounded-lg bg-[#272727] group"
              >
                {(item.thumbUrl || item.mediaUrl) ? (
                  <img src={item.thumbUrl || item.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[11px] text-white line-clamp-2 opacity-0 group-hover:opacity-100">
                  {item.title || viewsLabel(getViews(item.id))}
                </span>
                {item.durationSec > 0 ? (
                  <span className="absolute top-1.5 right-1.5 text-[10px] bg-black/80 text-white rounded px-1">{formatDuration(item.durationSec)}</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
