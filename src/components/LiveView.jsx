import { useState, useEffect, useCallback, useRef } from 'react'
import { Radio, MonitorUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet } from '../lib/storage'
import { pullLiveBoard } from '../lib/liveBoardSync'
import { listOnAirBoard, listLobbyOnlyBoard, liveBadgeLabel, isOnAir } from '../lib/liveStatus'
import { getSubscriberCount } from '../lib/engagement'
import FollowButton from './FollowButton'
import { cn } from '../lib/utils'
import LiveHostTools from './LiveHostTools'
import CalabiCashShop from './CalabiCashShop'
import { filterCss, getStreamFilter } from '../lib/streamFilters'
import { liveIngestConnected, liveListingBlockedReason } from '../lib/liveIngest'
import Footer from './Footer'
import EnableNotificationsButton from './EnableNotificationsButton'

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

export default function LiveView({ focusedStream, onFocusStream, onOpenAuth, onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [liveNow, setLiveNow] = useState(() => listOnAirBoard(lsGet('live_board', []) || []))
  const [lobbyOnly, setLobbyOnly] = useState(() => listLobbyOnlyBoard(lsGet('live_board', []) || []))
  const [, setTick] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [screenError, setScreenError] = useState('')
  const [cashOpen, setCashOpen] = useState(false)
  const [hlsError, setHlsError] = useState('')
  const screenRef = useRef(null)
  const hlsRef = useRef(null)

  const readBoards = () => {
    const board = lsGet('live_board', []) || []
    setLiveNow(listOnAirBoard(board))
    setLobbyOnly(listLobbyOnlyBoard(board))
  }

  const refreshLiveBoard = useCallback(() => {
    readBoards()
    pullLiveBoard().then(() => {
      readBoards()
    }).catch(() => {})
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

  useEffect(() => {
    const el = hlsRef.current
    const url = String(focusedStream?.hlsUrl || '').trim()
    setHlsError('')
    if (!el) return undefined
    if (sharing || !url) {
      el.removeAttribute('src')
      el.load?.()
      return undefined
    }
    el.src = url
    const onErr = () => setHlsError('Stream not reachable yet (server offline or blocked http on https).')
    el.addEventListener('error', onErr)
    el.play?.().catch(() => {})
    return () => {
      el.removeEventListener('error', onErr)
      el.removeAttribute('src')
      el.load?.()
    }
  }, [focusedStream?.hlsUrl, focusedStream?.userId, sharing])

  const shareCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
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
    } catch (err) {
      setScreenError(err?.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Could not open camera.')
    }
  }

  const shareScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
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
    } catch (err) {
      setScreenError(err?.name === 'NotAllowedError' ? 'Screen share denied.' : 'Could not share screen.')
    }
  }

  const selectStream = (entry) => {
    if (!entry) return
    onFocusStream?.(entry)
  }
  const subCount = focusedStream?.userId ? getSubscriberCount(focusedStream.userId) : 0
  const filterStyle = user?.id ? filterCss(getStreamFilter(user.id).filterId) : ''
  const ingestOk = liveIngestConnected()
  const showHls = !!(focusedStream?.hlsUrl && !sharing)

  return (
    <div className="w-full min-h-full bg-black">
      <div className="relative px-4 md:px-6 py-4 max-w-[1600px] mx-auto w-full space-y-8">
        {!ingestOk ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-zinc-800/80 bg-[#0a0a0c] px-3 py-2">
            <p className="text-[11px] text-zinc-500">{liveListingBlockedReason()}</p>
            <EnableNotificationsButton compact variant="ghost" />
          </div>
        ) : null}

        {focusedStream ? (
          <div className="overflow-hidden border border-zinc-800/80 bg-[#0a0a0c]">
            <div className="relative aspect-video w-full bg-black flex flex-col items-center justify-center text-center p-6">
              <video ref={screenRef} className={cn('absolute inset-0 h-full w-full object-contain bg-black', sharing ? '' : 'hidden')} style={filterStyle ? { filter: filterStyle } : undefined} muted playsInline autoPlay />
              <video ref={hlsRef} className={cn('absolute inset-0 h-full w-full object-contain bg-black', showHls ? '' : 'hidden')} playsInline autoPlay controls />
              {!sharing && !showHls ? (
                <>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eb0400] text-white font-extrabold text-xs uppercase tracking-wider">
                    <Radio className="h-3.5 w-3.5" />
                    {liveBadgeLabel(focusedStream)}
                  </span>
                  <h2 className="text-white text-lg font-bold mt-4">{focusedStream.displayName}</h2>
                  <p className="text-zinc-400 text-sm mt-1">{focusedStream.title}</p>
                  {hlsError ? <p className="text-[11px] text-amber-200 mt-3">{hlsError}</p> : null}
                </>
              ) : null}
              {showHls && hlsError ? (
                <p className="absolute bottom-3 left-3 right-3 text-[11px] text-amber-200/90 bg-black/60 px-2 py-1">{hlsError}</p>
              ) : null}
            </div>
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800">
              <span className="text-zinc-200 font-semibold text-sm">@{focusedStream.handle}</span>
              <div className="flex items-center gap-2">
                {isAuthenticated && user?.id === focusedStream.userId ? (
                  <>
                    <button type="button" onClick={shareCamera} className="h-9 px-3 bg-white/10 text-xs font-semibold text-white">Camera</button>
                    <button type="button" onClick={shareScreen} className="h-9 px-3 bg-white/10 text-xs font-semibold text-white">Screen</button>
                    {screenError ? <p className="w-full text-[11px] text-red-400">{screenError}</p> : null}
                  </>
                ) : null}
                <button type="button" onClick={() => onFocusStream?.(null)} className="h-9 px-3 border border-zinc-700 text-xs text-zinc-300">Back</button>
                <FollowButton creatorId={focusedStream.userId} handle={focusedStream.handle} onOpenAuth={onOpenAuth} />
              </div>
            </div>
          </div>
        ) : null}

        {focusedStream ? <LiveHostTools focusedStream={focusedStream} liveNow={liveNow} onOpenCash={() => setCashOpen(true)} /> : null}
        {cashOpen ? (
          <div className="border border-zinc-800 bg-[#121218] p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-white">Buy Coins</p>
              <button type="button" className="text-xs text-zinc-400" onClick={() => setCashOpen(false)}>Close</button>
            </div>
            <CalabiCashShop compact />
          </div>
        ) : null}

        <section>
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-white tracking-tight">On now</h2>
            <EnableNotificationsButton compact variant="ghost" />
          </div>
          {liveNow.length === 0 ? (
            <div className="border border-zinc-800/80 bg-[#0a0a0c] px-6 py-20 text-center">
              <p className="text-sm font-medium text-zinc-200">Quiet right now</p>
              <p className="text-xs text-zinc-500 mt-1">Stale listings drop after 12 hours. A URL is not a live stream.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {liveNow.map((s) => (
                <button key={s.userId} type="button" onClick={() => selectStream(s)} className="text-left group">
                  <div className={cn('relative aspect-video overflow-hidden bg-[#121018]', focusedStream?.userId === s.userId ? 'ring-2 ring-white' : '')}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-14 w-14 rounded-full bg-black/50 border border-white/25 flex items-center justify-center text-xl font-bold text-white">
                        {(s.displayName || s.handle || '?')[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className={cn('absolute top-2 left-2 px-1.5 py-0.5 text-white text-[11px] font-bold uppercase', isOnAir(s) ? 'bg-[#eb0400]' : 'bg-amber-600')}>
                      {liveBadgeLabel(s)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-white">{s.title || 'Live'}</p>
                  <p className="text-xs text-zinc-400">{s.displayName || s.handle}</p>
                  <p className="text-[11px] text-zinc-600">{formatElapsed(s.startedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </section>
        {lobbyOnly.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-white tracking-tight mb-4">Listed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {lobbyOnly.map((s) => (
                <button key={s.userId} type="button" onClick={() => selectStream(s)} className="text-left group">
                  <div className={cn('relative aspect-video overflow-hidden bg-[#121018]', focusedStream?.userId === s.userId ? 'ring-2 ring-white' : '')}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-14 w-14 rounded-full bg-black/50 border border-white/25 flex items-center justify-center text-xl font-bold text-white">
                        {(s.displayName || s.handle || '?')[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 text-white text-[11px] font-bold uppercase bg-amber-600">
                      Lobby
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-white">{s.title || 'Lobby'}</p>
                  <p className="text-xs text-zinc-400">{s.displayName || s.handle}</p>
                  <p className="text-[11px] text-zinc-600">{formatElapsed(s.startedAt)}</p>
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
