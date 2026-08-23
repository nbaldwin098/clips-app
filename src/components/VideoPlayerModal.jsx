import { useState, useEffect } from 'react'
import { X, ExternalLink, Play, Clock } from 'lucide-react'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { recordView, getViews } from '../lib/engagement'
import { recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { useAuth } from '../context/AuthContext'

export default function VideoPlayerModal({ item, onClose }) {
  const { user } = useAuth()
  const [blobSrc, setBlobSrc] = useState(item?.sourceUrl || '')
  const [views, setViews] = useState(() => (item?.id ? getViews(item.id) : 0))

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
  }, [item?.id, item?.origin, item?.sourceUrl, item?.mediaUrl])

  if (!item) return null

  const isDirectVideo =
    blobSrc?.startsWith('blob:') ||
    blobSrc?.startsWith('data:') ||
    blobSrc?.endsWith('.mp4') ||
    blobSrc?.endsWith('.webm') ||
    blobSrc?.endsWith('.mov') ||
    item?.origin === 'upload'

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

        {/* Player Stage */}
        <div className="relative w-full bg-black flex items-center justify-center aspect-video max-h-[65vh] overflow-hidden">
          {isDirectVideo ? (
            <video
              src={blobSrc}
              controls
              autoPlay
              playsInline
              onPlay={() => setIsPlaying(true)}
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
