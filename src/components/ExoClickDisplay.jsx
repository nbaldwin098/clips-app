import { useEffect, useRef, useState } from 'react'
import { AD_ZONES, AD_PROVIDER_SCRIPT, displayZone, isDisplayZone } from '../lib/adZones'
import { queueExoClickServe, resurfaceExoClickInContainer } from '../lib/exoClickServe'

export const EXOCLICK_AD_SCRIPT = AD_PROVIDER_SCRIPT
export const EXOCLICK_BANNER_ZONE = AD_ZONES.banner.id
export const EXOCLICK_BANNER_CLASS = AD_ZONES.banner.insClass

/** Poll for a fill, then give up and collapse the slot. */
const FILL_POLL_MS = 400
const FILL_TIMEOUT_MS = 8000
const FILL_RETRY_MS = 3500

export { ensureExoClickScript } from '../lib/exoClickServe'

/**
 * ExoClick does not fill the <ins>. It injects a sibling <div> next to it
 * inside the same parent and leaves the <ins> empty at 0x17. Checking the
 * <ins> for children therefore reports "no ad" even when an ad is on screen,
 * so look at the container for injected markup instead.
 */
function slotHasAd(container) {
  if (!container) return false
  for (const child of container.children) {
    if (child.tagName === 'INS' || child.dataset.adLabel === 'true') continue
    if (child.querySelector('img, iframe, video, a')) return true
    const rect = child.getBoundingClientRect()
    if (rect.width > 1 && rect.height > 1) return true
  }
  return false
}

function stopBubble(e) {
  e.stopPropagation()
}

/**
 * One ExoClick display unit at its native size. The parent letterboxes
 * around it — we never stretch an <ins> into a 9:16 or 16:9 frame.
 */
export default function ExoClickDisplay({
  zoneId,
  insClass,
  className = '',
  active = true,
  onFill,
}) {
  const zone = zoneId && isDisplayZone(zoneId) ? String(zoneId) : displayZone().id
  const badZone = Boolean(zoneId && !isDisplayZone(zoneId))
  const containerRef = useRef(null)
  const insRef = useRef(null)
  const [state, setState] = useState('pending') // pending | filled | empty

  useEffect(() => {
    if (!active || badZone) return undefined
    let cancelled = false
    let poll = 0
    let retryTimer = 0
    let started = 0

    const markFilled = () => {
      window.clearInterval(poll)
      window.clearTimeout(retryTimer)
      setState('filled')
      onFill?.(true)
    }

    const markEmpty = () => {
      window.clearInterval(poll)
      window.clearTimeout(retryTimer)
      setState('empty')
      onFill?.(false)
    }

    const requestFill = () => resurfaceExoClickInContainer(containerRef.current)

    const ins = insRef.current
    if (ins) delete ins.dataset.exoQueued

    requestFill().then((ok) => {
      if (cancelled) return
      if (!ok) {
        markEmpty()
        return
      }
      started = Date.now()
      poll = window.setInterval(() => {
        if (cancelled) return
        if (slotHasAd(containerRef.current)) {
          markFilled()
          return
        }
        if (Date.now() - started >= FILL_TIMEOUT_MS) {
          markEmpty()
        }
      }, FILL_POLL_MS)

      retryTimer = window.setTimeout(() => {
        if (cancelled || slotHasAd(containerRef.current)) return
        requestFill()
      }, FILL_RETRY_MS)
    })

    return () => {
      cancelled = true
      if (poll) window.clearInterval(poll)
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [zone, active, badZone, onFill])

  if (badZone) {
    if (import.meta.env?.DEV) {
      console.warn(`[ads] zone ${zoneId} is not a display zone — see src/lib/adZones.js`)
    }
    return null
  }
  if (state === 'empty') return null

  return (
    <div
      ref={containerRef}
      className={`exo-slot pointer-events-auto relative flex w-full items-center justify-center overflow-hidden touch-manipulation ${
        state === 'filled' ? 'bg-[#111]' : 'bg-transparent'
      } ${className}`}
      onClick={stopBubble}
      onPointerDown={stopBubble}
    >
      {state === 'filled' ? (
        <span
          data-ad-label="true"
          className="pointer-events-none absolute left-1.5 top-1.5 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
        >
          Ad
        </span>
      ) : null}
      <ins
        ref={insRef}
        className={insClass || AD_ZONES.banner.insClass}
        data-zoneid={zone}
        style={{ display: 'inline-block', maxWidth: '100%', pointerEvents: 'auto' }}
      />
    </div>
  )
}

export { clipBannerAllowed } from '../lib/adEngine'
