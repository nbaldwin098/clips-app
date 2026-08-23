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
  const [activeAd, setActiveAd] = useState(() => getActiveAdForVideo(item?.id))
  const [adSecondsLeft, setAdSecondsLeft] = useState(5)
  const [canSkipAd, setCanSkipAd] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const adTimerRef = useRef(null)

  useEffect(() => {
    if (!item?.id) return
    const n = recordView(item.id)
    setViews(n)

    if (item.origin === 'upload' && (item.id.startsWith('local_') || item.id.startsWith('up_'))) {
      getMediaBlobUrl(item.id).then((url) => {
        if (url) setBlobSrc(url)
      }).catch(() => {})
    } else {
      setBlobSrc(item.sourceUrl || item.mediaUrl || '')
    }

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
    item?.origin === 'upload' ||
    item?.hosted

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

  const isShort = item.type === 'short'
  const desc = (item.description || '').trim()

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className={`relative w-full ${isShort ? 'max-w-md' : 'max-w-4xl'} rounded-2xl bg-[#121218] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-[#15151e]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white shrink-0">
              {isShort ? 'Clip' : 'Video'}
            </span>
            <h2 className="text-sm font-semibold text-zinc-100 truncate">{item.title || 'Untitled'}</h2>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${isShort ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video max-h-[65vh]'}`}>
          {activeAd && !adDismissed && (
            <div className="absolute inset-0 z-30 bg-black/75 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase">Ad</span>
                {canSkipAd ? (
                  <button type="button" onClick={handleSkipAd} className="h-8 px-4 rounded-xl bg-white text-black text-xs font-bold inline-flex items-center gap-1">
                    Skip <SkipForward className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-zinc-300">Skip in {adSecondsLeft}s</span>
                )}
              </div>
              <div className="max-w-md space-y-2 bg-[#12121a]/90 p-4 rounded-2xl border border-zinc-800">
                <p className="text-base font-bold text-white">{activeAd.headline}</p>
                <button type="button" onClick={handleAdClick} className="h-8 px-4 rounded-lg bg-white text-black text-xs font-bold inline-flex items-center gap-1">
                  {activeAd.ctaText || 'Learn More'} <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${((5 - adSecondsLeft) / 5) * 100}%` }} />
              </div>
            </div>
          )}

          {isDirectVideo ? (
            <video src={blobSrc} controls autoPlay playsInline onTimeUpdate={handleTimeUpdate} className="w-full h-full object-contain" />
          ) : item.sourceUrl ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Play className="h-8 w-8 ml-1" />
              </div>
              <p className="text-base font-medium text-white">{item.title}</p>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-sm font-bold">
                Open source <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">No media</div>
          )}
        </div>

        {/* YouTube-style meta under player */}
        <div className="p-4 bg-[#14141c] border-t border-zinc-800/80 space-y-2 overflow-y-auto">
          <h3 className="text-base font-semibold text-white leading-snug">{item.title || 'Untitled'}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="font-medium text-zinc-200">@{item.handle || 'creator'}</span>
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
