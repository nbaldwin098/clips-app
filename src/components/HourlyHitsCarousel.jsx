import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getHourlyHits, nextFeaturedRefreshAt } from '../lib/hourlyHits'
import { creatorDisplayName } from '../lib/uiFormat'
import { useContentSyncTick } from '../lib/useContentSync'
import ChannelAvatar from './ChannelAvatar'

function Thumb({ item, className }) {
  const src = item?.thumbUrl || item?.mosaicThumb || item?.mediaUrl || ''
  if (!src) return <div className={`bg-[#141418] ${className}`} />
  return <img src={src} alt="" className={`object-cover ${className}`} loading="lazy" referrerPolicy="no-referrer" />
}

function Peek({ item, side, onClick }) {
  if (!item) return <div className="hidden lg:block w-[18%] shrink-0" />
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hidden lg:block w-[18%] shrink-0 self-stretch relative overflow-hidden opacity-50 hover:opacity-80 transition-opacity ${side === 'left' ? 'scale-[0.92] origin-right' : 'scale-[0.92] origin-left'}`}
    >
      <Thumb item={item} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-black/40" />
    </button>
  )
}

export default function HourlyHitsCarousel({ onPlayItem, onOpenPic, onOpenProfile }) {
  const syncTick = useContentSyncTick()
  const [now, setNow] = useState(() => Date.now())
  const [index, setIndex] = useState(0)
  const pack = useMemo(() => getHourlyHits(now), [now, syncTick])
  const items = pack.items || []

  useEffect(() => {
    const wait = Math.max(1000, nextFeaturedRefreshAt(now) - Date.now() + 50)
    const t = setTimeout(() => setNow(Date.now()), wait)
    return () => clearTimeout(t)
  }, [now, pack.windowStart])

  useEffect(() => {
    setIndex(0)
  }, [pack.windowStart])

  useEffect(() => {
    if (items.length < 2) return undefined
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 4000)
    return () => clearInterval(t)
  }, [items.length, pack.windowStart])

  if (!items.length) return null

  const i = ((index % items.length) + items.length) % items.length
  const current = items[i]
  const prev = items[(i - 1 + items.length) % items.length]
  const next = items[(i + 1) % items.length]

  const open = (item) => {
    if (!item) return
    if (item.type === 'pic') onOpenPic?.(item)
    else onPlayItem?.(item)
  }

  const openProfile = (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    const creatorId = current?.creatorId || current?.userId
    if (onOpenProfile) onOpenProfile(current?.handle, creatorId)
    else window.__clipsOpenProfile?.(current?.handle, creatorId)
  }

  const go = (dir) => {
    setIndex((n) => (n + dir + items.length) % items.length)
  }

  return (
    <section className="relative w-full border-b border-white/[0.06] bg-[#050506]">
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4">
        <div className="relative flex items-center justify-center min-h-[220px] sm:min-h-[300px] lg:min-h-[360px]">
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-1 sm:left-2 z-20 p-2 text-white/90 flex items-center justify-center hover:text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
            aria-label="Previous"
          >
            <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-1 sm:right-2 z-20 p-2 text-white/90 flex items-center justify-center hover:text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
            aria-label="Next"
          >
            <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" />
          </button>

          <Peek item={prev} side="left" onClick={() => go(-1)} />

          <div className="relative z-10 flex-1 max-w-[920px] aspect-video overflow-hidden bg-black shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              onClick={() => open(current)}
              className="absolute inset-0 w-full h-full text-left group"
              aria-label={current.handle ? `@${String(current.handle).replace(/^@/, '')}` : 'Play featured'}
            >
              <Thumb item={current} className="absolute inset-0 h-full w-full group-hover:scale-[1.02] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            </button>
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex items-center gap-2.5 min-w-0 z-10 pointer-events-none">
              <button
                type="button"
                onClick={openProfile}
                className="pointer-events-auto shrink-0 rounded-full ring-2 ring-white/20 hover:ring-white/50"
                aria-label={`Open @${String(current.handle || 'creator').replace(/^@/, '')} profile`}
              >
                <ChannelAvatar
                  src={current.avatarUrl}
                  name={creatorDisplayName(current) || current.handle}
                  size={36}
                />
              </button>
              <button
                type="button"
                onClick={openProfile}
                className="pointer-events-auto text-sm sm:text-base font-semibold text-white truncate hover:text-zinc-200 drop-shadow"
              >
                @{String(current.handle || creatorDisplayName(current) || 'creator').replace(/^@/, '')}
              </button>
            </div>
          </div>

          <Peek item={next} side="right" onClick={() => go(1)} />
        </div>
      </div>
    </section>
  )
}
