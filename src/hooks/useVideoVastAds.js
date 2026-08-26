import { useCallback, useEffect, useRef, useState } from 'react'
import { loadExoClickVast, videoVastAdsEnabled, videoInStreamBreaks, VIDEO_PREROLL_BREAK } from '../lib/vastAds'

export function useVideoVastAds(item, { embed = false } = {}) {
  const [creative, setCreative] = useState(null)
  const [slot, setSlot] = useState(null)
  const [campaignBreak, setCampaignBreak] = useState(0)
  const [prerollResolved, setPrerollResolved] = useState(false)
  const lastTime = useRef(0)
  const playedBreaks = useRef(new Set())
  const showing = useRef(false)
  const plannedBreaks = useRef([])
  const plannedForDuration = useRef(0)

  const enabled = item?.type === 'video' && videoVastAdsEnabled()

  const triggerBreak = useCallback((t, { isPreroll = false } = {}) => {
    if (!enabled || playedBreaks.current.has(t) || showing.current) {
      if (isPreroll) setPrerollResolved(true)
      return
    }
    playedBreaks.current.add(t)
    loadExoClickVast({ attempts: 3 }).then((ad) => {
      if (ad?.mediaUrl) {
        showing.current = true
        setSlot(t === VIDEO_PREROLL_BREAK ? 'preroll' : 'midroll')
        setCreative(ad)
        if (isPreroll) setPrerollResolved(true)
        return
      }
      setCampaignBreak((n) => n + 1)
      if (isPreroll) setPrerollResolved(true)
    }).catch(() => {
      if (isPreroll) setPrerollResolved(true)
    })
  }, [enabled])

  useEffect(() => {
    lastTime.current = 0
    playedBreaks.current = new Set()
    showing.current = false
    plannedBreaks.current = []
    plannedForDuration.current = 0
    setCreative(null)
    setSlot(null)
    setCampaignBreak(0)
    setPrerollResolved(!enabled)
    if (!enabled) return undefined
    triggerBreak(VIDEO_PREROLL_BREAK, { isPreroll: true })
    return undefined
  }, [item?.id, enabled, triggerBreak])

  const finishAd = useCallback(() => {
    showing.current = false
    setCreative(null)
    setSlot(null)
  }, [])

  const onContentTime = useCallback((current, duration) => {
    if (!enabled) return
    if (creative) {
      lastTime.current = current
      return
    }
    const prev = lastTime.current
    lastTime.current = current
    if (!Number.isFinite(current) || !Number.isFinite(duration) || duration <= 0) return

    if (plannedForDuration.current !== duration) {
      plannedForDuration.current = duration
      plannedBreaks.current = videoInStreamBreaks(duration)
    }

    const hit = plannedBreaks.current.find(
      (t) => !playedBreaks.current.has(t) && prev < t && current >= t,
    )
    if (hit == null) return
    triggerBreak(hit)
  }, [enabled, creative, triggerBreak])

  return {
    creative,
    slot,
    // Treat pending preroll as "showing ad" so WatchPage holds autoplay
    // even before a creative arrives (and without editing WatchPage).
    showingVast: Boolean(creative) || (enabled && !prerollResolved),
    campaignBreak,
    prerollResolved: !enabled || prerollResolved,
    finishAd,
    onContentTime,
  }
}
