import { useCallback, useEffect, useRef, useState } from 'react'
import { loadExoClickVast } from '../lib/vastAds'
import {
  LIVE_VIEWER_AD_DELAY_SEC,
  consumeDueInterval,
  consumeDueSchedule,
  readLiveAdCue,
} from '../lib/liveAds'

export function useLiveStreamAds(channelId, { isHost = false } = {}) {
  const [creative, setCreative] = useState(null)
  const [slot, setSlot] = useState(null)
  const showing = useRef(false)
  const pending = useRef(null)
  const playedCue = useRef('')

  const play = useCallback((ad, nextSlot) => {
    if (!ad?.mediaUrl) return
    if (showing.current) {
      pending.current = { ad, slot: nextSlot }
      return
    }
    showing.current = true
    setSlot(nextSlot)
    setCreative(ad)
  }, [])

  const finishAd = useCallback(() => {
    showing.current = false
    setCreative(null)
    setSlot(null)
    const queued = pending.current
    pending.current = null
    if (queued?.ad) {
      showing.current = true
      setSlot(queued.slot)
      setCreative(queued.ad)
    }
  }, [])

  useEffect(() => {
    showing.current = false
    pending.current = null
    playedCue.current = ''
    setCreative(null)
    setSlot(null)
    if (!channelId) return undefined

    let cancelled = false
    let joinTimer = 0

    if (!isHost) {
      joinTimer = window.setTimeout(() => {
        loadExoClickVast({ kind: 'live-join' }).then((ad) => {
          if (cancelled || !ad?.mediaUrl) return
          play(ad, 'live-join')
        })
      }, LIVE_VIEWER_AD_DELAY_SEC * 1000)
    }

    const poll = window.setInterval(() => {
      if (cancelled) return
      if (!showing.current) {
        if (!consumeDueSchedule(channelId)) consumeDueInterval(channelId)
      }
      const cue = readLiveAdCue(channelId)
      if (!cue?.id || cue.id === playedCue.current) return
      if (Date.now() - Number(cue.at || 0) > 120000) return
      playedCue.current = cue.id
      const kind = cue.zone === 'video' || cue.zone === 'live-join' ? 'live-join' : 'live-creator'
      loadExoClickVast({ kind }).then((ad) => {
        if (cancelled || !ad?.mediaUrl) return
        play(ad, kind === 'live-creator' ? 'live-midroll' : 'live-join')
      })
    }, 1000)

    return () => {
      cancelled = true
      window.clearTimeout(joinTimer)
      window.clearInterval(poll)
    }
  }, [channelId, isHost, play])

  return {
    creative,
    slot,
    showingVast: Boolean(creative),
    finishAd,
  }
}
