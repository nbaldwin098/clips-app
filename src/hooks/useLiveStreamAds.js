import { useCallback, useEffect, useRef, useState } from 'react'
import { loadExoClickVast } from '../lib/vastAds'
import {
  LIVE_VIEWER_AD_DELAY_SEC,
  consumeDueInterval,
  consumeDueSchedule,
  finishLiveAd,
  liveAdsSnoozed,
  readLiveAdCue,
} from '../lib/liveAds'

export function useLiveStreamAds(channelId, { isHost = false } = {}) {
  const [creative, setCreative] = useState(null)
  const [slot, setSlot] = useState(null)
  const showing = useRef(false)
  const pending = useRef(null)
  const playedCue = useRef('')
  const activeCue = useRef(null)
  const adStartedAt = useRef(0)

  const play = useCallback((ad, nextSlot, cue) => {
    if (!ad?.mediaUrl) return
    if (showing.current) {
      if (nextSlot === 'live-midroll' && pending.current?.slot === 'live-midroll') return
      pending.current = { ad, slot: nextSlot, cue }
      return
    }
    showing.current = true
    activeCue.current = cue || null
    adStartedAt.current = Date.now()
    setSlot(nextSlot)
    setCreative(ad)
  }, [])

  const finishAd = useCallback(() => {
    if (channelId && activeCue.current) {
      const elapsed = Math.max(0, Math.round((Date.now() - adStartedAt.current) / 1000))
      finishLiveAd(channelId, {
        playedSec: elapsed,
        breakSec: activeCue.current.breakSec || elapsed || 60,
        kind: activeCue.current.kind || 'manual',
      })
    }
    showing.current = false
    activeCue.current = null
    setCreative(null)
    setSlot(null)
    const queued = pending.current
    pending.current = null
    if (queued?.ad) {
      showing.current = true
      activeCue.current = queued.cue || null
      adStartedAt.current = Date.now()
      setSlot(queued.slot)
      setCreative(queued.ad)
    }
  }, [channelId])

  useEffect(() => {
    showing.current = false
    pending.current = null
    playedCue.current = ''
    activeCue.current = null
    setCreative(null)
    setSlot(null)
    if (!channelId) return undefined

    let cancelled = false
    let joinTimer = 0

    if (!isHost) {
      joinTimer = window.setTimeout(() => {
        if (liveAdsSnoozed(channelId)) return
        loadExoClickVast({ kind: 'live-join' }).then((ad) => {
          if (cancelled || !ad?.mediaUrl || liveAdsSnoozed(channelId)) return
          play(ad, 'live-join', { kind: 'viewer', breakSec: 0 })
        })
      }, LIVE_VIEWER_AD_DELAY_SEC * 1000)
    }

    const poll = window.setInterval(() => {
      if (cancelled || liveAdsSnoozed(channelId)) return
      if (!showing.current) {
        if (!consumeDueSchedule(channelId)) consumeDueInterval(channelId)
      }
      const cue = readLiveAdCue(channelId)
      if (!cue?.id || cue.id === playedCue.current) return
      if (Date.now() - Number(cue.at || 0) > 120000) return
      if (liveAdsSnoozed(channelId)) return
      playedCue.current = cue.id
      const kind = cue.zone === 'video' || cue.zone === 'live-join' ? 'live-join' : 'live-creator'
      loadExoClickVast({ kind }).then((ad) => {
        if (cancelled || !ad?.mediaUrl || liveAdsSnoozed(channelId)) return
        play(ad, kind === 'live-creator' ? 'live-midroll' : 'live-join', cue)
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
