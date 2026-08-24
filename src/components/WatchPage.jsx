import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Share2, ListPlus, Music, Clock, ExternalLink, AlertCircle,
  Loader2, SkipForward, SkipBack, ThumbsUp, ThumbsDown,
  Bookmark, PictureInPicture2, Subtitles, Maximize2, Clapperboard,
  MoreHorizontal, Flag, Download,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getById, getRelated, getMoreFromCreator, getWatchQueue } from '../lib/contentService'
import { recordView, toggleVote, getVotes, getUserVote, canAccessPaidPost } from '../lib/engagement'
import { getWatchProgress, recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { getActiveAdForVideo, recordAdImpression, recordAdSkip } from '../lib/adEngine'
import { resolvePlayback, PLAYBACK_SPEEDS, formatClock, isHttp } from '../lib/playback'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { openSafeUrl, safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { copyShareUrl } from '../lib/routes'
import { useContentSyncTick } from '../lib/useContentSync'
import { toggleSaved, getSaved } from '../lib/storage'
import { getWatchPrefs, setWatchPrefs, getChapters, getCaptions } from '../lib/youtubeParity'
import { parseCaptionCues, cueAtTime } from '../lib/mediaMeta'
import { notifyContentChanged } from '../lib/contentSync'
import CommentsPanel from './CommentsPanel'
import PlaylistPicker from './PlaylistPicker'
import ReportModal from './ReportModal'
import { downloadPostedMedia } from '../lib/mediaDownload'
import PostedStamp from './PostedStamp'
import RelatedRow from './RelatedRow'
import ContentCard from './ContentCard'
import ChannelAvatar from './ChannelAvatar'
import VerifiedBadge from './VerifiedBadge'
import SubscribeButton from './SubscribeButton'
import { VideoPreroll } from './AdUnits'
import { creatorDisplayName, isOfficialCreator, likesLabel, viewsLabel } from '../lib/uiFormat'
import { isVerifiedChannel } from '../lib/verification'
import { startPremiumCheckout } from '../lib/checkout'
import { getStripePaymentLink } from '../lib/stripeConfig'

function Pill({ children, onClick, active = false, title, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-9 px-4 rounded-full text-sm font-medium inline-flex items-center gap-2 shrink-0 transition-colors disabled:opacity-40 ${
        active ? 'bg-white text-black' : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
      }`}
    >
      {children}
    </button>
  )
}

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
  const [moreOpen, setMoreOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const moreRef = useRef(null)
  const [activeAd, setActiveAd] = useState(null)
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
  const [payBusy, setPayBusy] = useState(false)
  const countRef = useRef(null)
  const appliedStart = useRef(false)
  const showingAdRef = useRef(false)

  const [descOpen, setDescOpen] = useState(false)
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
    appliedStart.current = false
    setEndScreen(false)
    setCountdown(0)
    setCueText('')
    setMoreOpen(false)
  }, [itemId, user?.id, item?.creatorId])

  useEffect(() => {
    const onDoc = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

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
    } else {
      setActiveAd(null)
    }

    return () => {
      cancelled = true
    }
  }, [item?.id, item?.mediaUrl, item?.sourceUrl])

  useEffect(() => {
    const el = videoRef.current
    if (el) el.playbackRate = speed
    setWatchPrefs({ defaultSpeed: speed })
  }, [speed, playSrc])

  const showingAd = Boolean(activeAd && !adDismissed)
  showingAdRef.current = showingAd
  const locked = !canAccessPaidPost(user, item)

  const skipAd = useCallback(() => {
    if (activeAd) recordAdSkip(activeAd.id)
    setAdDismissed(true)
  }, [activeAd])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (showingAd) {
      el.pause()
      return
    }
    if (locked || phase !== 'ready' || mode !== 'video') return
    el.play?.().catch(() => {
      el.muted = true
      el.play?.().catch(() => {})
    })
  }, [showingAd, locked, phase, mode, playSrc])

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
    if (showingAdRef.current) {
      el.pause()
      return
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

  const buyPost = async () => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    if (!item?.id || !user?.id) return
    try { sessionStorage.setItem('clips_pending_purchase', item.id) } catch {}
    setPayBusy(true)
    const result = await startPremiumCheckout({
      already: false,
      email: user?.email || '',
      reference: item.creatorId || item.id,
    })
    if (result.url) openSafeUrl(result.url)
    setPayBusy(false)
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
        if (showingAdRef.current) return
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
    <div className={`px-4 md:px-6 py-4 mx-auto pb-24 ${theater ? 'max-w-[1600px]' : 'max-w-[1400px]'}`}>
      <div className={`grid gap-6 ${theater || isVertical ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_402px]'}`}>
        <div>
          <div
            className={`relative w-full overflow-hidden rounded-xl ${isVertical ? 'aspect-[9/16] max-h-[78vh] mx-auto' : 'aspect-video'} ${ambient ? 'bg-zinc-950' : 'bg-black'}`}
          >
            {locked && (
              <div className="absolute inset-0 z-40 bg-black/85 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-lg font-semibold text-white">Paid post</p>
                <p className="text-sm text-zinc-400 max-w-sm">
                  Subscribe is free. This post is ${Number(item.priceUsd).toFixed(2)} — the price the creator set.
                </p>
                <button
                  type="button"
                  disabled={payBusy}
                  onClick={buyPost}
                  className="h-10 px-5 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-50"
                >
                  {payBusy ? 'Opening…' : getStripePaymentLink() ? `Pay $${Number(item.priceUsd).toFixed(2)} on Stripe` : 'Stripe Payment Link is not on this deploy'}
                </button>
              </div>
            )}
            {ambient && thumb ? (
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110" />
            ) : null}
            {showingAd ? (
              <VideoPreroll ad={activeAd} onSkip={skipAd} onComplete={() => setAdDismissed(true)} />
            ) : null}
            {phase === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-xs">Loading…</p>
              </div>
            )}
            {phase === 'ready' && mode === 'iframe' && !showingAd && safeIframeSrc(playSrc) && (
              <iframe src={safeIframeSrc(playSrc)} title={item.title || 'Video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 w-full h-full border-0" />
            )}
            {phase === 'ready' && mode === 'video' && safeMediaUrl(playSrc) && (
              <video
                ref={videoRef}
                key={playSrc}
                src={safeMediaUrl(playSrc)}
                controls
                autoPlay={!locked && !showingAd}
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

          <div className="mt-4 space-y-4">
            <h1 className="text-xl font-semibold text-white leading-snug">{item.title || 'Untitled'}</h1>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(item.handle, item.creatorId)}
                  className="shrink-0"
                >
                  <ChannelAvatar
                    src={item.avatarUrl}
                    name={creatorDisplayName(item)}
                    size={40}
                  />
                </button>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenProfile?.(item.handle, item.creatorId)}
                    className="flex items-center gap-1.5 text-[15px] font-semibold text-white hover:text-zinc-200 min-w-0"
                  >
                    <span className="truncate">{creatorDisplayName(item)}</span>
                    {isVerifiedChannel(item.creatorId || item.userId, item.handle) ? <VerifiedBadge title={isOfficialCreator(item.creatorId || item.userId, item.handle) ? 'Official channel' : 'Verified'} /> : null}
                  </button>
                  <p className="text-xs text-[#aaa] mt-0.5">
                    {viewsLabel(views)}
                    {(item.createdAt || item.publishedAt) ? <> · <PostedStamp item={item} /></> : null}
                  </p>
                </div>
                <SubscribeButton creatorId={item.creatorId || item.userId} handle={item.handle} onOpenAuth={onOpenAuth} className="ml-2" />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 lg:justify-end">
                <div className="inline-flex h-9 rounded-full bg-[#272727] overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => vote('up')}
                    className={`h-full px-4 inline-flex items-center gap-2 text-sm font-medium hover:bg-[#3f3f3f] ${myVote === 'up' ? 'text-white' : 'text-zinc-100'}`}
                  >
                    <ThumbsUp className={`h-4 w-4 ${myVote === 'up' ? 'fill-current' : ''}`} />
                    {likesLabel(votes.up)}
                  </button>
                  <span className="w-px my-2 bg-white/15" />
                  <button
                    type="button"
                    onClick={() => vote('down')}
                    className={`h-full px-3.5 inline-flex items-center hover:bg-[#3f3f3f] ${myVote === 'down' ? 'text-red-400' : 'text-zinc-100'}`}
                    title="Dislike"
                  >
                    <ThumbsDown className={`h-4 w-4 ${myVote === 'down' ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <Pill onClick={() => share(false)}>
                  <Share2 className="h-4 w-4" />
                  {copied === 'link' ? 'Copied' : 'Share'}
                </Pill>
                <Pill onClick={save} active={isSaved}>
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                  Save
                </Pill>
                <Pill onClick={() => downloadPostedMedia(item)}>
                  <Download className="h-4 w-4" />
                  Download
                </Pill>
                <div className="relative shrink-0" ref={moreRef}>
                  <Pill onClick={() => setMoreOpen((v) => !v)} active={moreOpen} title="More">
                    <MoreHorizontal className="h-4 w-4" />
                    More
                  </Pill>
                  {moreOpen ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-xl bg-[#212121] border border-white/10 py-2 shadow-2xl">
                      <button type="button" onClick={() => { setMoreOpen(false); if (!isAuthenticated) { onOpenAuth?.(); return } setPlaylistOpen(true) }} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                        <ListPlus className="h-4 w-4 text-zinc-400" /> Save to playlist
                      </button>
                      <button type="button" onClick={() => { share(true); setMoreOpen(false) }} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                        <Clock className="h-4 w-4 text-zinc-400" /> {copied === 'time' ? 'Copied timestamp' : 'Copy link at time'}
                      </button>
                      <button type="button" onClick={() => { togglePip(); setMoreOpen(false) }} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                        <PictureInPicture2 className="h-4 w-4 text-zinc-400" /> Picture in picture
                      </button>
                      <button type="button" onClick={() => { toggleFs(); setMoreOpen(false) }} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                        <Maximize2 className="h-4 w-4 text-zinc-400" /> Full screen
                      </button>
                      <button type="button" onClick={() => setCaptionsOn((v) => !v)} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                        <Subtitles className="h-4 w-4 text-zinc-400" /> Captions {captionsOn ? 'on' : 'off'}
                      </button>
                      {item.soundTitle ? (
                        <button type="button" onClick={() => { setMoreOpen(false); onOpenSound?.(item.soundId || item.soundTitle) }} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                          <Music className="h-4 w-4 text-zinc-400" /> {item.soundTitle}
                        </button>
                      ) : null}
                      {item.type === 'short' ? (
                        <button type="button" onClick={() => { setMoreOpen(false); if (!isAuthenticated) { onOpenAuth?.(); return } onStitch?.(item) }} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                          <Clapperboard className="h-4 w-4 text-zinc-400" /> Stitch this
                        </button>
                      ) : null}
                      <div className="my-2 h-px bg-white/10" />
                      <label className="flex items-center justify-between px-4 py-2 text-sm text-white">
                        Speed
                        <select
                          value={speed}
                          onChange={(e) => setSpeed(Number(e.target.value))}
                          className="h-8 rounded-lg bg-[#121212] border border-white/10 px-2 text-xs"
                        >
                          {PLAYBACK_SPEEDS.map((s) => (
                            <option key={s} value={s}>{s}×</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center justify-between px-4 py-2 text-sm text-white">
                        Autoplay
                        <input type="checkbox" checked={autoplay} onChange={(e) => { setAutoplay(e.target.checked); setWatchPrefs({ autoplay: e.target.checked }) }} />
                      </label>
                      <label className="flex items-center justify-between px-4 py-2 text-sm text-white">
                        Theater
                        <input type="checkbox" checked={theater} onChange={(e) => { setTheater(e.target.checked); setWatchPrefs({ theater: e.target.checked }) }} />
                      </label>
                      <label className="flex items-center justify-between px-4 py-2 text-sm text-white">
                        Ambient
                        <input type="checkbox" checked={ambient} onChange={(e) => { setAmbient(e.target.checked); setWatchPrefs({ ambient: e.target.checked }) }} />
                      </label>
                      <div className="my-2 h-px bg-white/10" />
                      <button type="button" onClick={goPrev} disabled={!queue.prev} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-3">
                        <SkipBack className="h-4 w-4 text-zinc-400" /> Previous
                      </button>
                      <button type="button" onClick={goNext} disabled={!queue.next} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-3">
                        <SkipForward className="h-4 w-4 text-zinc-400" /> Next
                      </button>
                      <button type="button" onClick={() => { setMoreOpen(false); setReportOpen(true) }} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 inline-flex items-center gap-3">
                        <Flag className="h-4 w-4 text-zinc-400" /> Report
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {original ? (
              <button type="button" onClick={() => onPlayItem?.(original)} className="text-xs text-zinc-400 hover:text-white">
                Stitched from: {original.title || 'original clip'}
              </button>
            ) : null}

            {(desc || (item.tags || []).length > 0) ? (
              <div className="rounded-xl bg-[#272727] px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-zinc-200">
                  {viewsLabel(views)}
                  {(item.createdAt || item.publishedAt) ? <> · <PostedStamp item={item} /></> : null}
                </p>
                {(item.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((t) => (
                      <button key={t} type="button" onClick={() => onOpenTag?.(t)} className="text-xs font-medium text-zinc-300 hover:text-white">
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
                {desc ? (
                  <>
                    <p className={`text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed ${descOpen ? '' : 'line-clamp-3'}`}>
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
                    {desc.length > 180 ? (
                      <button type="button" onClick={() => setDescOpen((v) => !v)} className="text-xs font-semibold text-white">
                        {descOpen ? 'Show less' : 'Show more'}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

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
                  <RelatedRow key={rel.id} item={rel} onOpen={onPlayItem} />
                ))
              )}
            </div>
            {moreFrom.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-200">More from this creator</h2>
                {moreFrom.map((rel) => (
                  <RelatedRow key={rel.id} item={rel} onOpen={onPlayItem} />
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
              <ContentCard key={rel.id} item={rel} onOpen={onPlayItem} variant="video" />
            ))}
          </div>
        </div>
      )}

      <PlaylistPicker open={playlistOpen} onClose={() => setPlaylistOpen(false)} contentId={item.id} onOpenAuth={onOpenAuth} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
    </div>
  )
}
