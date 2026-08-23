import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Share2, ListPlus, Music, Clock, ExternalLink, AlertCircle,
  Loader2, SkipForward, ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getById, getRelated } from '../lib/contentService'
import { recordView } from '../lib/engagement'
import { getWatchProgress, recordWatchProgress } from '../lib/watchProgress'
import { recordInteraction } from '../lib/algorithmEngine'
import { getActiveAdForVideo, recordAdImpression, recordAdClick, recordAdSkip } from '../lib/adEngine'
import { resolvePlayback, PLAYBACK_SPEEDS, formatClock, isHttp } from '../lib/playback'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { openSafeUrl, safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { copyShareUrl } from '../lib/routes'
import { useContentSyncTick } from '../lib/useContentSync'
import CommentsPanel from './CommentsPanel'
import PlaylistPicker from './PlaylistPicker'
import ContentCard from './ContentCard'

export default function WatchPage({
  itemId,
  onBack,
  onPlayItem,
  onOpenSound,
  onOpenTag,
  onOpenProfile,
  onOpenAuth,
}) {
  const { user, isAuthenticated } = useAuth()
  const syncTick = useContentSyncTick()
  const item = useMemo(() => getById(itemId), [itemId, syncTick])
  const related = useMemo(() => getRelated(item, 8), [item, syncTick])
  const videoRef = useRef(null)
  const candidatesRef = useRef([])
  const attemptRef = useRef(0)
  const [phase, setPhase] = useState('loading')
  const [playSrc, setPlaySrc] = useState('')
  const [mode, setMode] = useState('video')
  const [views, setViews] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [copied, setCopied] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [activeAd, setActiveAd] = useState(null)
  const [adSecondsLeft, setAdSecondsLeft] = useState(5)
  const [canSkipAd, setCanSkipAd] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)
  const adTimerRef = useRef(null)

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
  }, [speed, playSrc])

  const onLoadedMetadata = () => {
    const el = videoRef.current
    if (!el || !user?.id || !item?.id) return
    const progress = getWatchProgress(user.id, item.id)
    const pos = progress?.positionSec || 0
    if (pos > 2 && pos < (el.duration || 0) - 2) {
      try { el.currentTime = pos } catch {}
    }
    el.playbackRate = speed
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

  const share = async () => {
    try {
      await copyShareUrl('watch', item.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
      if (user?.id) {
        recordInteraction(user.id, { contentId: item.id, type: 'share', tags: item.tags || [], creatorId: item.creatorId })
      }
    } catch {}
  }

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

  return (
    <div className="p-3 md:p-6 max-w-[1200px] mx-auto pb-20">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className={`grid gap-6 ${isVertical ? 'lg:grid-cols-[minmax(0,420px)_1fr]' : 'lg:grid-cols-[minmax(0,1fr)_320px]'}`}>
        <div>
          <div className={`relative w-full bg-black overflow-hidden rounded-xl ${isVertical ? 'aspect-[9/16] max-h-[78vh]' : 'aspect-video'}`}>
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
                onError={tryNext}
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
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

          <div className="mt-4 space-y-3">
            <h1 className="text-lg font-semibold text-white">{item.title || 'Untitled'}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <button type="button" onClick={() => onOpenProfile?.(item.handle, item.creatorId)} className="font-semibold text-zinc-100 hover:underline">
                @{item.handle || 'creator'}
              </button>
              <span>·</span>
              <span>{views} views</span>
              {item.durationSec ? (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatClock(item.durationSec)}</span>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
                Speed
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-8 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-2 text-xs text-zinc-200">
                  {PLAYBACK_SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}×</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={share} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy link'}
              </button>
              <button type="button" onClick={() => { if (!isAuthenticated) { onOpenAuth?.(); return } setPlaylistOpen(true) }} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                <ListPlus className="h-3.5 w-3.5" /> Playlist
              </button>
              {item.soundTitle ? (
                <button type="button" onClick={() => onOpenSound?.(item.soundId || item.soundTitle)} className="h-8 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-200 inline-flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" />{item.soundTitle}
                </button>
              ) : null}
            </div>

            {(item.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <button key={t} type="button" onClick={() => onOpenTag?.(t)} className="h-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {desc ? <p className="text-sm text-zinc-400 whitespace-pre-wrap">{desc}</p> : null}

            <CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} />
          </div>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">Up next</h2>
          {related.length === 0 ? (
            <p className="text-xs text-zinc-500">Nothing else in the catalog yet.</p>
          ) : (
            related.map((rel) => (
              <ContentCard key={rel.id} item={rel} onOpen={onPlayItem} variant={rel.type === 'video' ? 'video' : 'short'} />
            ))
          )}
        </aside>
      </div>

      <PlaylistPicker open={playlistOpen} onClose={() => setPlaylistOpen(false)} contentId={item.id} onOpenAuth={onOpenAuth} />
    </div>
  )
}
