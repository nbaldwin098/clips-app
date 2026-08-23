import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Share2, ListPlus, Music, Clock, ExternalLink, AlertCircle,
  Loader2, SkipForward, SkipBack, ArrowUpRight, ThumbsUp, ThumbsDown,
  Bookmark, PictureInPicture2, Subtitles, Maximize2, Clapperboard,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getById, getRelated, getMoreFromCreator, getWatchQueue } from '../lib/contentService'
import { recordView, toggleVote, getVotes, getUserVote, toggleSubscribe, isSubscribed } from '../lib/engagement'
import { getWatchProgress, recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { getActiveAdForVideo, recordAdImpression, recordAdClick, recordAdSkip } from '../lib/adEngine'
import { resolvePlayback, PLAYBACK_SPEEDS, formatClock, isHttp } from '../lib/playback'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { openSafeUrl, safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { copyShareUrl } from '../lib/routes'
import { useContentSyncTick } from '../lib/useContentSync'
import { toggleSaved, getSaved } from '../lib/storage'
import { getWatchPrefs, setWatchPrefs, getChapters, getCaptions } from '../lib/youtubeParity'
import { formatPostedAt, parseCaptionCues, cueAtTime } from '../lib/mediaMeta'
import { notifyContentChanged } from '../lib/contentSync'
import CommentsPanel from './CommentsPanel'
import PlaylistPicker from './PlaylistPicker'
import ContentCard from './ContentCard'

function typingInField(el) {
  if (!el) return false
  const tag = String(el.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

export default function WatchPage({
  itemId,
  startAt = 0,
  onBack,
  onPlayItem,
  onOpenSound,
  onOpenTag,
  onOpenProfile,
  onOpenAuth,
  onStitch,
}) {
  const { user, isAuthenticated } = useAuth()
  const syncTick = useContentSyncTick()
  const item = useMemo(() => getById(itemId), [itemId, syncTick])
  const related = useMemo(() => getRelated(item, 8), [item, syncTick])
  const moreFrom = useMemo(() => getMoreFromCreator(item, 6), [item, syncTick])
  const queue = useMemo(() => getWatchQueue(item), [item, syncTick])
  const prefs = useMemo(() => getWatchPrefs(), [itemId])
  const videoRef = useRef(null)
  const candidatesRef = useRef([])
  const attemptRef = useRef(0)
  const [phase, setPhase] = useState('loading')
  const [playSrc, setPlaySrc] = useState('')
  const [mode, setMode] = useState('video')
  const [views, setViews] = useState(0)
  const [speed, setSpeed] = useState(prefs.defaultSpeed || 1)
  const [copied, setCopied] = useState('')
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [activeAd, setActiveAd] = useState(null)
  const [adSecondsLeft, setAdSecondsLeft] = useState(5)
  const [canSkipAd, setCanSkipAd] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const [autoplay, setAutoplay] = useState(prefs.autoplay !== false)
  const [theater, setTheater] = useState(!!prefs.theater)
  const [ambient, setAmbient] = useState(!!prefs.ambient)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [cueText, setCueText] = useState('')
  const [endScreen, setEndScreen] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [votes, setVotes] = useState(() => getVotes(itemId))
  const [myVote, setMyVote] = useState(() => getUserVote(user?.id, itemId))
  const [isSaved, setIsSaved] = useState(() => (getSaved() || []).includes(itemId))
  const [followed, setFollowed] = useState(false)
  const adTimerRef = useRef(null)
  const countRef = useRef(null)
  const appliedStart = useRef(false)

  const chapters = useMemo(() => {
    if (!item) return []
    const fromItem = Array.isArray(item.chapters) ? item.chapters : []
    return fromItem.length ? fromItem : getChapters(item.id)
  }, [item])

  const captionCues = useMemo(() => {
    if (!item) return []
    const stored = getCaptions(item.id)
    const text = item.captionsText || stored?.[0]?.text || ''
    return parseCaptionCues(text, item.durationSec)
  }, [item])

  const original = item?.stitchOf ? getById(item.stitchOf) : null

  useEffect(() => {
    setVotes(getVotes(itemId))
    setMyVote(getUserVote(user?.id, itemId))
    setIsSaved((getSaved() || []).includes(itemId))
    setFollowed(user?.id && item?.creatorId ? isSubscribed(user.id, item.creatorId) : false)
    appliedStart.current = false
    setEndScreen(false)
    setCountdown(0)
    setCueText('')
  }, [itemId, user?.id, item?.creatorId])

  useEffect(() => {
    if (!item?.id) {
      setPhase('failed')
      return undefined
    }
    let cancelled = false
    setViews(recordView(item.id))
    setPhase('loading')
    setAdDismissed(false)
    attemptRef.current = 0

    resolvePlayback(item).then((res) => {
      if (cancelled) return
      candidatesRef.current = res.candidates
      setPlaySrc(res.playSrc)
      setMode(res.mode)
      setPhase(res.playSrc ? 'ready' : 'failed')
    })

    const ad = getActiveAdForVideo(item.id)
    if (ad) {
      setActiveAd(ad)
      recordAdImpression(ad.id)
      setAdSecondsLeft(5)
      setCanSkipAd(false)
      let count = 5
      adTimerRef.current = setInterval(() => {
        count -= 1
        setAdSecondsLeft(count)
        if (count <= 0) {
          setCanSkipAd(true)
          clearInterval(adTimerRef.current)
        }
      }, 1000)
    } else {
      setActiveAd(null)
    }

    return () => {
      cancelled = true
      if (adTimerRef.current) clearInterval(adTimerRef.current)
    }
  }, [item?.id, item?.mediaUrl, item?.sourceUrl])

  useEffect(() => {
    const el = videoRef.current
    if (el) el.playbackRate = speed
    setWatchPrefs({ defaultSpeed: speed })
  }, [speed, playSrc])

  const seekTo = (sec) => {
    const el = videoRef.current
    if (!el) return
    try { el.currentTime = Math.max(0, Math.min(el.duration || sec, sec)) } catch {}
  }

  const onLoadedMetadata = () => {
    const el = videoRef.current
    if (!el || !item?.id) return
    el.playbackRate = speed
    if (!appliedStart.current) {
      appliedStart.current = true
      const fromHash = Number(startAt) || 0
      const progress = user?.id ? getWatchProgress(user.id, item.id) : null
      const pos = fromHash > 0 ? fromHash : (progress?.positionSec || 0)
      if (pos > 2 && pos < (el.duration || 0) - 2) {
        try { el.currentTime = pos } catch {}
      }
    }
    el.play?.().catch(() => {
      el.muted = true
      el.play?.().catch(() => {})
    })
  }

  const tryNext = () => {
    const list = candidatesRef.current || []
    attemptRef.current += 1
    if (attemptRef.current >= list.length) {
      setPhase('failed')
      return
    }
    const next = list[attemptRef.current]
    const parsed = parseEmbedUrl(next)
    if (parsed?.type === 'iframe') {
      setMode('iframe')
      setPlaySrc(parsed.src)
      setPhase('ready')
      return
    }
    setMode('video')
    setPlaySrc(parsed?.src || next)
    setPhase('ready')
  }

  const goNext = () => {
    if (queue.next) onPlayItem?.(queue.next)
  }

  const goPrev = () => {
    if (queue.prev) onPlayItem?.(queue.prev)
  }

  const handleTimeUpdate = (e) => {
    const video = e.target
    if (!video?.duration || !item?.id) return
    const ratio = video.currentTime / video.duration
    if (user?.id) {
      recordWatchProgress(user.id, {
        contentId: item.id,
        title: item.title,
        sourceUrl: item.sourceUrl || item.mediaUrl,
        watchRatio: ratio,
        durationSec: video.duration,
        positionSec: video.currentTime,
        creatorId: item.creatorId,
        handle: item.handle,
      })
    }
    if (captionsOn && captionCues.length) {
      const cue = cueAtTime(captionCues, video.currentTime)
      setCueText(cue?.text || '')
    }
    if (ratio >= 0.9 && !endScreen) setEndScreen(true)
    if (ratio >= 0.9 && user?.id) {
      recordInteraction(user.id, {
        contentId: item.id,
        type: 'complete',
        watchRatio: ratio,
        title: item.title,
        tags: item.tags || [],
        creatorId: item.creatorId,
      })
    }
  }

  const onEnded = () => {
    setEndScreen(true)
    if (!autoplay || !queue.next) return
    setCountdown(5)
    let left = 5
    if (countRef.current) clearInterval(countRef.current)
    countRef.current = setInterval(() => {
      left -= 1
      setCountdown(left)
      if (left <= 0) {
        clearInterval(countRef.current)
        goNext()
      }
    }, 1000)
  }

  useEffect(() => () => { if (countRef.current) clearInterval(countRef.current) }, [itemId])

  const share = async (withTime = false) => {
    try {
      const t = withTime && videoRef.current ? Math.floor(videoRef.current.currentTime || 0) : 0
      await copyShareUrl('watch', item.id, t > 0 ? { t } : null)
      setCopied(withTime ? 'time' : 'link')
      setTimeout(() => setCopied(''), 1600)
      if (user?.id) {
        recordInteraction(user.id, { contentId: item.id, type: 'share', tags: item.tags || [], creatorId: item.creatorId })
      }
    } catch {}
  }

  const vote = (dir) => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    const next = toggleVote(user.id, item.id, dir)
    setVotes({ ...next })
    setMyVote(getUserVote(user.id, item.id))
    recordInteraction(user.id, {
      contentId: item.id,
      type: dir === 'up' ? 'upvote' : 'downvote',
      tags: item.tags || [],
      creatorId: item.creatorId,
    })
  }

  const save = () => {
    const next = toggleSaved(item.id)
    setIsSaved(next.includes(item.id))
    notifyContentChanged()
    if (user?.id && next.includes(item.id)) {
      recordInteraction(user.id, { contentId: item.id, type: 'save', tags: item.tags || [], creatorId: item.creatorId })
    }
  }

  const follow = () => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    if (!item.creatorId || item.creatorId === user.id) return
    const on = toggleSubscribe(user.id, item.creatorId)
    setFollowed(on)
  }

  const togglePip = async () => {
    const el = videoRef.current
    if (!el || typeof document === 'undefined') return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else if (document.pictureInPictureEnabled) await el.requestPictureInPicture()
    } catch {}
  }

  const toggleFs = () => {
    const el = videoRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) document.exitFullscreen()
      else el.requestFullscreen?.()
    } catch {}
  }

  useEffect(() => {
    const onKey = (e) => {
      if (typingInField(e.target)) return
      const el = videoRef.current
      if (e.key === 'n') { goNext(); return }
      if (e.key === 't') {
        setTheater((v) => {
          const next = !v
          setWatchPrefs({ theater: next })
          return next
        })
        return
      }
      if (e.key === 'c') { setCaptionsOn((v) => !v); return }
      if (!el) return
      if (e.key === 'k' || e.key === ' ') {
        e.preventDefault()
        if (el.paused) el.play?.().catch(() => {})
        else el.pause()
      } else if (e.key === 'j' || e.key === 'ArrowLeft') {
        seekTo((el.currentTime || 0) - (e.key === 'j' ? 10 : 5))
      } else if (e.key === 'l' || e.key === 'ArrowRight') {
        seekTo((el.currentTime || 0) + (e.key === 'l' ? 10 : 5))
      } else if (e.key === 'f') {
        toggleFs()
      } else if (e.key === 'm') {
        el.muted = !el.muted
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        el.volume = Math.min(1, (el.volume || 0) + 0.1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        el.volume = Math.max(0, (el.volume || 0) - 0.1)
      } else if (e.key >= '0' && e.key <= '9') {
        if (el.duration) seekTo(el.duration * (Number(e.key) / 10))
      } else if (e.key === '>' || (e.key === '.' && e.shiftKey)) {
        const i = PLAYBACK_SPEEDS.indexOf(speed)
        setSpeed(PLAYBACK_SPEEDS[Math.min(PLAYBACK_SPEEDS.length - 1, i + 1)] || speed)
      } else if (e.key === '<' || (e.key === ',' && e.shiftKey)) {
        const i = PLAYBACK_SPEEDS.indexOf(speed)
        setSpeed(PLAYBACK_SPEEDS[Math.max(0, i - 1)] || speed)
      } else if (e.key === 'p') {
        togglePip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!item) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-zinc-400">This video is not on this device.</p>
        <button type="button" onClick={onBack} className="mt-4 text-xs text-white">← Back</button>
      </div>
    )
  }

  const isVertical = item.type === 'short'
  const openUrl = (isHttp(item.mediaUrl) && item.mediaUrl) || (isHttp(item.sourceUrl) && item.sourceUrl)
  const desc = (item.description || '').trim()
  const thumb = item.thumbUrl || ''
  const endPicks = [queue.next, ...related].filter((x, i, a) => x && a.findIndex((y) => y?.id === x.id) === i).slice(0, 3)

  return (
    <div className={`p-3 md:p-6 mx-auto pb-20 ${theater ? 'max-w-[1400px]' : 'max-w-[1200px]'}`}>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className={`grid gap-6 ${theater || isVertical ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_320px]'}`}>
        <div>
          <div
            className={`relative w-full overflow-hidden rounded-xl ${isVertical ? 'aspect-[9/16] max-h-[78vh] mx-auto' : 'aspect-video'} ${ambient ? 'bg-zinc-950' : 'bg-black'}`}
          >
            {ambient && thumb ? (
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110" />
            ) : null}
            {activeAd && !adDismissed && (
              <div className="absolute inset-0 z-30 bg-black/80 flex flex-col justify-between p-4">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase">Ad</span>
                  {canSkipAd ? (
                    <button type="button" onClick={() => { if (activeAd) recordAdSkip(activeAd.id); setAdDismissed(true) }} className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-white text-black text-xs font-bold">
                      Skip Ad <SkipForward className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="px-3 py-1 rounded-xl bg-black/80 border border-zinc-700 text-zinc-300 text-xs">
                      Skip in <span className="font-bold text-white">{adSecondsLeft}s</span>
                    </div>
                  )}
                </div>
                <div className="max-w-md space-y-2 bg-[#12121a]/95 p-4 rounded-2xl border border-zinc-800">
                  <p className="text-base font-bold text-white">{activeAd.headline}</p>
                  <button type="button" onClick={() => { if (activeAd) { recordAdClick(activeAd.id); if (activeAd.targetUrl) openSafeUrl(activeAd.targetUrl) } }} className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-white text-black text-xs font-bold">
                    {activeAd.ctaText || 'Learn More'} <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            {phase === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-xs">Loading…</p>
              </div>
            )}
            {phase === 'ready' && mode === 'iframe' && safeIframeSrc(playSrc) && (
              <iframe src={safeIframeSrc(playSrc)} title={item.title || 'Video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 w-full h-full border-0" />
            )}
            {phase === 'ready' && mode === 'video' && safeMediaUrl(playSrc) && (
              <video
                ref={videoRef}
                key={playSrc}
                src={safeMediaUrl(playSrc)}
                controls
                autoPlay
                playsInline
                preload="auto"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={onEnded}
                onError={tryNext}
                className="absolute inset-0 w-full h-full object-contain bg-transparent"
              />
            )}
            {captionsOn && cueText ? (
              <div className="absolute bottom-12 inset-x-0 z-20 flex justify-center pointer-events-none">
                <span className="max-w-[90%] px-3 py-1.5 rounded bg-black/75 text-white text-sm text-center">{cueText}</span>
              </div>
            ) : null}
            {endScreen && endPicks.length > 0 && (
              <div className="absolute inset-0 z-20 bg-black/70 flex flex-col items-center justify-center p-4 gap-3">
                {countdown > 0 ? (
                  <p className="text-sm text-white">Next in {countdown}s</p>
                ) : (
                  <p className="text-sm text-zinc-300">Up next</p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {endPicks.map((rel) => (
                    <button key={rel.id} type="button" onClick={() => onPlayItem?.(rel)} className="w-40 text-left">
                      <div className="aspect-video rounded-lg bg-zinc-800 overflow-hidden">
                        {rel.thumbUrl ? <img src={rel.thumbUrl} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <p className="text-[11px] text-white mt-1 line-clamp-2">{rel.title}</p>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => { setEndScreen(false); if (countRef.current) clearInterval(countRef.current); setCountdown(0) }} className="text-xs text-zinc-300 underline">
                  Stay on this video
                </button>
              </div>
            )}
            {phase === 'failed' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-zinc-600" />
                <p className="text-sm text-zinc-300">Couldn’t play this file.</p>
                {openUrl && isHttp(openUrl) && (
                  <a href={openUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-xs font-bold">
                    Open media <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {chapters.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chapters.map((ch) => (
                <button
                  key={`${ch.t}-${ch.title}`}
                  type="button"
                  onClick={() => seekTo(ch.t)}
                  className="h-7 px-2.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-300"
                >
                  {formatClock(ch.t)} {ch.title}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <h1 className="text-lg font-semibold text-white">{item.title || 'Untitled'}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <button type="button" onClick={() => onOpenProfile?.(item.handle, item.creatorId)} className="font-semibold text-zinc-100 hover:underline">
                @{item.handle || 'creator'}
              </button>
              <span>·</span>
              <span>{views} views</span>
              {item.createdAt ? (
                <>
                  <span>·</span>
                  <span>{formatPostedAt(item.createdAt)}</span>
                </>
              ) : null}
              {item.durationSec ? (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatClock(item.durationSec)}</span>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => vote('up')} className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-1.5 ${myVote === 'up' ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-200'}`}>
                <ThumbsUp className="h-3.5 w-3.5" /> {votes.up || 0}
              </button>
              <button type="button" onClick={() => vote('down')} className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-1.5 ${myVote === 'down' ? 'border-red-400 text-red-400' : 'border-zinc-800 text-zinc-200'}`}>
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={save} className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-1.5 ${isSaved ? 'border-white text-white' : 'border-zinc-800 text-zinc-200'}`}>
                <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} /> Save
              </button>
              {item.creatorId && item.creatorId !== user?.id ? (
                <button type="button" onClick={follow} className={`h-8 px-3 rounded-lg text-xs font-medium ${followed ? 'border border-zinc-800 text-zinc-200' : 'bg-white text-black'}`}>
                  {followed ? 'Following' : 'Follow'}
                </button>
              ) : null}
              <label className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
                Speed
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-8 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-2 text-xs text-zinc-200">
                  {PLAYBACK_SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}×</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => share(false)} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />{copied === 'link' ? 'Copied' : 'Copy link'}
              </button>
              <button type="button" onClick={() => share(true)} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200">
                {copied === 'time' ? 'Copied' : 'Copy at time'}
              </button>
              <button type="button" onClick={() => { if (!isAuthenticated) { onOpenAuth?.(); return } setPlaylistOpen(true) }} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                <ListPlus className="h-3.5 w-3.5" /> Playlist
              </button>
              <button type="button" onClick={togglePip} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5" title="Picture in picture">
                <PictureInPicture2 className="h-3.5 w-3.5" /> PiP
              </button>
              <button type="button" onClick={toggleFs} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5" /> Full
              </button>
              <button
                type="button"
                onClick={() => setCaptionsOn((v) => !v)}
                className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-1.5 ${captionsOn ? 'border-white text-white' : 'border-zinc-800 text-zinc-200'}`}
              >
                <Subtitles className="h-3.5 w-3.5" /> CC
              </button>
              <label className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => { setAutoplay(e.target.checked); setWatchPrefs({ autoplay: e.target.checked }) }}
                />
                Autoplay
              </label>
              <label className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={theater}
                  onChange={(e) => { setTheater(e.target.checked); setWatchPrefs({ theater: e.target.checked }) }}
                />
                Theater
              </label>
              <label className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={ambient}
                  onChange={(e) => { setAmbient(e.target.checked); setWatchPrefs({ ambient: e.target.checked }) }}
                />
                Ambient
              </label>
              {item.soundTitle ? (
                <button type="button" onClick={() => onOpenSound?.(item.soundId || item.soundTitle)} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" />{item.soundTitle}
                </button>
              ) : null}
              {item.type === 'short' ? (
                <button type="button" onClick={() => { if (!isAuthenticated) { onOpenAuth?.(); return } onStitch?.(item) }} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                  <Clapperboard className="h-3.5 w-3.5" /> Stitch this
                </button>
              ) : null}
              <button type="button" onClick={goPrev} disabled={!queue.prev} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1">
                <SkipBack className="h-3.5 w-3.5" /> Prev
              </button>
              <button type="button" onClick={goNext} disabled={!queue.next} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1">
                Next <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>

            {original ? (
              <button type="button" onClick={() => onPlayItem?.(original)} className="text-xs text-zinc-400 hover:text-white">
                Stitched from: {original.title || 'original clip'}
              </button>
            ) : null}

            {(item.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <button key={t} type="button" onClick={() => onOpenTag?.(t)} className="h-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {desc ? (
              <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                {desc.split(/(#[a-zA-Z0-9_]{1,40})/g).map((part, i) => {
                  if (part.startsWith('#')) {
                    const tag = part.slice(1)
                    return (
                      <button key={`${tag}-${i}`} type="button" onClick={() => onOpenTag?.(tag)} className="text-white hover:underline">
                        {part}
                      </button>
                    )
                  }
                  return <span key={i}>{part}</span>
                })}
              </p>
            ) : null}

            <p className="text-[10px] text-zinc-600">Keys: k play · j/l ±10s · f full · m mute · c captions · n next · t theater · p PiP · 0–9 seek</p>

            <CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} />
          </div>
        </div>

        {!theater && (
          <aside className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-200">Up next</h2>
              {related.length === 0 ? (
                <p className="text-xs text-zinc-500">Nothing else in the catalog yet.</p>
              ) : (
                related.map((rel) => (
                  <ContentCard key={rel.id} item={rel} onOpen={onPlayItem} variant={rel.type === 'video' ? 'video' : 'short'} />
                ))
              )}
            </div>
            {moreFrom.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-200">More from this creator</h2>
                {moreFrom.map((rel) => (
                  <ContentCard key={rel.id} item={rel} onOpen={onPlayItem} variant={rel.type === 'video' ? 'video' : 'short'} />
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {theater && moreFrom.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">More from this creator</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moreFrom.map((rel) => (
              <ContentCard key={rel.id} item={rel} onOpen={onPlayItem} variant={rel.type === 'video' ? 'video' : 'short'} />
            ))}
          </div>
        </div>
      )}

      <PlaylistPicker open={playlistOpen} onClose={() => setPlaylistOpen(false)} contentId={item.id} onOpenAuth={onOpenAuth} />
    </div>
  )
}
