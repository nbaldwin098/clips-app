import { useMemo } from 'react'
import ContentCard from './ContentCard'
import { formatDuration, viewsLabel } from '../lib/uiFormat'
import { getViews } from '../lib/engagement'
import { mixFeedAds } from '../lib/adEngine'
import { InFeedAd } from './AdUnits'

/** Keep 16:9 videos, 9:16 clips, and square pics on separate shelves. */
export default function MediaShelves({ items, onPlayItem, onOpenPic, pinOverlay, filter = 'all' }) {
  const videos = (items || []).filter((i) => i && i.type === 'video')
  const shorts = (items || []).filter((i) => i && i.type === 'short')
  const pics = (items || []).filter((i) => i && i.type === 'pic')
  const showVideos = filter === 'all' || filter === 'video'
  const showShorts = filter === 'all' || filter === 'clip'
  const showPics = filter === 'all' || filter === 'pic'
  const clipRows = useMemo(
    () => mixFeedAds((items || []).filter((i) => i && i.type === 'short'), 'clip-feed'),
    [items],
  )
  const picRows = useMemo(
    () => mixFeedAds((items || []).filter((i) => i && i.type === 'pic'), 'pic-feed'),
    [items],
  )

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
                <ContentCard item={item} onOpen={onPlayItem} variant="video" />
              </div>
            ))}
          </div>
        </section>
      )}
      {showShorts && shorts.length > 0 && (
        <section>
          {filter === 'all' ? <h2 className="text-lg font-semibold text-white mb-4">Short videos</h2> : null}
          <div className="flex gap-3 overflow-x-auto pb-2 chip-scroll">
            {clipRows.map((row) => (
              row.kind === 'ad' ? (
                <div key={row.key} className="relative w-[168px] sm:w-[180px] shrink-0">
                  <InFeedAd ad={row.ad} variant="clip" />
                </div>
              ) : (
                <div key={row.key || row.item.id} className="relative w-[168px] sm:w-[180px] shrink-0">
                  {pinOverlay?.(row.item)}
                  <ContentCard item={row.item} onOpen={onPlayItem} variant="short" />
                </div>
              )
            ))}
          </div>
        </section>
      )}
      {showPics && pics.length > 0 && (
        <section>
          {filter === 'all' ? <h2 className="text-lg font-semibold text-white mb-4">Pics</h2> : null}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
            {picRows.map((row) => (
              row.kind === 'ad' ? (
                <InFeedAd key={row.key} ad={row.ad} variant="pic" />
              ) : (
                <button
                  key={row.key || row.item.id}
                  type="button"
                  onClick={() => (onOpenPic || onPlayItem)?.(row.item)}
                  className="relative block w-full aspect-square overflow-hidden rounded-lg bg-[#272727] group"
                >
                  {(row.item.thumbUrl || row.item.mediaUrl) ? (
                    <img src={row.item.thumbUrl || row.item.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[11px] text-white line-clamp-2 opacity-0 group-hover:opacity-100">
                    {row.item.title || viewsLabel(getViews(row.item.id))}
                  </span>
                  {row.item.durationSec > 0 ? (
                    <span className="absolute top-1.5 right-1.5 text-[10px] bg-black/80 text-white rounded px-1">{formatDuration(row.item.durationSec)}</span>
                  ) : null}
                </button>
              )
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
