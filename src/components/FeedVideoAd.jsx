import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, SkipForward } from 'lucide-react'
import { loadExoClickVast, fireVastPixel, YT_SKIP_AFTER_SEC } from '../lib/vastAds'
import { openSafeUrl, safeHttpUrl, safeMediaUrl } from '../lib/safeUrl'
import ExoClickDisplay from './ExoClickDisplay'

/**
 * A video ad in a feed slot (between clips). Clips are vertical video, so
 * the video zone is the one with real fill here — a display <ins> in this
 * slot is the wrong shape and, for the old outstream zone, drew nothing.
 * If the tag has no fill we fall back to the banner display unit, and if
 * that is empty too the slot collapses instead of showing a dead box.
 */
export default function FeedVideoAd({ active = true, className = '', onEmpty }) {
  const [creative, setCreative] = useState(null)
  const [noFill, setNoFill] = useState(false)
  const [bannerEmpty, setBannerEmpty] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const videoRef = useRef(null)
  const fired = useRef({ impression: false, start: false })

  useEffect(() => {
    let cancelled = false
    setDone(false)
    setElapsed(0)
    setBannerEmpty(false)
    fired.current = { impression: false, start: false }
    loadExoClickVast({ attempts: 2 }).then((ad) => {
      if (cancelled) return
      if (ad?.mediaUrl) setCreative(ad)
      else setNoFill(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if ((noFill || done || !creative) && bannerEmpty) onEmpty?.()
  }, [noFill, done, creative, bannerEmpty, onEmpty])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !creative) return undefined
    if (!active) {
      el.pause?.()
      return undefined
    }
    if (!fired.current.impression && creative.impression) {
      fired.current.impression = true
      fireVastPixel(creative.impression)
    }
    el.muted = true
    el.play?.().catch(() => {})
    const onTime = () => setElapsed(el.currentTime || 0)
    const onEnded = () => setDone(true)
    const onStart = () => {
      if (fired.current.start) return
      fired.current.start = true
      ;(creative.tracking?.start || []).forEach(fireVastPixel)
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    el.addEventListener('playing', onStart)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('playing', onStart)
    }
  }, [creative, active])

  if (bannerEmpty) return null
  if (noFill || done) {
    return (
      <ExoClickDisplay
        active={active}
        className={`min-h-[90px] ${className}`}
        onFill={(ok) => { if (!ok) setBannerEmpty(true) }}
      />
    )
  }
  if (!creative) return null

  const src = safeMediaUrl(creative.mediaUrl)
  if (!src) {
    return (
      <ExoClickDisplay
        active={active}
        className={`min-h-[90px] ${className}`}
        onFill={(ok) => { if (!ok) setBannerEmpty(true) }}
      />
    )
  }
  const click = safeHttpUrl(creative.clickThrough)
  const skipAfter = Math.max(1, Number(creative.skipAfterSec) || YT_SKIP_AFTER_SEC)
  const canSkip = elapsed >= skipAfter

  const open = (e) => {
    e?.stopPropagation?.()
    ;(creative.tracking?.click || []).forEach(fireVastPixel)
    if (click) openSafeUrl(click)
  }

  return (
    <div className={`relative w-full overflow-hidden bg-black ${className}`} onClick={(e) => e.stopPropagation()}>
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain bg-black"
        playsInline
        muted
        autoPlay
        onClick={open}
      />
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-black">
        Ad
      </span>
      <div className="absolute right-2 top-2">
        {canSkip ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDone(true) }}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-black"
          >
            Skip <SkipForward className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="rounded-xl border border-zinc-700 bg-black/80 px-2.5 py-1 text-xs text-zinc-300">
            {Math.max(0, Math.ceil(skipAfter - elapsed))}s
          </span>
        )}
      </div>
      {click ? (
        <button
          type="button"
          onClick={open}
          className="absolute bottom-2 right-2 inline-flex h-8 items-center gap-1 rounded-lg bg-white px-3 text-[11px] font-semibold text-black"
        >
          Visit site <ArrowUpRight className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}
