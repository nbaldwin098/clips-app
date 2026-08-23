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
  const [blobSrc, setBlobSrc] = useState(item?.sourceUrl || item?.mediaUrl || '')
  const [embedInfo, setEmbedInfo] = useState(() => parseEmbedUrl(item?.sourceUrl || item?.mediaUrl || ''))
  const [views, setViews] = useState(() => (item?.id ? getViews(item.id) : 0))
  const [videoError, setVideoError] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)

  // 5s skippable advertisement state
  const [activeAd, setActiveAd] = useState(() => getActiveAdForVideo(item?.id))
  const [adSecondsLeft, setAdSecondsLeft] = useState(5)
  const [canSkipAd, setCanSkipAd] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const adTimerRef = useRef(null)

  useEffect(() => {
    if (!item?.id) return
    const n = recordView(item.id)
    setViews(n)
    setVideoError(false)

    const rawUrl = item.sourceUrl || item.mediaUrl || ''
    const parsed = parseEmbedUrl(rawUrl)
    setEmbedInfo(parsed)

    // Check if item has a persistent blob in IndexedDB
    if (item.origin === 'upload' && (item.id.startsWith('local_') || item.id.startsWith('up_'))) {
      getMediaBlobUrl(item.id).then((url) => {
        if (url) {
          setBlobSrc(url)
          setEmbedInfo({ type: 'video', src: url, platform: 'direct' })
        } else if (rawUrl) {
          setBlobSrc(rawUrl)
        }
      }).catch(() => {
        if (rawUrl) setBlobSrc(rawUrl)
      })
    } else {
      setBlobSrc(rawUrl)
    }

    // Initialize 5s skippable ad timer
    const ad = getActiveAdForVideo(item.id)
    if (ad) {
      setActiveAd(ad)
      recordAdImpression(ad.id, item.creatorId || item.userId)
      setAdSecondsLeft(5)
      setCanSkipAd(false)
      setAdDismissed(false)

      let count = 5
      adTimerRef.current = setInterval(() => {
        count -= 1
        setAdSecondsLeft(count)
        if (count <= 0) {
          setCanSkipAd(true)
          clearInterval(adTimerRef.current)
        }
      }, 1000)
    }

    return () => {
      if (adTimerRef.current) clearInterval(adTimerRef.current)
    }
  }, [item?.id, item?.origin, item?.sourceUrl, item?.mediaUrl, item?.creatorId, item?.userId])

  if (!item) return null

  const handleSkipAd = () => {
    if (activeAd) recordAdSkip(activeAd.id)
    setAdDismissed(true)
    if (adTimerRef.current) clearInterval(adTimerRef.current)
  }

  const handleAdClick = () => {
    if (activeAd) {
      recordAdClick(activeAd.id)
      if (activeAd.targetUrl) {
        window.open(activeAd.targetUrl, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const handleTimeUpdate = (e) => {
    const video = e.target
    if (!video || !video.duration) return
    const ratio = video.currentTime / video.duration
    if (user?.id && item?.id) {
      recordWatchProgress(user.id, {
        contentId: item.id,
        title: item.title,
        sourceUrl: item.sourceUrl,
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
  }

  const handleVideoError = () => {
    setVideoError(true)
  }

  const isVertical = item.type === 'short' || (item.height && item.width && item.height > item.width)
  const desc = (item.description || '').trim()

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full ${isVertical ? 'max-w-lg' : 'max-w-4xl'} rounded-2xl bg-[#121218] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-[#15151e] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white shrink-0">
              {item.type === 'short' ? 'Clip' : 'Video'}
            </span>
            <h2 className="text-sm font-semibold text-zinc-100 truncate">{item.title || 'Untitled'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Player Stage with 5-Second Skippable Ad Overlay */}
        <div className={`relative w-full bg-black flex items-center justify-center ${isVertical ? 'aspect-[9/16] max-h-[72vh]' : 'aspect-video max-h-[65vh]'} overflow-hidden`}>
          {/* Active Ad Overlay (Skippable after 5s) */}
          {activeAd && !adDismissed && (
            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-[2px] flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-150">
              {/* Ad Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase tracking-wider">
                    Ad · 90% to Creator
                  </span>
                  <span className="text-xs text-zinc-300 font-semibold">{activeAd.businessName}</span>
                </div>

                {/* 5-Second Skip Control */}
                {canSkipAd ? (
                  <button
                    type="button"
                    onClick={handleSkipAd}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
                  >
                    <span>Skip Ad</span>
                    <SkipForward className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <div className="px-3 py-1 rounded-xl bg-black/80 border border-zinc-700 text-zinc-300 text-xs font-medium">
                    Skip in <span className="font-bold text-white">{adSecondsLeft}s</span>
                  </div>
                )}
              </div>

              {/* Ad Center Content */}
              <div className="max-w-md space-y-2 bg-[#12121a]/95 p-4 rounded-2xl border border-zinc-800/80 shadow-xl">
                <p className="text-base font-bold text-white leading-snug">{activeAd.headline}</p>
                <p className="text-xs text-zinc-400">{activeAd.tagline || 'Official Sponsor on Clips'}</p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAdClick}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200"
                  >
                    <span>{activeAd.ctaText || 'Learn More'}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] text-zinc-500 truncate">{activeAd.targetUrl}</span>
                </div>
              </div>

              {/* Ad Footer Progress */}
              <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, ((5 - adSecondsLeft) / 5) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Video Player Rendering (Iframe Embed, HTML5 Direct Video, or Fallback External Link) */}
          {embedInfo?.type === 'iframe' ? (
            <iframe
              src={embedInfo.src}
              title={item.title || 'Video Player'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : embedInfo?.type === 'video' && !videoError ? (
            <video
              src={embedInfo.src || blobSrc}
              controls
              autoPlay
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onError={handleVideoError}
              className="w-full h-full object-contain bg-black"
            />
          ) : blobSrc && !videoError && (blobSrc.startsWith('blob:') || blobSrc.startsWith('data:') || item.origin === 'upload' || item.origin === 'upload-local' || item.hosted) ? (
            <video
              src={blobSrc}
              controls
              autoPlay
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onError={handleVideoError}
              className="w-full h-full object-contain bg-black"
            />
          ) : item.sourceUrl ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md">
              <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-white shadow-inner">
                <Play className="h-8 w-8 ml-1 fill-current text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">{item.title}</p>
                <p className="text-xs text-zinc-400">
                  {videoError
                    ? 'Local video session expired or moved. Open original link below.'
                    : `Zero-storage link reference (${item.origin || item.platform || 'Web Source'})`}
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 w-full justify-center">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all shadow-md"
                >
                  Watch on {item.origin || item.platform || 'Origin'} <ExternalLink className="h-4 w-4" />
                </a>
                {videoError && (
                  <button
                    type="button"
                    onClick={() => { setVideoError(false); setBlobSrc(item.sourceUrl || '') }}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-zinc-800 text-zinc-300 text-xs hover:bg-zinc-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 text-sm gap-2 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-zinc-600" />
              <p>No playable media stream found for this link.</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-[#14141c] border-t border-zinc-800/80 space-y-2 overflow-y-auto shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
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
            <span className="text-[11px] text-zinc-500">1080p High-Efficiency Zero-Storage Stream</span>
          </div>

          {desc && (
            <div className="rounded-xl bg-zinc-900/80 px-3 py-2 text-xs text-zinc-300">
              <p className={showFullDesc ? 'whitespace-pre-wrap' : 'line-clamp-2'}>{desc}</p>
              {desc.length > 120 && (
                <button
                  type="button"
                  className="mt-1 text-zinc-400 hover:text-white font-medium"
                  onClick={() => setShowFullDesc((v) => !v)}
                >
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
