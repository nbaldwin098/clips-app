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

export const PRELOAD_NEAR = 4

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
  goToRef = null,
}) {
  const scrollerRef = useRef(null)
  const n = Math.max(0, Number(count) || 0)
  const copies = loop && n > 0 ? 3 : 1
  const jumping = useRef(false)
  const lastStart = useRef(null)
  const lastCount = useRef(n)
  const lastWheel = useRef(0)
  const [reelPos, setReelPos] = useState(0)

  const pageHeight = () => scrollerRef.current?.clientHeight || 1
  const middleReel = (logical) => (loop ? n : 0) + logical

  const scrollToReel = (reelIdx, behavior = 'auto') => {
    const el = scrollerRef.current
    if (!el) return
    const top = reelIdx * pageHeight()
    if (behavior === 'auto') {
      el.scrollTop = top
      return
    }
    el.scrollTo({ top, behavior })
  }

  const snapToNearest = useCallback(() => {
    const el = scrollerRef.current
    if (!el || !n || jumping.current) return
    const h = pageHeight()
    const reelIdx = Math.round(el.scrollTop / h)
    const targetTop = reelIdx * h
    if (Math.abs(el.scrollTop - targetTop) > 3) {
      jumping.current = true
      el.scrollTop = targetTop
      requestAnimationFrame(() => { jumping.current = false })
    }
  }, [n])

  useEffect(() => {
    if (!n) return
    const start = Math.max(0, Math.min(n - 1, Number(initialIndex) || 0))
    const token = `${start}:${loop}`
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

  useEffect(() => {
    if (!n || lastCount.current === n) return
    lastCount.current = n
    const idx = Math.max(0, Math.min(n - 1, Number(activeIndex) || 0))
    const el = scrollerRef.current
    const h = pageHeight()
    const target = middleReel(idx)
    const expected = target * h
    if (el && Math.abs(el.scrollTop - expected) < h * 0.35) {
      setReelPos(target)
      return
    }
    jumping.current = true
    requestAnimationFrame(() => {
      scrollToReel(target, 'auto')
      setReelPos(target)
      onActiveIndex?.(idx)
      requestAnimationFrame(() => { jumping.current = false })
    })
  }, [n, activeIndex, loop, onActiveIndex])

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
    const onEnd = () => snapToNearest()
    el.addEventListener('scrollend', onEnd)
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', onEnd)
    }
  }, [onScroll, snapToNearest])

  const goTo = useCallback((logical, behavior = 'smooth') => {
    if (!n) return
    const idx = Math.max(0, Math.min(n - 1, Number(logical) || 0))
    jumping.current = true
    scrollToReel(middleReel(idx), behavior)
    onActiveIndex?.(idx)
    if (behavior === 'auto') {
      requestAnimationFrame(() => { jumping.current = false })
      return
    }
    window.setTimeout(() => { jumping.current = false }, 320)
  }, [n, loop, onActiveIndex])

  useEffect(() => {
    if (goToRef) goToRef.current = goTo
    return () => { if (goToRef) goToRef.current = null }
  }, [goTo, goToRef])

  const step = useCallback((dir) => {
    if (!n) return
    goTo((activeIndex + dir + n) % n)
  }, [activeIndex, n, goTo])

  // Desktop: wheel over <video> often never reaches the scroller.
  // Force snap steps so the reel always moves.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !n) return undefined
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) < 10) return
      const now = Date.now()
      if (now - lastWheel.current < 380) {
        e.preventDefault()
        return
      }
      lastWheel.current = now
      e.preventDefault()
      step(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [step, n])

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

  const slideShell = bleedMobile
    ? 'w-full snap-start snap-always shrink-0 overflow-hidden flex items-center justify-center px-0 py-0 md:px-10 md:py-8'
    : 'w-full snap-start snap-always shrink-0 overflow-hidden flex items-center justify-center px-3 py-4 sm:px-10 sm:py-8'

  return (
    <div className="h-full min-h-0 w-full bg-[#000000] flex flex-col relative">
      {header}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollerRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain touch-pan-y flex flex-col [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {reel.map((row) => (
            <div
              key={row.key}
              className={slideShell}
              style={{ height: '100%', minHeight: '100%', flex: '0 0 100%' }}
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
      <div ref={hostRef} className="h-full w-full min-h-0">
        <div className="relative h-full w-full min-h-0 bg-black overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div ref={hostRef} className="h-full w-full min-h-0 flex items-end justify-center gap-3">
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
