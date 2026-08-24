import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clapperboard, Film, Image as ImageIcon } from 'lucide-react'
import { getHourlyHits, nextFeaturedRefreshAt } from '../lib/hourlyHits'
import { creatorDisplayName, viewsLabel } from '../lib/uiFormat'
import ChannelAvatar from './ChannelAvatar'

function typeMeta(type) {
  if (type === 'short') return { label: 'Clip', Icon: Clapperboard }
  if (type === 'pic') return { label: 'Pic', Icon: ImageIcon }
  return { label: 'Video', Icon: Film }
}

function formatClock(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

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

export default function HourlyHitsCarousel({ onPlayItem, onOpenPic }) {
  const [now, setNow] = useState(() => Date.now())
  const [index, setIndex] = useState(0)
  const pack = useMemo(() => getHourlyHits(now), [now])
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
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 8000)
    return () => clearInterval(t)
  }, [items.length, pack.windowStart])

  if (!items.length) return null

  const i = ((index % items.length) + items.length) % items.length
  const current = items[i]
  const prev = items[(i - 1 + items.length) % items.length]
  const next = items[(i + 1) % items.length]
  const meta = typeMeta(current.type)
  const TypeIcon = meta.Icon

  const open = (item) => {
    if (!item) return
    if (item.type === 'pic') onOpenPic?.(item)
    else onPlayItem?.(item)
  }

  const go = (dir) => {
    setIndex((n) => (n + dir + items.length) % items.length)
  }

  return (
    <section className="relative w-full border-b border-white/[0.06] bg-[#050506]">
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 pt-3 pb-4">
        <div className="flex items-end justify-between gap-3 px-2 mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Last hour</p>
            <p className="text-sm text-zinc-300">Best 5 videos, 10 clips, and 3 pics. New lineup at {formatClock(pack.nextAt)}.</p>
          </div>
          <p className="text-[11px] text-zinc-600 shrink-0 tabular-nums">{i + 1} / {items.length}</p>
        </div>

        <div className="relative flex items-center justify-center min-h-[220px] sm:min-h-[300px] lg:min-h-[360px]">
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-1 sm:left-2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/70 border border-white/15 text-white flex items-center justify-center hover:bg-black/90"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-1 sm:right-2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/70 border border-white/15 text-white flex items-center justify-center hover:bg-black/90"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <Peek item={prev} side="left" onClick={() => go(-1)} />

          <button
            type="button"
            onClick={() => open(current)}
            className="relative z-10 flex-1 max-w-[920px] aspect-video overflow-hidden bg-black text-left group shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
          >
            <Thumb item={current} className="absolute inset-0 h-full w-full group-hover:scale-[1.02] transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-black/70 text-[11px] font-semibold uppercase tracking-wider text-white">
              <TypeIcon className="h-3.5 w-3.5" />
              {meta.label}
            </div>
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5">
              <p className="text-lg sm:text-2xl font-semibold text-white leading-tight line-clamp-2">{current.title || 'Untitled'}</p>
              <div className="mt-2 flex items-center gap-2 min-w-0">
                <ChannelAvatar src={current.avatarUrl} name={creatorDisplayName(current)} size={28} />
                <p className="text-sm text-zinc-200 truncate">{creatorDisplayName(current)}</p>
                {current.hourViews > 0 ? (
                  <p className="text-xs text-zinc-400 shrink-0">{viewsLabel(current.hourViews)} this hour</p>
                ) : null}
              </div>
            </div>
          </button>

          <Peek item={next} side="right" onClick={() => go(1)} />
        </div>
      </div>
    </section>
  )
}
