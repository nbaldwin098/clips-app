import { useState } from 'react'
import { MoreVertical, Share2 } from 'lucide-react'
import { copyShareUrl } from '../lib/routes'
import { isRecentShort } from '../lib/mediaMeta'
import { safeMediaUrl } from '../lib/safeUrl'

function GridThumb({ item }) {
  const src = safeMediaUrl(item.thumbUrl)
  const video = safeMediaUrl(item.mediaUrl || item.sourceUrl)
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    )
  }
  if (video) {
    return (
      <video
        src={video}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
      />
    )
  }
  return <div className="absolute inset-0 bg-zinc-800" />
}

function ShortTile({ item, onOpen }) {
  const [menu, setMenu] = useState(false)
  const fresh = isRecentShort(item)

  const share = async (e) => {
    e.stopPropagation()
    setMenu(false)
    try { await copyShareUrl('clips', item.id) } catch {}
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="relative block w-full aspect-[9/16] overflow-hidden rounded-xl bg-zinc-900"
      >
        <GridThumb item={item} />
        {fresh ? (
          <span className="absolute top-2 left-2 z-10 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            New
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pt-10 pb-2">
          <p className="text-[13px] font-medium text-white leading-snug line-clamp-2 text-left">
            {item.title || 'Untitled'}
          </p>
        </div>
      </button>
      <button
        type="button"
        className="absolute top-1.5 right-1.5 z-20 h-8 w-8 rounded-full text-white flex items-center justify-center hover:bg-black/40"
        aria-label="More"
        onClick={(e) => { e.stopPropagation(); setMenu((v) => !v) }}
      >
        <MoreVertical className="h-4 w-4 drop-shadow" />
      </button>
      {menu ? (
        <div className="absolute top-10 right-2 z-30 min-w-[8rem] rounded-lg border border-zinc-700 bg-[#212121] py-1 shadow-xl">
          <button type="button" onClick={share} className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 inline-flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function ShortsGrid({ items, onOpen, tab = 'recommended', onTab }) {
  return (
    <div className="h-full overflow-y-auto bg-[#000000]">
      <div className="sticky top-0 z-10 bg-[#000000]/95 backdrop-blur px-4 py-3">
        {onTab ? (
          <div className="flex gap-1 rounded-full bg-white/10 p-1 w-fit">
            {['recommended', 'following'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onTab(id)}
                className={`h-8 px-4 rounded-full text-sm font-semibold ${
                  tab === id ? 'bg-white text-black' : 'text-white/70'
                }`}
              >
                {id === 'recommended' ? 'Recommended' : 'Subscribed'}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-4 pt-10 text-sm text-zinc-400 text-center">
          {tab === 'following' ? 'Subscribe to creators to fill this shelf.' : 'No clips yet'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 pb-16">
          {items.map((item) => (
            <ShortTile key={item.id} item={item} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
