import { useCallback, useEffect, useRef, useState } from 'react'
import { loadExoClickVast, videoVastAdsEnabled, videoInStreamBreaks, VIDEO_PREROLL_BREAK } from '../lib/vastAds'

export function useVideoVastAds(item, { embed = false } = {}) {
  const [creative, setCreative] = useState(null)
  const [slot, setSlot] = useState(null)
  const [campaignBreak, setCampaignBreak] = useState(0)
  const lastTime = useRef(0)
  const playedBreaks = useRef(new Set())
  const showing = useRef(false)
  // Mid-roll points computed once per video once duration is known (random is sticky).
  const plannedBreaks = useRef([])
  const plannedForDuration = useRef(0)

  const enabled = item?.type === 'video' && videoVastAdsEnabled()

  const triggerBreak = useCallback((t) => {
    if (!enabled || playedBreaks.current.has(t) || showing.current) return
    playedBreaks.current.add(t)
    loadExoClickVast().then((ad) => {
      if (ad?.mediaUrl) {
        showing.current = true
        setSlot(t === VIDEO_PREROLL_BREAK ? 'preroll' : 'midroll')
        setCreative(ad)
        return
      }
      setCampaignBreak((n) => n + 1)
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
    if (!enabled) return undefined
    triggerBreak(VIDEO_PREROLL_BREAK)
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
    showingVast: Boolean(creative),
    campaignBreak,
    finishAd,
    onContentTime,
  }
}
