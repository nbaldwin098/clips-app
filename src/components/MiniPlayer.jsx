import { useEffect, useRef, useState } from 'react'
import { X, Maximize2 } from 'lucide-react'
import { resolvePlayback, formatClock } from '../lib/playback'
import { safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'

export default function MiniPlayer({ item, onExpand, onClose }) {
  const videoRef = useRef(null)
  const [playSrc, setPlaySrc] = useState('')
  const [mode, setMode] = useState('video')

  useEffect(() => {
    let alive = true
    resolvePlayback(item).then((res) => {
      if (!alive) return
      setPlaySrc(res.playSrc)
      setMode(res.mode)
    })
    return () => { alive = false }
  }, [item?.id, item?.mediaUrl, item?.sourceUrl])

  if (!item) return null

  return (
    <div className="fixed bottom-3 right-3 z-[100] w-[280px] max-w-[46vw] rounded-xl border border-zinc-700 bg-[#121218] shadow-2xl overflow-hidden">
      <div className="relative aspect-video bg-black">
        {mode === 'iframe' && safeIframeSrc(playSrc) ? (
          <iframe src={safeIframeSrc(playSrc)} title={item.title || 'Video'} className="absolute inset-0 w-full h-full border-0" allow="autoplay; encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation" />
        ) : safeMediaUrl(playSrc) ? (
          <video ref={videoRef} src={safeMediaUrl(playSrc)} className="absolute inset-0 w-full h-full object-contain" controls playsInline autoPlay />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-500">No media</div>
        )}
        <div className="absolute top-1 right-1 flex gap-1">
          <button type="button" onClick={onExpand} className="h-7 w-7 rounded-md bg-black/70 text-white flex items-center justify-center" title="Expand">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md bg-black/70 text-white flex items-center justify-center" title="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button type="button" onClick={onExpand} className="w-full text-left px-2.5 py-2">
        <p className="text-xs text-white truncate">{item.title || 'Untitled'}</p>
        <p className="text-[10px] text-zinc-500 truncate">
          @{item.handle || 'creator'}{item.durationSec ? ` · ${formatClock(item.durationSec)}` : ''}
        </p>
      </button>
    </div>
  )
}
