import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * YouTube Shorts-style stage.
 * Header + sidebar stay in the app chrome. This is a padded 9:16 column
 * in the main area — not a fixed fullscreen takeover.
 */
function fitPortrait(availW, availH, maxW = 420) {
  const wBound = Math.max(0, Math.min(availW, maxW))
  const hBound = Math.max(0, availH)
  if (wBound < 8 || hBound < 8) return { w: 0, h: 0 }
  let h = Math.min(hBound, Math.round(wBound * 16 / 9))
  let w = Math.round(h * 9 / 16)
  if (w > wBound) {
    w = wBound
    h = Math.round(w * 16 / 9)
  }
  return { w, h }
}

export const PRELOAD_NEAR = 2

export default function ShortsStage({
  count,
  activeIndex = 0,
  onActiveIndex,
  initialIndex = 0,
  header = null,
  renderSlide,
  empty = null,
  bleedMobile = false,
  loop = true,
}) {
  const scrollerRef = useRef(null)
  const n = Math.max(0, Number(count) || 0)
  const copies = loop && n > 0 ? 3 : 1
  const jumping = useRef(false)
  const lastStart = useRef(null)
  const [reelPos, setReelPos] = useState(0)

  const pageHeight = () => scrollerRef.current?.clientHeight || 1
  const middleReel = (logical) => (loop ? n : 0) + logical

  const scrollToReel = (reelIdx, behavior = 'auto') => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: reelIdx * pageHeight(), behavior })
  }

  useEffect(() => {
    if (!n) return
    const start = Math.max(0, Math.min(n - 1, Number(initialIndex) || 0))
    const token = `${n}:${start}:${loop}`
    if (lastStart.current === token) return
    lastStart.current = token
    const startReel = middleReel(start)
    const id = requestAnimationFrame(() => {
      scrollToReel(startReel)
      setReelPos(startReel)
      onActiveIndex?.(start)
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, initialIndex, loop])

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el || !n || jumping.current) return
    const h = pageHeight()
    const reelIdx = Math.round(el.scrollTop / h)
    const logical = ((reelIdx % n) + n) % n
    setReelPos(reelIdx)
    onActiveIndex?.(logical)
    if (loop && n > 0 && (reelIdx < n || reelIdx >= n * 2)) {
      jumping.current = true
      const target = middleReel(logical)
      el.scrollTop = target * h
      setReelPos(target)
      requestAnimationFrame(() => { jumping.current = false })
    }
  }, [n, loop, onActiveIndex])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll])

  const step = useCallback((dir) => {
    if (!n) return
    const next = (activeIndex + dir + n) % n
    scrollToReel(middleReel(next), 'smooth')
    onActiveIndex?.(next)
  }, [activeIndex, n, loop, onActiveIndex])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        step(1)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  if (!n) return empty

  const reel = []
  for (let c = 0; c < copies; c += 1) {
    for (let i = 0; i < n; i += 1) {
      reel.push({ key: `${c}-${i}`, index: i, reelIdx: c * n + i })
    }
  }

  return (
    <div className="h-full min-h-0 w-full bg-[#000000] flex flex-col relative">
      {header}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollerRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {reel.map((row) => (
            <div
              key={row.key}
              className={
                bleedMobile
                  ? 'h-full w-full snap-start snap-always shrink-0 flex items-stretch md:items-center justify-center px-0 py-0 md:px-10 md:py-8'
                  : 'h-full w-full snap-start snap-always shrink-0 flex items-center justify-center px-3 py-4 sm:px-10 sm:py-8'
              }
            >
              {Math.abs(row.reelIdx - reelPos) <= PRELOAD_NEAR
                ? renderSlide(row.index, row.reelIdx === reelPos, Math.abs(row.reelIdx - reelPos) === 1)
                : null}
            </div>
          ))}
        </div>

        {n > 1 && (
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
            <button
              type="button"
              onClick={() => step(-1)}
              className="h-10 w-10 rounded-full bg-[#272727] hover:bg-[#3d3d3d] text-white flex items-center justify-center"
              aria-label="Previous"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="h-10 w-10 rounded-full bg-[#272727] hover:bg-[#3d3d3d] text-white flex items-center justify-center"
              aria-label="Next"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ShortsCard({ children, actions, fillMobile = false }) {
  const hostRef = useRef(null)
  const [box, setBox] = useState(() => ({
    w: 0,
    h: 0,
    desktop: typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  }))

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setBox({
        w: r.width,
        h: r.height,
        desktop: typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const rail = box.desktop && actions ? 64 : 0
  const dim = fitPortrait(box.w - rail, box.h, 420)
  const mobileFill = fillMobile && !box.desktop

  if (mobileFill) {
    return (
      <div ref={hostRef} className="h-full w-full">
        <div className="relative h-full w-full bg-black overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div ref={hostRef} className="h-full w-full flex items-end justify-center gap-3">
      <div
        className="relative bg-black overflow-hidden rounded-xl sm:rounded-2xl shrink-0 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
        style={
          dim.w
            ? { width: dim.w, height: dim.h }
            : { height: '100%', aspectRatio: '9 / 16', maxWidth: 'min(420px, 100%)' }
        }
      >
        {children}
      </div>
      {actions ? (
        <div className="hidden md:flex flex-col items-center gap-4 pb-8 shrink-0 w-14">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
