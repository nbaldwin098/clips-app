import { useCallback, useEffect, useRef, useState } from 'react'
import { loadExoClickVast, videoVastAdsEnabled, youtubeMidrollBreaks } from '../lib/vastAds'

export function useVideoVastAds(item) {
  const [creative, setCreative] = useState(null)
  const [slot, setSlot] = useState(null)
  const [awaitingPreroll, setAwaitingPreroll] = useState(false)
  const lastTime = useRef(0)
  const playedBreaks = useRef(new Set())

  const enabled = item?.type === 'video' && videoVastAdsEnabled()

  useEffect(() => {
    lastTime.current = 0
    playedBreaks.current = new Set()
    setCreative(null)
    setSlot(null)
    if (!enabled) {
      setAwaitingPreroll(false)
      return undefined
    }
    let cancelled = false
    setAwaitingPreroll(true)
    const timer = window.setTimeout(() => {
      if (!cancelled) setAwaitingPreroll(false)
    }, 4000)
    loadExoClickVast().then((ad) => {
      if (cancelled) return
      setAwaitingPreroll(false)
      if (ad?.mediaUrl) {
        setSlot('preroll')
        setCreative(ad)
      }
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [item?.id, enabled])

  const finishAd = useCallback(() => {
    setCreative(null)
    setSlot(null)
  }, [])

  const onContentTime = useCallback((current, duration) => {
    if (!enabled || creative) {
      lastTime.current = current
      return
    }
    const prev = lastTime.current
    lastTime.current = current
    if (!Number.isFinite(current) || !Number.isFinite(duration)) return
    const hit = youtubeMidrollBreaks(duration).find(
      (t) => !playedBreaks.current.has(t) && prev < t && current >= t,
    )
    if (hit == null) return
    playedBreaks.current.add(hit)
    loadExoClickVast().then((ad) => {
      if (!ad?.mediaUrl) return
      setSlot('midroll')
      setCreative(ad)
    })
  }, [enabled, creative])

  return {
    creative,
    slot,
    awaitingPreroll,
    showingVast: Boolean(creative),
    finishAd,
    onContentTime,
  }
}
