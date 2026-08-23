import { useState, useEffect, useRef } from 'react'
import { X, ExternalLink, Play, Clock, SkipForward, ArrowUpRight } from 'lucide-react'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { recordView, getViews } from '../lib/engagement'
import { recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { getActiveAdForVideo, recordAdImpression, recordAdClick, recordAdSkip } from '../lib/adEngine'
import { useAuth } from '../context/AuthContext'

export default function VideoPlayerModal({ item, onClose }) {
  const { user } = useAuth()
  const [blobSrc, setBlobSrc] = useState(item?.sourceUrl || '')
  const [views, setViews] = useState(() => (item?.id ? getViews(item.id) : 0))

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

    // Check if item has a persistent blob in IndexedDB
    if (item.origin === 'upload' && item.id.startsWith('local_')) {
      getMediaBlobUrl(item.id).then((url) => {
        if (url) setBlobSrc(url)
      }).catch(() => {})
    } else {
      setBlobSrc(item.sourceUrl || item.mediaUrl || '')
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

  const isDirectVideo =
    blobSrc?.startsWith('blob:') ||
    blobSrc?.startsWith('data:') ||
    blobSrc?.endsWith('.mp4') ||
    blobSrc?.endsWith('.webm') ||
    blobSrc?.endsWith('.mov') ||
    item?.origin === 'upload'

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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#121218] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-[#15151e]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white">
              {item.type === 'short' ? 'Clip (1080p)' : 'Video (1080p)'}
            </span>
            <h2 className="text-sm font-semibold text-zinc-100 truncate">{item.title}</h2>
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
        <div className="relative w-full bg-black flex items-center justify-center aspect-video max-h-[65vh] overflow-hidden">
          {/* Active Ad Overlay (Skippable after 5s) */}
          {activeAd && !adDismissed && (
            <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-[2px] flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-150">
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
              <div className="max-w-md space-y-2 bg-[#12121a]/90 p-4 rounded-2xl border border-zinc-800/80 shadow-xl">
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

          {isDirectVideo ? (
            <video
              src={blobSrc}
              controls
              autoPlay
              playsInline
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-contain"
            />
          ) : item.sourceUrl ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Play className="h-8 w-8 ml-1" />
              </div>
              <div>
                <p className="text-base font-medium text-white">{item.title}</p>
                <p className="text-xs text-zinc-400 mt-1">Zero-storage link reference ({item.origin || 'External source'})</p>
              </div>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-all"
              >
                Watch on {item.origin || 'Source'} <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">No media stream available</div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-[#14141c] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 border-t border-zinc-800/80">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-zinc-200">@{item.handle || item.creatorName || 'creator'}</span>
            <span>·</span>
            <span>{views} views</span>
            {item.durationSec ? (
              <>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.durationSec}s</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">1080p High-Efficiency Zero-Storage Stream</span>
          </div>
        </div>
      </div>
    </div>
  )
}
