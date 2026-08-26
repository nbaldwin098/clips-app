import { useState, useEffect, useCallback, useRef } from 'react'
import { Radio, Key, Copy, Check, Play, Square, MonitorUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'
import { getSubscriberCount } from '../lib/engagement'
import FollowButton from './FollowButton'
import { notifyFollowersWentLive } from '../lib/notifications'
import { pushLiveLobby, endLiveLobby } from '../lib/graphSync'
import { cn } from '../lib/utils'
import { LIVE_CATEGORIES } from '../lib/mediaMeta'
import { watchingLabel } from '../lib/uiFormat'
import { ensureStreamKey } from '../lib/streamKeys'
import { archiveEndedLive } from '../lib/vods'
import { canGoLive } from '../lib/trustSafety'
import VideoInStreamAd from './VideoInStreamAd'
import { useLiveStreamAds } from '../hooks/useLiveStreamAds'
import { liveListingBlockedReason, liveIngestConnected } from '../lib/liveIngest'
import {
  cueLiveAd,
  snoozeLiveAds,
  liveAdsSnoozed,
  manualAdCooldownRemaining,
  liveAdTimeUsedInHour,
  LIVE_SNOOZE_SEC,
  MANUAL_AD_BREAKS,
  manualAdCooldownSec,
  LIVE_HOURLY_AD_CAP_SEC,
} from '../lib/liveAds'

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

export default function LiveView({ onOpenCheckout, focusedStream, onFocusStream, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const canHost = isAuthenticated && canGoLive(user)

  const [copied, setCopied] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Just chatting')
  const [liveNow, setLiveNow] = useState(() => (lsGet('live_board', []) || []).filter((b) => b.isLive))
  const [, setTick] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [screenError, setScreenError] = useState('')
  const [goLiveError, setGoLiveError] = useState('')
  const [adNote, setAdNote] = useState('')
  const [, bumpAdUi] = useState(0)
  const refreshAdUi = () => bumpAdUi((n) => n + 1)
  const screenRef = useRef(null)

  const [draftReady, setDraftReady] = useState(false)

  const streamKey = canHost && user?.id ? ensureStreamKey(user.id) : null

  const refreshLiveBoard = useCallback(() => {
    setLiveNow((lsGet('live_board', []) || []).filter((b) => b.isLive))
  }, [])

  useEffect(() => {
    if (!focusedStream?.userId) return
    const row = liveNow.find((s) => s.userId === focusedStream.userId)
    if (!row) return
    if ((row.watchers || 0) === (focusedStream.watchers || 0)) return
    onFocusStream?.(row)
  }, [liveNow, focusedStream, onFocusStream])

  useEffect(() => {
    if (!user?.id) return
    const state = lsGet(`live_state_${user.id}`, null)
    const draft = lsGet(`live_draft_${user.id}`, null)
    if (state?.isLive) {
      setIsLive(true)
      setTitle(state.title || '')
      setCategory(state.category || 'Just chatting')
    } else if (draft) {
      setTitle(draft.title || '')
      setCategory(draft.category || 'Just chatting')
    }
    setDraftReady(true)
  }, [user?.id])

  useEffect(() => {
    if (!draftReady || !user?.id || isLive) return
    lsSet(`live_draft_${user.id}`, { title, category })
  }, [draftReady, user?.id, title, category, isLive])

  // Real-data poll: picks up live status changes from this device (e.g. another tab going live).
  useEffect(() => {
    refreshLiveBoard()
    const interval = setInterval(() => {
      refreshLiveBoard()
      setTick((t) => t + 1) // re-render to refresh "started Xm ago" labels
    }, 15000)
    return () => clearInterval(interval)
  }, [refreshLiveBoard])

  // Clear focused stream when leaving this view.
  useEffect(() => {
    return () => onFocusStream?.(null)
  }, [onFocusStream])

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  const goLive = () => {
    if (!canHost || !user?.id) return
    if (!liveIngestConnected()) {
      setGoLiveError(liveListingBlockedReason())
      return
    }
    setGoLiveError('')
    const payload = {
      isLive: true,
      title: title.trim() || 'Live on calabi',
      category,
      startedAt: new Date().toISOString(),
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      streamKey,
      watcherIds: [],
      watchers: 0,
    }
    lsSet(`live_state_${user.id}`, payload)
    const board = lsGet('live_board', [])
    const without = board.filter((b) => b.userId !== user.id)
    without.unshift(payload)
    lsSet('live_board', without)
    setIsLive(true)
    refreshLiveBoard()
    pushLiveLobby(payload)
    notifyFollowersWentLive({
      creatorId: user.id,
      handle: user.handle,
      title: payload.title,
    })
  }

  const endLive = () => {
    if (!user?.id) return
    const prev = lsGet(`live_state_${user.id}`, null)
    if (prev?.isLive) archiveEndedLive(user, prev)
    lsSet(`live_state_${user.id}`, { isLive: false })
    lsSet('live_board', lsGet('live_board', []).filter((b) => b.userId !== user.id))
    setIsLive(false)
    refreshLiveBoard()
    if (focusedStream?.userId === user.id) onFocusStream?.(null)
    endLiveLobby(user.id)
  }

  const selectStream = (entry) => {
    onFocusStream?.(entry)
  }

  const shareScreen = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setScreenError('Screen share is not supported in this browser.')
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
      setScreenError(err?.name === 'NotAllowedError' ? 'Screen share permission denied.' : 'Could not share screen.')
    }
  }

  const subCount = focusedStream?.userId ? getSubscriberCount(focusedStream.userId) : 0
  const isHost = Boolean(user?.id && focusedStream?.userId && user.id === focusedStream.userId)
  const liveAds = useLiveStreamAds(focusedStream?.userId || null, { isHost })
  const adStateId = focusedStream?.userId
  const snoozed = adStateId ? liveAdsSnoozed(adStateId) : false
  const manualWait = adStateId ? manualAdCooldownRemaining(adStateId) : 0
  const adUsedMin = adStateId ? Math.round(liveAdTimeUsedInHour(adStateId) / 60) : 0

  const runManualAd = (breakSec) => {
    if (!adStateId) return
    const res = cueLiveAd(adStateId, 'live-creator', { kind: 'manual', breakSec })
    const cd = manualAdCooldownSec(breakSec)
    setAdNote(res.ok
      ? `Manual ${breakSec}s ad queued. Cooldown after it ends: ${Math.round(cd / 60)}m ${cd % 60 ? `${cd % 60}s` : ''}.`
      : (res.error || 'Could not run ad.'))
    refreshAdUi()
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Live</h1>
        <p className="mt-1 text-sm text-[#aaa]">
          Live video ingest is not connected yet. Lobby listings and watcher counts are approximate on this device.
        </p>
      </div>

      {/* Focused Stage — only renders for a real selected live stream */}
      {focusedStream && (
        <div className="rounded-2xl border border-[#23232c] bg-[#121218] overflow-hidden">
          <div className="relative aspect-video w-full bg-gradient-to-br from-[#1a1a24] to-[#0c0c10] flex flex-col items-center justify-center text-center p-6">
            <video ref={screenRef} className={`absolute inset-0 h-full w-full object-contain bg-black ${sharing ? '' : 'hidden'}`} muted playsInline autoPlay />
            {!sharing && (
              <>
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eb0400] text-white font-extrabold text-xs uppercase tracking-wider">
                <Radio className="h-3.5 w-3.5" />
                Live
              </span>
              <span className="px-2 py-1 rounded bg-black/50 text-zinc-300 text-xs font-medium">
                {formatElapsed(focusedStream.startedAt)}
              </span>
            </div>
            <div className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 bg-white/10 text-white border-2 border-white">
              {(focusedStream.displayName || focusedStream.handle || '?')[0]?.toUpperCase()}
            </div>
            <h2 className="text-white text-lg font-bold">{focusedStream.displayName}</h2>
            <p className="text-zinc-400 text-sm mt-1 max-w-md">{focusedStream.title}</p>
            {focusedStream.category ? <p className="text-zinc-500 text-xs mt-1">{focusedStream.category}</p> : null}
            <p className="text-zinc-400 text-xs mt-3">
              {focusedStream.watchers || focusedStream.watcherIds?.length || 0} watching
            </p>
            <p className="text-zinc-500 text-xs mt-4 max-w-lg">
              Stream health: not connected. No ingest server is receiving video. Viewers see this presence stage only — not a live picture.
            </p>
              </>
            )}
            {sharing && (
              <p className="absolute bottom-3 left-3 right-3 text-[11px] text-white/80 bg-black/50 px-2 py-1 rounded">
                This screen is only on this browser. Other viewers still see the lobby until ingest is connected.
              </p>
            )}
            {liveAds.creative ? (
              <VideoInStreamAd creative={liveAds.creative} slot={liveAds.slot} onDone={liveAds.finishAd} />
            ) : null}
          </div>
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#23232c]">
            <div className="text-sm text-zinc-400">
              <span className="text-zinc-200 font-semibold">@{focusedStream.handle}</span>
              {subCount > 0 && <span> · {subCount} followers</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isAuthenticated && user?.id === focusedStream.userId && (
                <>
                <button
                  type="button"
                  onClick={() => {
                    snoozeLiveAds(focusedStream.userId)
                    setAdNote(`All ads snoozed for ${LIVE_SNOOZE_SEC / 60} minutes.`)
                    refreshAdUi()
                  }}
                  disabled={snoozed}
                  className="h-9 px-3 rounded-full border border-zinc-700 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {snoozed ? 'Snoozed' : 'Snooze ads 5m'}
                </button>
                {MANUAL_AD_BREAKS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => runManualAd(sec)}
                    className="h-9 px-3 rounded-full bg-white text-black text-xs font-semibold"
                  >
                    {sec === 180 ? '3m ad' : `${sec}s ad`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={shareScreen}
                  className="h-9 px-3 rounded-full bg-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                >
                  <MonitorUp className="h-4 w-4" /> {sharing ? 'Sharing this PC' : 'Share this screen'}
                </button>
                {screenError ? <p className="w-full text-[11px] text-red-400">{screenError}</p> : null}
                </>
              )}
              <FollowButton creatorId={focusedStream.userId} handle={focusedStream.handle} onOpenAuth={onOpenAuth} />
            </div>
            {isAuthenticated && user?.id === focusedStream.userId ? (
              <p className="w-full text-[11px] text-zinc-600">
                Automated ads: set 1–5/hour in Stream settings.
                {manualWait > 0 ? ` Manual cooldown ${Math.ceil(manualWait / 1000)}s.` : ''}
                {` ${adUsedMin}m / ${LIVE_HOURLY_AD_CAP_SEC / 60}m ad time this hour.`}
              </p>
            ) : null}
            {adNote ? <p className="w-full text-[11px] text-zinc-500">{adNote}</p> : null}
          </div>
        </div>
      )}

      {/* Real "Live Now" list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Live channels</h2>
        </div>

        {liveNow.length === 0 ? (
          <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] px-6 py-14 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#272727] flex items-center justify-center">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <p className="mt-4 text-base font-semibold text-white">No one is live</p>
            <p className="mt-1 text-sm text-[#aaa]">Approved creators can list a lobby presence here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveNow.map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => selectStream(s)}
                className="text-left group"
              >
                <div className={cn(
                  'relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a]',
                  focusedStream?.userId === s.userId ? 'ring-2 ring-white' : ''
                )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a1a] via-[#141414] to-[#1a1a28]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="h-16 w-16 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-2xl font-bold text-white">
                      {(s.displayName || s.handle || '?')[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-[#eb0400] text-white text-[11px] font-bold uppercase">
                    Live
                  </span>
                  <span className="absolute bottom-2 left-2 rounded px-1.5 py-0.5 bg-black/80 text-[11px] text-white">
                    {watchingLabel(s.watchers || s.watcherIds?.length || 0)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-white line-clamp-1 group-hover:text-zinc-200">{s.title}</p>
                <p className="text-xs text-[#aaa]">{s.displayName || s.handle}{s.category ? ` · ${s.category}` : ''}</p>
                <p className="text-[11px] text-[#717171]">{formatElapsed(s.startedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {isAuthenticated && canHost && (
        <section className="rounded-2xl border border-[#23232c] bg-[#121218] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Key className="h-4 w-4 text-white" /> List me in the lobby
          </h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLive}
            placeholder="Stream title"
            className="w-full h-10 rounded-lg border border-[#272734] bg-[#000000] px-3 text-sm text-zinc-100"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLive}
            className="w-full h-10 rounded-lg border border-[#272734] bg-[#000000] px-3 text-sm text-zinc-100"
          >
            {LIVE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="text-[11px] text-zinc-500">
            Ingest is not connected. Listing yourself copies a VOD record when you end. The stream key is ready for later.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-[#000000] border border-[#272734] rounded-lg px-3 py-2 text-zinc-300 break-all">{streamKey}</code>
            <button
              type="button"
              onClick={() => copy(streamKey, 'key')}
              className="h-9 w-9 border border-[#272734] rounded-lg flex items-center justify-center text-white"
            >
              {copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {!isLive ? (
            <>
              {goLiveError ? <p className="text-xs text-amber-400">{goLiveError}</p> : null}
              <button
                type="button"
                onClick={goLive}
                disabled={!liveIngestConnected()}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4" /> {liveIngestConnected() ? 'List me' : 'Ingest not connected'}
              </button>
            </>
          ) : (
            <button type="button" onClick={endLive} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-zinc-600 text-zinc-200 text-sm">
              <Square className="h-4 w-4" /> End stream
            </button>
          )}
        </section>
      )}
    </div>
  )
}
