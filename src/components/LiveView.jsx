import { useState, useEffect, useCallback, useRef } from 'react'
import { Radio, MonitorUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet } from '../lib/storage'
import { listLiveBoard, liveBadgeLabel, isOnAir } from '../lib/liveStatus'
import { getSubscriberCount } from '../lib/engagement'
import FollowButton from './FollowButton'
import { cn } from '../lib/utils'
import { watchingLabel } from '../lib/uiFormat'
import LiveHostTools from './LiveHostTools'
import CalabiCashShop from './CalabiCashShop'
import { filterCss, getStreamFilter } from '../lib/streamFilters'
import { liveIngestConnected, liveListingBlockedReason } from '../lib/liveIngest'
import Footer from './Footer'

function formatElapsed(startedAt) {
  if (!startedAt) return ''
  const ms = Date.now() - new Date(startedAt).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just started'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

/**
 * Live tab — homepage-style livestream shelves. Go live only from Create (+).
 */
export default function LiveView({ focusedStream, onFocusStream, onOpenAuth, onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [liveNow, setLiveNow] = useState(() => listLiveBoard(lsGet('live_board', []) || []))
  const [, setTick] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [screenError, setScreenError] = useState('')
  const [cashOpen, setCashOpen] = useState(false)
  const [hlsError, setHlsError] = useState('')
  const screenRef = useRef(null)
  const hlsRef = useRef(null)

  const refreshLiveBoard = useCallback(() => {
    setLiveNow(listLiveBoard(lsGet('live_board', []) || []))
  }, [])

  useEffect(() => {
    if (!focusedStream?.userId) return
    const row = liveNow.find((s) => s.userId === focusedStream.userId)
    if (!row) return
    if ((row.watchers || 0) === (focusedStream.watchers || 0)) return
    onFocusStream?.(row)
  }, [liveNow, focusedStream, onFocusStream])

  useEffect(() => {
    refreshLiveBoard()
    const interval = setInterval(() => {
      refreshLiveBoard()
      setTick((t) => t + 1)
    }, 15000)
    return () => clearInterval(interval)
  }, [refreshLiveBoard])

  useEffect(() => () => onFocusStream?.(null), [onFocusStream])

  // HLS playback only when the lobby entry published a real hlsUrl (ingest connected).
  useEffect(() => {
    const el = hlsRef.current
    const url = String(focusedStream?.hlsUrl || '').trim()
    setHlsError('')
    if (!el) return undefined
    if (sharing || !url || !focusedStream?.ingestConnected) {
      el.removeAttribute('src')
      el.load?.()
      return undefined
    }
    el.src = url
    const onErr = () => setHlsError('HLS stream not reachable yet (ingest offline or CORS/TLS).')
    el.addEventListener('error', onErr)
    el.play?.().catch(() => {})
    return () => {
      el.removeEventListener('error', onErr)
      el.removeAttribute('src')
      el.load?.()
    }
  }, [focusedStream?.hlsUrl, focusedStream?.ingestConnected, focusedStream?.userId, sharing])

  const shareCamera = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setScreenError('Camera is not supported in this browser.')
      return
    }
    setScreenError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      const el = screenRef.current
      if (el) {
        el.srcObject = stream
        el.play?.().catch(() => {})
      }
      setSharing(true)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setSharing(false)
        if (screenRef.current) screenRef.current.srcObject = null
      })
    } catch (err) {
      setScreenError(err?.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Could not open camera.')
    }
  }

  const shareScreen = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setScreenError('Screen share not supported.')
      return
    }
    setScreenError('')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      const el = screenRef.current
      if (el) {
        el.srcObject = stream
        el.play?.().catch(() => {})
      }
      setSharing(true)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setSharing(false)
        if (screenRef.current) screenRef.current.srcObject = null
      })
    } catch (err) {
      setScreenError(err?.name === 'NotAllowedError' ? 'Screen share denied.' : 'Could not share screen.')
    }
  }

  const selectStream = (entry) => onFocusStream?.(entry)
  const subCount = focusedStream?.userId ? getSubscriberCount(focusedStream.userId) : 0
  const filterStyle = user?.id ? filterCss(getStreamFilter(user.id).filterId) : ''
  const ingestOk = liveIngestConnected()
  const showHls = !!(focusedStream?.ingestConnected && focusedStream?.hlsUrl && !sharing)

  const followingLive = liveNow

  return (
    <div className="w-full min-h-full bg-black">
      {/* Ambient cool wash — not a title bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-red-950/25 via-transparent to-transparent" />

      <div className="relative px-4 md:px-6 py-4 max-w-[1600px] mx-auto w-full space-y-8">
        {!ingestOk ? (
          <p className="text-[11px] text-zinc-500 border border-zinc-800/80 bg-[#0a0a0c] px-3 py-2">
            {liveListingBlockedReason()}
          </p>
        ) : null}

        {focusedStream ? (
          <div className="overflow-hidden border border-zinc-800/80 bg-[#0a0a0c]">
            <div className="relative aspect-video w-full bg-gradient-to-br from-[#1a1010] to-[#0c0c10] flex flex-col items-center justify-center text-center p-6">
              <video
                ref={screenRef}
                className={cn('absolute inset-0 h-full w-full object-contain bg-black', sharing ? '' : 'hidden')}
                style={filterStyle ? { filter: filterStyle } : undefined}
                muted
                playsInline
                autoPlay
              />
              <video
                ref={hlsRef}
                className={cn('absolute inset-0 h-full w-full object-contain bg-black', showHls ? '' : 'hidden')}
                playsInline
                autoPlay
                controls
              />
              {!sharing && !showHls ? (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eb0400] text-white font-extrabold text-xs uppercase tracking-wider">
                      <Radio className="h-3.5 w-3.5" />
                      {liveBadgeLabel(focusedStream)}
                    </span>
                    <span className="px-2 py-1 bg-black/50 text-zinc-300 text-xs">{formatElapsed(focusedStream.startedAt)}</span>
                  </div>
                  <div className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 bg-white/10 text-white border border-white/40">
                    {(focusedStream.displayName || focusedStream.handle || '?')[0]?.toUpperCase()}
                  </div>
                  <h2 className="text-white text-lg font-bold">{focusedStream.displayName}</h2>
                  <p className="text-zinc-400 text-sm mt-1 max-w-md">{focusedStream.title}</p>
                  <p className="text-zinc-500 text-xs mt-3">
                    {focusedStream.watchers || focusedStream.watcherIds?.length || 0} watching
                  </p>
                  <p className="text-zinc-600 text-[11px] mt-4 max-w-sm">
                    {focusedStream.ingestConnected
                      ? (focusedStream.note || 'Ingest connected — waiting for HLS URL on this listing.')
                      : (focusedStream.note || 'Lobby only — host can share camera/screen until RTMP/HLS ingest is connected.')}
                  </p>
                </>
              ) : null}
              {sharing ? (
                <p className="absolute bottom-3 left-3 right-3 text-[11px] text-white/80 bg-black/50 px-2 py-1">
                  Preview on this device only until ingest is connected.
                </p>
              ) : null}
              {showHls && hlsError ? (
                <p className="absolute bottom-3 left-3 right-3 text-[11px] text-amber-200/90 bg-black/60 px-2 py-1">
                  {hlsError}
                </p>
              ) : null}
            </div>
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800">
              <div className="text-sm text-zinc-400">
                <span className="text-zinc-200 font-semibold">@{focusedStream.handle}</span>
                {subCount > 0 ? <span> · {subCount} followers</span> : null}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {isAuthenticated && user?.id === focusedStream.userId ? (
                  <>
                    <button type="button" onClick={shareCamera} className="h-9 px-3 bg-white/10 text-xs font-semibold text-white">
                      Camera
                    </button>
                    <button type="button" onClick={shareScreen} className="h-9 px-3 bg-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                      <MonitorUp className="h-4 w-4" /> Screen
                    </button>
                    {screenError ? <p className="w-full text-[11px] text-red-400">{screenError}</p> : null}
                  </>
                ) : null}
                <button type="button" onClick={() => onFocusStream?.(null)} className="h-9 px-3 border border-zinc-700 text-xs text-zinc-300">
                  Back
                </button>
                <FollowButton creatorId={focusedStream.userId} handle={focusedStream.handle} onOpenAuth={onOpenAuth} />
              </div>
            </div>
          </div>
        ) : null}

        {focusedStream ? (
          <LiveHostTools focusedStream={focusedStream} liveNow={liveNow} onOpenCash={() => setCashOpen(true)} />
        ) : null}

        {cashOpen ? (
          <div className="border border-zinc-800 bg-[#121218] p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-white">Buy Coins</p>
              <button type="button" className="text-xs text-zinc-400" onClick={() => setCashOpen(false)}>Close</button>
            </div>
            <CalabiCashShop compact />
          </div>
        ) : null}

        {/* Homepage-style shelves of livestreams */}
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-white tracking-tight">On now</h2>
            <p className="text-[11px] text-zinc-500">Go live from Create (+)</p>
          </div>

          {followingLive.length === 0 ? (
            <div className="border border-zinc-800/80 bg-[#0a0a0c] px-6 py-20 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center">
                <Radio className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-200">Quiet right now</p>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Livestreams show up here like Recommended — start from Create when you’re ready.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {followingLive.map((s) => (
                <button key={s.userId} type="button" onClick={() => selectStream(s)} className="text-left group">
                  <div
                    className={cn(
                      'relative aspect-video overflow-hidden bg-[#121018]',
                      focusedStream?.userId === s.userId ? 'ring-2 ring-white' : ''
                    )}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#3f1515_0%,#0c0c10_55%,#101018_100%)]" />
                    <div className="absolute inset-0 opacity-40 bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.06)_50%,transparent_60%)] group-hover:opacity-70 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-14 w-14 rounded-full bg-black/50 border border-white/25 flex items-center justify-center text-xl font-bold text-white">
                        {(s.displayName || s.handle || '?')[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className={cn(
                      'absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-white text-[11px] font-bold uppercase',
                      isOnAir(s) ? 'bg-[#eb0400]' : 'bg-amber-600'
                    )}>
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      {liveBadgeLabel(s)}
                    </span>
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/80 text-[11px] text-white">
                      {watchingLabel(s.watchers || s.watcherIds?.length || 0)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-white line-clamp-2 group-hover:text-zinc-200">{s.title || 'Live'}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {s.displayName || s.handle}
                    {s.category ? ` · ${s.category}` : ''}
                  </p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{formatElapsed(s.startedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {liveNow.length > 4 ? (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">More streams</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 chip-scroll">
              {liveNow.slice(4).map((s) => (
                <button
                  key={`more_${s.userId}`}
                  type="button"
                  onClick={() => selectStream(s)}
                  className="w-[260px] sm:w-[280px] shrink-0 text-left"
                >
                  <div className="relative aspect-video overflow-hidden bg-[#121018]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2a1518] to-[#0c0c14]" />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#eb0400] text-white text-[10px] font-bold uppercase">Live</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white line-clamp-1">{s.title}</p>
                  <p className="text-xs text-zinc-500">{s.displayName || s.handle}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <Footer onNavigate={onNavigate} />
      </div>
    </div>
  )
}
