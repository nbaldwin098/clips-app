import { useState, useEffect, useRef } from 'react'
import { X, ExternalLink, Play, Clock, SkipForward, ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { recordView, getViews } from '../lib/engagement'
import { recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { getActiveAdForVideo, recordAdImpression, recordAdClick, recordAdSkip } from '../lib/adEngine'
import { useAuth } from '../context/AuthContext'

export default function VideoPlayerModal({ item, onClose }) {
  const { user } = useAuth()
  const rawInitial = item?.mediaUrl || item?.sourceUrl || ''
  const [playSrc, setPlaySrc] = useState(rawInitial)
  const [embedInfo, setEmbedInfo] = useState(() => parseEmbedUrl(rawInitial))
  const [views, setViews] = useState(() => (item?.id ? getViews(item.id) : 0))
  const [videoError, setVideoError] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [activeAd, setActiveAd] = useState(null)
  const [adSecondsLeft, setAdSecondsLeft] = useState(5)
  const [canSkipAd, setCanSkipAd] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const adTimerRef = useRef(null)

  useEffect(() => {
    if (!item?.id) return
    let cancelled = false
    setViews(recordView(item.id))
    setVideoError(false)
    setAdDismissed(false)

    const rawUrl = item.mediaUrl || item.sourceUrl || ''
    const parsed = parseEmbedUrl(rawUrl)
    setEmbedInfo(parsed)
    setPlaySrc(rawUrl)

    // Prefer IndexedDB blob for uploads (blob: URLs die on refresh)
    const tryBlob = async () => {
      if (!item.id) return
      try {
        const url = await getMediaBlobUrl(item.id)
        if (!cancelled && url) {
          setPlaySrc(url)
          setEmbedInfo({ type: 'video', src: url, platform: 'direct' })
        }
      } catch {}
    }
    if (
      item.origin === 'upload' ||
      item.origin === 'upload-local' ||
      item.hosted ||
      String(item.id).startsWith('up_') ||
      String(item.id).startsWith('local_') ||
      (rawUrl && rawUrl.startsWith('blob:'))
    ) {
      tryBlob()
    }

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
  }, [item?.id, item?.origin, item?.sourceUrl, item?.mediaUrl, item?.hosted])

  if (!item) return null

  const handleSkipAd = () => {
    if (activeAd) recordAdSkip(activeAd.id)
    setAdDismissed(true)
    if (adTimerRef.current) clearInterval(adTimerRef.current)
  }

  const handleAdClick = () => {
    if (activeAd) {
      recordAdClick(activeAd.id)
      if (activeAd.targetUrl) window.open(activeAd.targetUrl, '_blank', 'noopener,noreferrer')
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
  const videoSrc = embedInfo?.src || playSrc
  const useIframe = embedInfo?.type === 'iframe'
  const useVideo =
    !useIframe &&
    !videoError &&
    videoSrc &&
    (embedInfo?.type === 'video' ||
      item.hosted ||
      item.origin === 'upload' ||
      item.origin === 'upload-local' ||
      videoSrc.startsWith('blob:') ||
      videoSrc.startsWith('data:') ||
      videoSrc.startsWith('http'))

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

          {useIframe ? (
            <iframe
              key={embedInfo.src}
              src={embedInfo.src}
              title={item.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : useVideo ? (
            <video
              key={videoSrc}
              src={videoSrc}
              controls
              autoPlay
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onError={() => setVideoError(true)}
              className="w-full h-full object-contain bg-black"
            />
          ) : item.sourceUrl || item.mediaUrl ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md">
              <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Play className="h-8 w-8 ml-1 fill-current" />
              </div>
              <p className="text-base font-bold text-white">{item.title}</p>
              <p className="text-xs text-zinc-400">
                {videoError
                  ? 'Could not play this file in-browser. Open the original link or re-upload with Storage connected.'
                  : 'Open the source link to watch.'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <a
                  href={item.mediaUrl || item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-xs font-bold"
                >
                  Open media <ExternalLink className="h-4 w-4" />
                </a>
                {videoError && (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoError(false)
                      setPlaySrc(item.mediaUrl || item.sourceUrl || '')
                    }}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-zinc-700 text-zinc-300 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 text-sm gap-2 p-6">
              <AlertCircle className="h-8 w-8 text-zinc-600" />
              <p>No playable media for this post.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#14141c] border-t border-zinc-800/80 space-y-2 overflow-y-auto shrink-0">
          <h3 className="text-base font-semibold text-white">{item.title || 'Untitled'}</h3>
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
