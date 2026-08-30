import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Share2, ListPlus, Music, Clock, ExternalLink, AlertCircle,
  Loader2, SkipForward, SkipBack, ThumbsUp, ThumbsDown,
  Bookmark, PictureInPicture2, Subtitles, Maximize2, Clapperboard,
  MoreHorizontal, Flag, Download, RotateCcw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getById, getWatchItem, getRelated, getMoreFromCreator, getWatchQueue, listImportsNormalized } from '../lib/contentService'
import { recordView, getViews, toggleVote, getVotes, getUserVote, canAccessPaidPost } from '../lib/engagement'
import { getWatchProgress, recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { resolvePlayback, PLAYBACK_SPEEDS, formatClock, isHttp } from '../lib/playback'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { redirectSafeUrl, safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { filterCss } from '../lib/streamFilters'
import { copyShareUrl } from '../lib/routes'
import { setPageMeta } from '../lib/pageMeta'
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
import ChannelAvatar from './ChannelAvatar'
import ContentCard from './ContentCard'
import VerifiedBadge from './VerifiedBadge'
import FollowButton from './FollowButton'
import EnableNotificationsButton from './EnableNotificationsButton'
import WatchSkeleton from './WatchSkeleton'
import { isCatalogHydrated } from '../lib/catalogStore'
import { creatorDisplayName, isOfficialCreator, likesLabel, viewsLabel, formatDuration } from '../lib/uiFormat'
import { isVerifiedChannel } from '../lib/verification'
import { startPremiumCheckout } from '../lib/checkout'
import { stashPendingStripe, startTipCheckout, TIP_AMOUNTS, TIP_AMOUNT_MIN, TIP_AMOUNT_MAX } from '../lib/tips'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'
import { preloadPostedItem } from '../lib/preloadMedia'

function Pill({ children, onClick, active = false, title, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-9 px-3 text-sm font-medium inline-flex items-center gap-2 shrink-0 border disabled:opacity-40 ${
        active
          ? 'border-white bg-white text-black'
          : 'border-white/20 bg-transparent text-white hover:border-white/50 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

function NextStrip({ title, items, onOpen }) {
  if (!items?.length) return null
  return (
    <section className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 flex gap-3 overflow-x-auto pb-2">
        {items.map((rel) => {
          const vertical = rel.type === 'short' || rel.type === 'pic'
          return (
            <button
              key={rel.id}
              type="button"
              onClick={() => onOpen?.(rel)}
              className="w-40 sm:w-44 shrink-0 text-left group"
            >
              <div className={`relative overflow-hidden bg-[#141418] ${vertical ? 'aspect-[3/4]' : 'aspect-[16/10]'}`}>
                {rel.thumbUrl ? (
                  <img
                    src={rel.thumbUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                {rel.durationSec > 0 ? (
                  <span className="absolute bottom-1.5 right-1.5 text-[10px] font-medium text-white/90">
                    {formatDuration(rel.durationSec)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[13px] text-zinc-100 leading-snug line-clamp-2">{rel.title || 'Untitled'}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500 truncate">{creatorDisplayName(rel)}</p>
            </button>
          )
        })}
      </div>
    </section>
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
  const item = useMemo(() => (itemId ? getWatchItem(itemId) : null), [itemId, syncTick])
  useEffect(() => {
    if (item?.type === 'short' && item.id) onPlayItem?.(item)
  }, [item?.id, item?.type])
  const browseVideos = useMemo(
    () => (itemId ? [] : (listImportsNormalized() || []).filter((i) => i.type === 'video' || i.type === 'short')),
    [itemId, syncTick]
  )
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
  const [tipBusy, setTipBusy] = useState('')
  const [customTip, setCustomTip] = useState('')
  const countRef = useRef(null)
  const appliedStart = useRef(false)
  const viewCountedRef = useRef(false)
  const iframeViewTimerRef = useRef(null)

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
    preloadPostedItem(queue.next)
  }, [queue.next])

  useEffect(() => {
    setVotes(getVotes(itemId))
    setMyVote(getUserVote(user?.id, itemId))
    setIsSaved((getSaved() || []).includes(itemId))
    appliedStart.current = false
    setEndScreen(false)
    setCountdown(0)
    setCueText('')
    setMoreOpen(false)
    viewCountedRef.current = false
    if (iframeViewTimerRef.current) {
      clearTimeout(iframeViewTimerRef.current)
      iframeViewTimerRef.current = null
    }
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
    if (typeof document !== 'undefined' && item.title) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://calabi.us'
      setPageMeta({
        title: item.title,
        description: item.description || `Watch ${item.title} on calabi`,
        image: item.thumbnailUrl || item.thumbUrl || '',
        url: `${origin}/${encodeURIComponent(item.id)}`,
        type: 'video.other',
      })
    }
    let cancelled = false
    setViews(getViews(item.id))
    setPhase('loading')
    attemptRef.current = 0

    resolvePlayback(item).then((res) => {
      if (cancelled) return
      candidatesRef.current = res.candidates
      setPlaySrc(res.playSrc)
      setMode(res.mode)
      setPhase(res.playSrc ? 'ready' : 'failed')
    })


    return () => {
      cancelled = true
    }
  }, [item?.id, item?.mediaUrl, item?.sourceUrl])

  useEffect(() => {
    const el = videoRef.current
    if (el) el.playbackRate = speed
    setWatchPrefs({ defaultSpeed: speed })
  }, [speed, playSrc])

  const locked = useMemo(() => !canAccessPaidPost(user, item), [user, item, syncTick])
  const purchasePending = useMemo(() => {
    try { return sessionStorage.getItem('clips_pending_purchase') === itemId } catch { return false }
  }, [itemId, syncTick])
  const watchProgress = useMemo(
    () => (user?.id && item?.id ? getWatchProgress(user.id, item.id) : null),
    [user?.id, item?.id, syncTick],
  )
  const canWatchAgain = Boolean(watchProgress?.completed || (watchProgress?.watchRatio || 0) >= 0.92 || endScreen)

  const watchAgain = () => {
    const el = videoRef.current
    setEndScreen(false)
    setCountdown(0)
    if (countRef.current) clearInterval(countRef.current)
    if (!el) return
    try { el.currentTime = 0 } catch {}
    if (!locked) {
      el.play?.().catch(() => {
        el.muted = true
        el.play?.().catch(() => {})
      })
    }
  }

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (locked || phase !== 'ready' || mode !== 'video') return
    el.play?.().catch(() => {
      el.muted = true
      el.play?.().catch(() => {})
    })
  }, [locked, phase, mode, playSrc])

  const seekTo = (sec) => {
    const el = videoRef.current
    if (!el) return
    try { el.currentTime = Math.max(0, Math.min(el.duration || sec, sec)) } catch {}
  }

  const countViewOnProgress = useCallback((currentTime = 0) => {
    if (!item?.id || viewCountedRef.current) return
    if (currentTime < 1) return
    viewCountedRef.current = true
    setViews(recordView(item.id, {
      creatorId: item.creatorId || item.userId,
      title: item.title,
      actorId: user?.id || null,
      surface: 'watch',
      contentType: item.type === 'video' ? 'video' : 'short',
    }))
  }, [item?.id, item?.creatorId, item?.userId, item?.title, item?.type, user?.id])

  const onIframeLoad = useCallback(() => {
    if (iframeViewTimerRef.current) clearTimeout(iframeViewTimerRef.current)
    iframeViewTimerRef.current = setTimeout(() => countViewOnProgress(1), 3000)
  }, [countViewOnProgress])

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
    countViewOnProgress(video.currentTime)
    if (mode === 'video' && item.type === 'video') {
    }
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

  useEffect(() => {
    if (phase !== 'ready' || mode !== 'iframe' || !playSrc) return
    if (!safeIframeSrc(playSrc)) tryNext()
  }, [phase, mode, playSrc])

  useEffect(() => () => {
    if (countRef.current) clearInterval(countRef.current)
    if (iframeViewTimerRef.current) clearTimeout(iframeViewTimerRef.current)
  }, [itemId])

  const share = async (withTime = false) => {
    try {
      const t = withTime && videoRef.current ? Math.floor(videoRef.current.currentTime || 0) : 0
      await copyShareUrl('watch', item.id, t > 0 ? { t } : null)
      setCopied(withTime ? 'time' : 'link')
      setTimeout(() => setCopied(''), 1600)
      if (user?.id) {
        recordInteraction(user.id, { contentId: item.id, type: 'share', tags: item.tags || [], creatorId: item.creatorId, title: item.title, surface: 'watch', contentType: item.type === 'video' ? 'video' : 'short' })
      }
    } catch {}
  }

  const vote = (dir) => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    const next = toggleVote(user.id, item.id, dir, {
      creatorId: item.creatorId || item.userId,
      title: item.title,
      surface: 'watch',
      contentType: item.type === 'video' ? 'video' : 'short',
    })
    setVotes({ ...next })
    setMyVote(getUserVote(user.id, item.id))
    recordInteraction(user.id, {
      contentId: item.id,
      type: dir === 'up' ? 'upvote' : 'downvote',
      tags: item.tags || [],
      creatorId: item.creatorId,
      title: item.title,
      surface: 'watch',
      contentType: item.type === 'video' ? 'video' : 'short',
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
    stashPendingStripe({
      kind: 'post_purchase',
      donorId: user.id,
      handle: user.handle,
      creatorId: item.creatorId || item.userId,
      contentId: item.id,
    })
    setPayBusy(true)
    const result = await startPremiumCheckout({
      already: false,
      email: user?.email || '',
      reference: `post:${item.id}:${user.id}`,
      amountCents: Math.round(Number(item.priceUsd) * 100),
      kind: 'post_purchase',
      productName: item.title || 'Paid post',
      creatorId: item.creatorId || item.userId || '',
      contentId: item.id,
    })
    if (result.url) redirectSafeUrl(result.url)
    else if (result.message) setPayBusy(false) // keep message path if any UI uses it
    setPayBusy(false)
  }

  const donatePost = async (amount) => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    setTipBusy(String(amount))
    const result = await startTipCheckout({
      user,
      kind: 'post_tip',
      creatorId: item.creatorId || item.userId,
      contentId: item.id,
      amount,
      handle: user.handle,
    })
    setTipBusy('')
    if (result.url) redirectSafeUrl(result.url)
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

  if (!itemId) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-lg font-semibold text-white">Videos</h1>
        {browseVideos.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {browseVideos.map((v) => (
              <ContentCard key={v.id} item={v} onOpen={onPlayItem} onOpenProfile={onOpenProfile} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No videos yet.</p>
        )}
      </div>
    )
  }

  if (itemId && !item) {
    if (!isCatalogHydrated()) return <WatchSkeleton />
    return (
      <div className="flex flex-1 items-center justify-center p-8 min-h-[50vh]">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-base font-semibold text-zinc-200">This video is unavailable</p>
          <p className="text-sm text-zinc-500">
            It may have been deleted, set to private, or the link is out of date.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="h-9 px-4 rounded-lg bg-white text-black text-xs font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onPlayItem ? onBack?.() : (window.location.href = '/')}
              className="h-9 px-4 rounded-lg border border-zinc-700 text-xs text-zinc-300"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isVertical = item.type === 'short'
  const openUrl = (isHttp(item.mediaUrl) && item.mediaUrl) || (isHttp(item.sourceUrl) && item.sourceUrl)
  const desc = (item.description || '').trim()
  const thumb = item.thumbUrl || ''
  const endPicks = [queue.next, ...related].filter((x, i, a) => x && a.findIndex((y) => y?.id === x.id) === i).slice(0, 3)

  return (
    <div className="pb-24">
      <div className="bg-[#050506] border-b border-white/[0.06]">
        <div
          className={`relative w-full overflow-hidden mx-auto ${
            isVertical
              ? 'aspect-[9/16] max-h-[78vh] max-w-md'
              : theater
                ? 'aspect-video max-h-[88vh]'
                : 'aspect-video max-h-[72vh]'
          } ${ambient ? 'bg-zinc-950' : 'bg-black'}`}
        >
            {locked && (
              <div className="absolute inset-0 z-40 bg-black/85 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-lg font-semibold text-white">Paid post</p>
                <p className="text-sm text-zinc-400 max-w-sm">
                  Following is free. This post is ${Number(item.priceUsd).toFixed(2)}.
                </p>
                {purchasePending ? (
                  <p className="text-xs text-amber-400">Payment pending — complete checkout, then return here.</p>
                ) : null}
                <button
                  type="button"
                  disabled={payBusy}
                  onClick={buyPost}
                  className="h-10 px-5 bg-white text-black text-sm font-semibold disabled:opacity-50"
                >
                  {payBusy
                    ? 'Opening…'
                    : ownCheckoutConfigured()
                      ? `Pay $${Number(item.priceUsd).toFixed(2)}`
                      : 'Checkout not configured'}
                </button>
              </div>
            )}
            {ambient && thumb ? (
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110" />
            ) : null}
            {phase === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
                <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
                <p className="text-sm font-medium">calabi</p>
              </div>
            )}
            {phase === 'ready' && mode === 'iframe' && safeIframeSrc(playSrc) && (
              <iframe src={safeIframeSrc(playSrc)} title={item.title || 'Video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 w-full h-full border-0" onLoad={onIframeLoad} />
            )}
            {phase === 'ready' && mode === 'video' && safeMediaUrl(playSrc) && (
              <video
                ref={videoRef}
                key={playSrc}
                src={safeMediaUrl(playSrc)}
                controls
                autoPlay={!locked}
                playsInline
                preload="auto"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={onEnded}
                onError={tryNext}
                style={filterCss(item?.filterId || item?.engagement?.filterId) ? { filter: filterCss(item?.filterId || item?.engagement?.filterId) } : undefined}
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
      </div>

          {chapters.length > 0 && (
            <div className="max-w-3xl mx-auto px-4 md:px-6 mt-3 flex flex-wrap gap-1.5">
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

          <div className="max-w-3xl mx-auto px-4 md:px-6 mt-6 space-y-5">
            <h1 className="text-[1.65rem] font-semibold text-white leading-tight tracking-tight">{item.title || 'Untitled'}</h1>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  data-avatar-btn
                  onClick={() => onOpenProfile?.(item.handle, item.creatorId)}
                  className="shrink-0 rounded-full"
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
                <FollowButton creatorId={item.creatorId || item.userId} handle={item.handle} onOpenAuth={onOpenAuth} className="ml-2" />
                <EnableNotificationsButton compact className="ml-2" />
                {ownCheckoutConfigured() ? (
                  <div className="ml-2 flex items-center gap-1 flex-wrap justify-end">
                    {TIP_AMOUNTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={!!tipBusy}
                        onClick={() => donatePost(n)}
                        className="h-8 px-2 rounded-full bg-white/10 text-[11px] font-semibold text-white"
                      >
                        {tipBusy === String(n) ? '…' : `$${n}`}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={TIP_AMOUNT_MIN}
                      max={TIP_AMOUNT_MAX}
                      step="0.01"
                      value={customTip}
                      onChange={(e) => setCustomTip(e.target.value)}
                      placeholder="Other"
                      className="h-8 w-16 rounded-full border border-white/20 bg-black/40 px-2 text-[11px] text-white"
                    />
                    <button
                      type="button"
                      disabled={!!tipBusy || !customTip}
                      onClick={() => donatePost(customTip)}
                      className="h-8 px-2 rounded-full bg-white text-[11px] font-semibold text-black disabled:opacity-40"
                    >
                      {tipBusy === customTip ? '…' : 'Give'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 lg:justify-end">
                <Pill onClick={() => vote('up')} active={myVote === 'up'} title="Like">
                  <ThumbsUp className={`h-4 w-4 ${myVote === 'up' ? 'fill-current' : ''}`} />
                  {likesLabel(votes.up)}
                </Pill>
                <Pill onClick={() => vote('down')} active={myVote === 'down'} title="Dislike">
                  <ThumbsDown className={`h-4 w-4 ${myVote === 'down' ? 'fill-current' : ''}`} />
                </Pill>
                <Pill onClick={() => share(false)}>
                  <Share2 className="h-4 w-4" />
                  {copied === 'link' ? 'Copied' : 'Share'}
                </Pill>
                {canWatchAgain ? (
                  <Pill onClick={watchAgain} title="Start from the beginning">
                    <RotateCcw className="h-4 w-4" />
                    Watch again
                  </Pill>
                ) : null}
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
                      <p className="px-4 py-2 text-[10px] text-zinc-500 leading-relaxed">
                        Shortcuts: Space play · ←/→ seek · F fullscreen · M mute · T theater · N next
                      </p>
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
              <div className="border-y border-white/10 py-4 space-y-2">
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
          </div>

          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <NextStrip title="Also on" items={related} onOpen={onPlayItem} />
            <NextStrip title="From this creator" items={moreFrom} onOpen={onPlayItem} />
          </div>

          <div className="max-w-3xl mx-auto px-4 md:px-6 mt-10">
            <CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} />
          </div>

      <PlaylistPicker open={playlistOpen} onClose={() => setPlaylistOpen(false)} contentId={item.id} onOpenAuth={onOpenAuth} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
    </div>
  )
}
