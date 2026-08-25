import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, SkipForward } from 'lucide-react'
import { fireVastPixel, YT_SKIP_AFTER_SEC } from '../lib/vastAds'
import { openSafeUrl, safeHttpUrl, safeMediaUrl } from '../lib/safeUrl'

export default function VideoInStreamAd({ creative, slot, onDone }) {
  const videoRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)
  const fired = useRef({ impression: false, start: false })

  const skipAfter = Math.max(1, Number(creative?.skipAfterSec) || YT_SKIP_AFTER_SEC)
  const src = safeMediaUrl(creative?.mediaUrl)
  const click = safeHttpUrl(creative?.clickThrough)

  useEffect(() => {
    fired.current = { impression: false, start: false }
    setElapsed(0)
    if (!creative) return undefined
    if (!fired.current.impression && creative.impression) {
      fired.current.impression = true
      fireVastPixel(creative.impression)
    }
    const el = videoRef.current
    if (!el) return undefined
    const play = () => {
      el.play?.().catch(() => {
        el.muted = true
        el.play?.().catch(() => {})
      })
    }
    play()
    const onTime = () => setElapsed(el.currentTime || 0)
    const onEnded = () => onDone?.()
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
  }, [creative, onDone])

  if (!creative || !src) return null
  const canSkip = elapsed >= skipAfter

  const open = (e) => {
    e?.stopPropagation?.()
    ;(creative.tracking?.click || []).forEach(fireVastPixel)
    if (click) openSafeUrl(click)
  }

  return (
    <div className="absolute inset-0 z-30 bg-black pointer-events-auto">
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 h-full w-full object-contain bg-black cursor-pointer"
        playsInline
        autoPlay
        onClick={open}
      />
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase pointer-events-none">
          {slot === 'preroll' ? 'Ad · Before video' : 'Ad'}
        </span>
        <div className="pointer-events-auto">
          {canSkip ? (
            <button
              type="button"
              onClick={() => onDone?.()}
              aria-label="Skip advertisement"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-white text-black text-xs font-bold"
            >
              Skip Ad <SkipForward className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-black/80 border border-zinc-700 text-zinc-300 text-xs" aria-live="polite">
              Skip in <span className="font-bold text-white">{Math.max(0, Math.ceil(skipAfter - elapsed))}s</span>
            </div>
          )}
        </div>
      </div>
      {click ? (
        <button
          type="button"
          onClick={open}
          className="absolute bottom-3 right-3 h-8 px-3 rounded-lg bg-white text-black text-[11px] font-semibold inline-flex items-center gap-1"
        >
          Visit site <ArrowUpRight className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}
