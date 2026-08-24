import { useCallback, useEffect, useRef, useState } from 'react'
import { loadExoClickVast, videoVastAdsEnabled, videoInStreamBreaks, VIDEO_FIRST_AD_SEC } from '../lib/vastAds'

export function useVideoVastAds(item, { embed = false } = {}) {
  const [creative, setCreative] = useState(null)
  const [slot, setSlot] = useState(null)
  const [campaignBreak, setCampaignBreak] = useState(0)
  const lastTime = useRef(0)
  const playedBreaks = useRef(new Set())
  const showing = useRef(false)

  const enabled = item?.type === 'video' && videoVastAdsEnabled()

  const triggerBreak = useCallback((t) => {
    if (!enabled || playedBreaks.current.has(t) || showing.current) return
    playedBreaks.current.add(t)
    loadExoClickVast().then((ad) => {
      if (ad?.mediaUrl) {
        showing.current = true
        setSlot('midroll')
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
    setCreative(null)
    setSlot(null)
    setCampaignBreak(0)
    if (!enabled) return undefined
    // Iframe embeds do not report currentTime. Wait 30s of wall clock once.
    if (!embed) return undefined
    const timer = window.setTimeout(() => {
      triggerBreak(VIDEO_FIRST_AD_SEC)
    }, VIDEO_FIRST_AD_SEC * 1000)
    return () => window.clearTimeout(timer)
  }, [item?.id, enabled, embed, triggerBreak])

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
    if (!Number.isFinite(current) || !Number.isFinite(duration)) return
    const hit = videoInStreamBreaks(duration).find(
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
