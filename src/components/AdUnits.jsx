import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, SkipForward } from 'lucide-react'
import { getActiveAd, getVideoAdDurationSec, getVideoSkipAfterSec, placementAdsAllowed, recordAdClick, recordAdImpression } from '../lib/adEngine'
import { openSafeUrl, safeHttpUrl } from '../lib/safeUrl'
import ExoClickDisplay from './ExoClickDisplay'

export function PlacementBanner({ placement, itemId }) {
  const campaign = useMemo(() => getActiveAd(placement), [placement, itemId])
  if (campaign) return <AdBanner ad={campaign} />
  if (!placementAdsAllowed(placement)) return null
  return (
    <div className="pointer-events-auto w-full" onClick={(e) => e.stopPropagation()}>
      <ExoClickDisplay className="min-h-[90px]" />
    </div>
  )
}

function creativeImage(ad) {
  return safeHttpUrl(ad?.imageUrl)
}

export default function AdBanner({ ad }) {
  useEffect(() => {
    if (ad?.id) recordAdImpression(ad.id)
  }, [ad?.id])

  if (!ad) return null
  const href = safeHttpUrl(ad.targetUrl)
  const img = creativeImage(ad)

  const open = (e) => {
    e?.stopPropagation?.()
    recordAdClick(ad.id)
    if (href) openSafeUrl(href)
  }

  return (
    <div
      className="pointer-events-auto w-full bg-[#0f0f0f]/95 border-t border-white/10 px-3 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {img ? (
          <img src={img} alt="" className="h-10 w-10 rounded-md object-cover shrink-0 bg-[#272727]" />
        ) : (
          <span className="h-10 w-10 rounded-md bg-white/10 text-[9px] font-bold uppercase tracking-wider text-white/70 flex items-center justify-center shrink-0">Ad</span>
        )}
        <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Sponsored</p>
          <p className="text-xs font-semibold text-white truncate">{ad.headline || ad.businessName || 'Ad'}</p>
          {ad.body ? <p className="text-[11px] text-zinc-400 truncate">{ad.body}</p> : null}
        </button>
        <button
          type="button"
          onClick={open}
          className="h-8 px-3 rounded-full bg-white text-black text-[11px] font-semibold shrink-0 inline-flex items-center gap-1"
        >
          {ad.ctaText || 'Open'}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

/**
 * One in-feed scroll slot. Clips and pics share the same ExoClick display
 * zone — letterboxed at its native IAB size inside the card, never stretched
 * into 9:16 or square. VAST video zones are for watch/live only.
 */
export function InFeedAd({ ad, variant = 'clip', active = true, onFill }) {
  if (ad?.provider === 'exoclick') {
    const shell = variant === 'pic'
      ? 'aspect-square w-full'
      : 'aspect-[9/16] w-full rounded-xl min-h-[250px]'
    return (
      <div
        className="pointer-events-auto relative z-10 w-full max-w-full touch-pan-y"
        data-ad-slide=""
        onClick={(e) => e.stopPropagation()}
      >
        <ExoClickDisplay active={active} className={shell} onFill={onFill} />
      </div>
    )
  }
  return <CampaignInFeedAd ad={ad} variant={variant} />
}

function CampaignInFeedAd({ ad, variant = 'clip' }) {
  useEffect(() => {
    if (ad?.id) recordAdImpression(ad.id)
  }, [ad?.id])

  if (!ad) return null
  const href = safeHttpUrl(ad.targetUrl)
  const img = creativeImage(ad)
  const open = (e) => {
    e?.stopPropagation?.()
    recordAdClick(ad.id)
    if (href) openSafeUrl(href)
  }

  if (variant === 'pic') {
    return (
      <button type="button" onClick={open} className="relative block w-full aspect-square overflow-hidden bg-[#1a1a1a] text-left">
        {img ? (
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#111]" />
        )}
        <span className="absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-black/70 text-white">Ad</span>
        <span className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <span className="block text-[11px] font-semibold text-white line-clamp-2">{ad.headline || 'Sponsored'}</span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      className="relative block w-full aspect-[9/16] overflow-hidden rounded-xl bg-[#1a1a1a] text-left"
    >
      {img ? (
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#111]" />
      )}
      <span className="absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/70 text-white">Ad</span>
      <span className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 to-transparent">
        <span className="block text-[13px] font-semibold text-white line-clamp-2">{ad.headline || 'Sponsored'}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/80">
          {ad.ctaText || 'Open'} <ArrowUpRight className="h-3 w-3" />
        </span>
      </span>
    </button>
  )
}

/** YouTube-style skippable preroll covering the video until skip or the ad ends. */
export function VideoPreroll({ ad, onSkip, onComplete }) {
  const skipAfter = getVideoSkipAfterSec(ad)
  const duration = getVideoAdDurationSec(ad)
  const [elapsed, setElapsed] = useState(0)
  const ended = useRef(false)

  useEffect(() => {
    ended.current = false
    if (!ad?.id) return undefined
    setElapsed(0)
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [ad?.id])

  useEffect(() => {
    if (ended.current) return
    if (elapsed >= duration) {
      ended.current = true
      ;(onComplete || onSkip)?.()
    }
  }, [elapsed, duration, onComplete, onSkip])

  if (!ad) return null
  const canSkip = elapsed >= skipAfter
  const href = safeHttpUrl(ad.targetUrl)
  const img = creativeImage(ad)

  const open = () => {
    recordAdClick(ad.id)
    if (href) openSafeUrl(href)
  }

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col justify-between p-4 sm:p-6">
      {img ? (
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-black to-[#111]" />
      )}
      <div className="relative flex items-center justify-between">
        <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase">Ad</span>
        {canSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-white text-black text-xs font-bold"
          >
            Skip Ad <SkipForward className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="px-3 py-1 rounded-xl bg-black/80 border border-zinc-700 text-zinc-300 text-xs">
            Skip in <span className="font-bold text-white">{Math.max(0, skipAfter - elapsed)}s</span>
          </div>
        )}
      </div>
      <div className="relative max-w-md space-y-2 bg-[#12121a]/95 p-4 rounded-2xl border border-zinc-800">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{ad.advertiserName || ad.businessName || 'Sponsored'}</p>
        <p className="text-base font-bold text-white">{ad.headline}</p>
        {ad.body ? <p className="text-sm text-zinc-300">{ad.body}</p> : null}
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-white text-black text-xs font-bold"
        >
          {ad.ctaText || 'Learn More'} <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
