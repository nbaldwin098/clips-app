import { useState, useEffect, useRef } from 'react'
import { X, ExternalLink, Clock, SkipForward, ArrowUpRight, AlertCircle, Loader2, Music } from 'lucide-react'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { recordView, getViews } from '../lib/engagement'
import { recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { getActiveAdForVideo, recordAdImpression, recordAdClick, recordAdSkip } from '../lib/adEngine'
import { useAuth } from '../context/AuthContext'
import { openSafeUrl, safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'

function isHttp(url) {
  return typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))
}

function isBlob(url) {
  return typeof url === 'string' && url.startsWith('blob:')
}

/** Build candidate list: https first, never lead with a dead blob. */
function buildCandidates(item) {
  if (!item) return []
  const list = []
  const push = (u) => {
    if (u && typeof u === 'string' && !list.includes(u)) list.push(u)
  }
  // Prefer stable hosted links
  if (isHttp(item.mediaUrl)) push(item.mediaUrl)
  if (isHttp(item.sourceUrl)) push(item.sourceUrl)
  // Blob only as last resort (often expired after refresh)
  if (isBlob(item.mediaUrl)) push(item.mediaUrl)
  if (isBlob(item.sourceUrl)) push(item.sourceUrl)
  return list
}

export default function VideoPlayerModal({ item, onClose }) {
  const { user } = useAuth()
  const [phase, setPhase] = useState('loading') // loading | ready | failed
  const [playSrc, setPlaySrc] = useState('')
  const [mode, setMode] = useState('video') // video | iframe
  const [views, setViews] = useState(() => (item?.id ? getViews(item.id) : 0))
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [activeAd, setActiveAd] = useState(null)
  const [adSecondsLeft, setAdSecondsLeft] = useState(5)
  const [canSkipAd, setCanSkipAd] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const adTimerRef = useRef(null)
  const candidatesRef = useRef([])
  const attemptRef = useRef(0)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!item?.id) return
    let cancelled = false
    setViews(recordView(item.id))
    setPhase('loading')
    setAdDismissed(false)
    setPlaySrc('')
    attemptRef.current = 0

    const resolve = async () => {
      const candidates = buildCandidates(item)

      // IndexedDB recovery for uploads (works after refresh when blob: is dead)
      try {
        const idbUrl = await getMediaBlobUrl(item.id)
        if (idbUrl && !candidates.includes(idbUrl)) {
          // Prefer IDB blob for local uploads if no https
          if (!candidates.some(isHttp)) candidates.unshift(idbUrl)
          else candidates.push(idbUrl)
        }
      } catch {}

      if (cancelled) return
      candidatesRef.current = candidates

      if (candidates.length === 0) {
        setPhase('failed')
        return
      }

      const first = candidates[0]
      const parsed = parseEmbedUrl(first)
      if (parsed?.type === 'iframe') {
        setMode('iframe')
        setPlaySrc(parsed.src)
        setPhase('ready')
        return
      }
      setMode('video')
      setPlaySrc(parsed?.src || first)
      setPhase('ready')
    }

    resolve()

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
  }, [item?.id, item?.mediaUrl, item?.sourceUrl, item?.origin, item?.hosted])

  /** Auto-advance to next candidate — user never needs Retry. */
  const tryNextSource = () => {
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

  const onVideoError = () => {
    tryNextSource()
  }

  const onVideoCanPlay = () => {
    // Ensure autoplay kicks in once buffer is ready
    const el = videoRef.current
    if (el) {
      el.play?.().catch(() => {
        // muted autoplay fallback
        el.muted = true
        el.play?.().catch(() => {})
      })
    }
  }

  if (!item) return null

  const handleSkipAd = () => {
    if (activeAd) recordAdSkip(activeAd.id)
    setAdDismissed(true)
    if (adTimerRef.current) clearInterval(adTimerRef.current)
  }

  const handleAdClick = () => {
    if (activeAd) {
      recordAdClick(activeAd.id)
      if (activeAd.targetUrl) openSafeUrl(activeAd.targetUrl)
    }
  }

  const handleTimeUpdate = (e) => {
    const video = e.target
    if (!video?.duration || !user?.id || !item?.id) return
    const ratio = video.currentTime / video.duration
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
    if (ratio >= 0.9) {
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

  const isVertical = item.type === 'short' || (item.height && item.width && item.height > item.width)
  const desc = (item.description || '').trim()
  const openUrl = (isHttp(item.mediaUrl) && item.mediaUrl) || (isHttp(item.sourceUrl) && item.sourceUrl) || item.mediaUrl || item.sourceUrl

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className={`relative w-full ${isVertical ? 'max-w-lg' : 'max-w-4xl'} rounded-2xl bg-[#121218] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-[#15151e] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white shrink-0">
              {item.type === 'short' ? 'Clip' : 'Video'}
            </span>
            <h2 className="text-sm font-semibold text-zinc-100 truncate">{item.title || 'Untitled'}</h2>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`relative w-full bg-black flex items-center justify-center ${isVertical ? 'aspect-[9/16] max-h-[72vh]' : 'aspect-video max-h-[65vh]'} overflow-hidden`}>
          {activeAd && !adDismissed && (
            <div className="absolute inset-0 z-30 bg-black/80 flex flex-col justify-between p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase">Ad</span>
                {canSkipAd ? (
                  <button type="button" onClick={handleSkipAd} className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-white text-black text-xs font-bold">
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
                <button type="button" onClick={handleAdClick} className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-white text-black text-xs font-bold">
                  {activeAd.ctaText || 'Learn More'} <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-xs">Loading video…</p>
            </div>
          )}

          {phase === 'ready' && mode === 'iframe' && safeIframeSrc(playSrc) && (
            <iframe
              key={playSrc}
              src={safeIframeSrc(playSrc)}
              title={item.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full border-0"
            />
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
              onCanPlay={onVideoCanPlay}
              onTimeUpdate={handleTimeUpdate}
              onError={onVideoError}
              className="w-full h-full object-contain bg-black"
            />
          )}

          {phase === 'failed' && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md">
              <AlertCircle className="h-10 w-10 text-zinc-600" />
              <p className="text-sm text-zinc-300">Couldn’t play this file in the browser.</p>
              <p className="text-xs text-zinc-500">Re-upload with Supabase Storage on, or open the file link if you have one.</p>
              {openUrl && isHttp(openUrl) && (
                <a href={openUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-xs font-bold">
                  Open media <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#14141c] border-t border-zinc-800/80 space-y-2 overflow-y-auto shrink-0">
          <h3 className="text-base font-semibold text-white">{item.title || 'Untitled'}</h3>
          {item.soundTitle ? (
            <p className="text-xs text-zinc-400 inline-flex items-center gap-1"><Music className="h-3 w-3" />{item.soundTitle}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">@{item.handle || item.creatorName || 'creator'}</span>
            <span>·</span>
            <span>{views} views</span>
            {item.durationSec ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{item.durationSec}s</span>
              </>
            ) : null}
          </div>
          {desc && (
            <div className="rounded-xl bg-zinc-900/80 px-3 py-2 text-xs text-zinc-300">
              <p className={showFullDesc ? 'whitespace-pre-wrap' : 'line-clamp-2'}>{desc}</p>
              {desc.length > 120 && (
                <button type="button" className="mt-1 text-zinc-400 hover:text-white font-medium" onClick={() => setShowFullDesc((v) => !v)}>
                  {showFullDesc ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
