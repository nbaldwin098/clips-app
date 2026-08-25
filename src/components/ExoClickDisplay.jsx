import { useEffect, useRef, useState } from 'react'
import { AD_ZONES, AD_PROVIDER_SCRIPT, isDisplayZone, displayZone } from '../lib/adZones'

export const EXOCLICK_AD_SCRIPT = AD_PROVIDER_SCRIPT
export const EXOCLICK_BANNER_ZONE = AD_ZONES.banner.id
export const EXOCLICK_BANNER_CLASS = AD_ZONES.banner.insClass

/** Poll for a fill, then give up and collapse the slot. */
const FILL_POLL_MS = 400
const FILL_TIMEOUT_MS = 6000

let scriptPromise = null

export function ensureExoClickScript() {
  if (typeof document === 'undefined') return Promise.resolve(false)
  if (scriptPromise) return scriptPromise
  const existing = document.querySelector(`script[src="${AD_PROVIDER_SCRIPT}"]`)
  if (existing) {
    scriptPromise = Promise.resolve(true)
    return scriptPromise
  }
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script')
    s.async = true
    s.type = 'application/javascript'
    s.src = AD_PROVIDER_SCRIPT
    // An ad blocker (or a dead CDN) makes this fail. Resolve false so every
    // waiting slot collapses instead of holding an empty gray box open.
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
  return scriptPromise
}

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
    if (child.querySelector('img, iframe, video')) return true
    const rect = child.getBoundingClientRect()
    if (rect.width > 1 && rect.height > 1) return true
  }
  return false
}

/**
 * One ExoClick display unit at its native size. The parent letterboxes
 * around it — we never stretch an <ins> into a 9:16 or 16:9 frame.
 *
 * Only display zones are accepted. Passing a VAST zone here used to render
 * a permanently blank box, so it now renders nothing and says why in dev.
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
  const servedRef = useRef(false)
  const [state, setState] = useState('pending') // pending | filled | empty

  useEffect(() => {
    if (!active || badZone || servedRef.current) return undefined
    let cancelled = false
    let poll = 0
    let started = 0

    ensureExoClickScript().then((ok) => {
      if (cancelled) return
      if (!ok) {
        setState('empty')
        return
      }
      const w = window
      w.AdProvider = w.AdProvider || []
      try {
        // One serve per slot. A second push would draw a second ad into
        // this container or steal the next slot's ad.
        servedRef.current = true
        w.AdProvider.push({ serve: {} })
      } catch {
        setState('empty')
        return
      }
      started = Date.now()
      poll = window.setInterval(() => {
        if (cancelled) return
        if (slotHasAd(containerRef.current)) {
          window.clearInterval(poll)
          setState('filled')
          onFill?.(true)
          return
        }
        if (Date.now() - started >= FILL_TIMEOUT_MS) {
          window.clearInterval(poll)
          setState('empty')
          onFill?.(false)
        }
      }, FILL_POLL_MS)
    })

    return () => {
      cancelled = true
      if (poll) window.clearInterval(poll)
    }
  }, [zone, active, badZone, onFill])

  if (badZone) {
    if (import.meta.env?.DEV) {
      console.warn(`[ads] zone ${zoneId} is not a display zone — see src/lib/adZones.js`)
    }
    return null
  }
  // No fill: take up no space at all rather than leaving a dead box in the feed.
  if (state === 'empty') return null

  return (
    <div
      ref={containerRef}
      className={`exo-slot relative flex w-full items-center justify-center overflow-hidden ${
        state === 'filled' ? 'bg-[#111]' : 'bg-transparent'
      } ${className}`}
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
        className={insClass || AD_ZONES.banner.insClass}
        data-zoneid={zone}
        style={{ display: 'inline-block', maxWidth: '100%' }}
      />
    </div>
  )
}

export { clipBannerAllowed } from '../lib/adEngine'
