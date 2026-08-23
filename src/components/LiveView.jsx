import { useState, useEffect, useCallback } from 'react'
import { Radio, Key, Copy, Check, Play, Square, Heart, Gift } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'
import { toggleSubscribe, isSubscribed, getSubscriberCount } from '../lib/engagement'
import { notifyFollowersWentLive } from '../lib/notifications'
import { cn } from '../lib/utils'

function ensureStreamKey(userId) {
  const keyName = `stream_key_${userId || 'anon'}`
  let key = lsGet(keyName, null)
  if (!key) {
    key = `clips_live_${Math.random().toString(36).slice(2, 12)}`
    lsSet(keyName, key)
  }
  return key
}

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

export default function LiveView({ onOpenCheckout, focusedStream, onFocusStream }) {
  const { user, isAuthenticated } = useAuth()
  const approved = user?.creatorStatus === 'approved'

  const [copied, setCopied] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [title, setTitle] = useState('')
  const [liveNow, setLiveNow] = useState(() => (lsGet('live_board', []) || []).filter((b) => b.isLive))
  const [, setTick] = useState(0)

  const streamKey = isAuthenticated && approved ? ensureStreamKey(user?.id) : null
  const rtmpUrl = 'rtmp://ingest.clips.app/live'

  const refreshLiveBoard = useCallback(() => {
    setLiveNow((lsGet('live_board', []) || []).filter((b) => b.isLive))
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const state = lsGet(`live_state_${user.id}`, null)
    if (state?.isLive) {
      setIsLive(true)
      setTitle(state.title || '')
    }
  }, [user?.id])

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
    if (!approved || !user?.id) return
    const payload = {
      isLive: true,
      title: title.trim() || 'Live on Clips',
      startedAt: new Date().toISOString(),
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      streamKey,
    }
    lsSet(`live_state_${user.id}`, payload)
    const board = lsGet('live_board', [])
    const without = board.filter((b) => b.userId !== user.id)
    without.unshift(payload)
    lsSet('live_board', without)
    setIsLive(true)
    refreshLiveBoard()
    notifyFollowersWentLive({
      creatorId: user.id,
      handle: user.handle,
      title: payload.title,
    })
  }

  const endLive = () => {
    if (!user?.id) return
    lsSet(`live_state_${user.id}`, { isLive: false })
    lsSet('live_board', lsGet('live_board', []).filter((b) => b.userId !== user.id))
    setIsLive(false)
    refreshLiveBoard()
    if (focusedStream?.userId === user.id) onFocusStream?.(null)
  }

  const selectStream = (entry) => {
    onFocusStream?.(entry)
  }

  const handleFollow = () => {
    if (!isAuthenticated || !focusedStream?.userId) return
    toggleSubscribe(user.id, focusedStream.userId)
    setTick((t) => t + 1)
  }

  const following = isAuthenticated && focusedStream?.userId ? isSubscribed(user.id, focusedStream.userId) : false
  const subCount = focusedStream?.userId ? getSubscriberCount(focusedStream.userId) : 0

  return (
    <div className="p-4 md:p-6 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white flex items-center gap-2">
          <Radio className="h-5 w-5 text-white" />
          Live
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Real broadcasts from Clips creators on this device. No demo streams.</p>
      </div>

      {/* Focused Stage — only renders for a real selected live stream */}
      {focusedStream && (
        <div className="rounded-2xl border border-[#23232c] bg-[#121218] overflow-hidden">
          <div className="relative aspect-video w-full bg-gradient-to-br from-[#1a1a24] to-[#0c0c10] flex flex-col items-center justify-center text-center p-6">
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eb0400] text-white font-extrabold text-xs uppercase tracking-wider live-badge-glow">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                LIVE
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
          </div>
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#23232c]">
            <div className="text-sm text-zinc-400">
              <span className="text-zinc-200 font-semibold">@{focusedStream.handle}</span>
              {subCount > 0 && <span> · {subCount} followers</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFollow}
                disabled={!isAuthenticated || focusedStream.userId === user?.id}
                className={cn(
                  'flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold transition-all disabled:opacity-40',
                  following ? 'bg-[#1f1f28] border border-[#2e2e3b] text-zinc-300' : 'bg-white text-black'
                )}
              >
                <Heart className={cn('h-3.5 w-3.5', following && 'fill-current text-red-400')} />
                {following ? 'Following' : 'Follow'}
              </button>
              <button
                type="button"
                onClick={() => onOpenCheckout?.(focusedStream.userId, focusedStream.handle)}
                disabled={!isAuthenticated || focusedStream.userId === user?.id}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold bg-white text-black disabled:opacity-40"
              >
                <Gift className="h-3.5 w-3.5" />
                Subscribe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real "Live Now" list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Live now ({liveNow.length})</h2>
        </div>

        {liveNow.length === 0 ? (
          <div className="rounded-2xl border border-[#23232c] bg-[#121218] px-6 py-10 text-center">
            <Radio className="h-6 w-6 mx-auto text-white" />
            <p className="mt-4 text-sm text-zinc-200">No one is live right now</p>
            <p className="mt-1 text-xs text-zinc-500">Start a broadcast from the + button. Streams appear here when someone is live.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveNow.map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => selectStream(s)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-colors',
                  focusedStream?.userId === s.userId
                    ? 'border-white bg-[#181822]'
                    : 'border-[#23232c] bg-[#121218] hover:border-[#3b3b47]'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-[#eb0400] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">LIVE</span>
                  <span className="text-[10px] text-zinc-500 ml-auto">{formatElapsed(s.startedAt)}</span>
                </div>
                <p className="text-sm text-zinc-100 font-medium truncate">{s.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">@{s.handle}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {isAuthenticated && approved && (
        <section className="rounded-2xl border border-[#23232c] bg-[#121218] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Key className="h-4 w-4 text-white" /> Go live
          </h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLive}
            placeholder="Stream title"
            className="w-full h-10 rounded-lg border border-[#272734] bg-[#0e0e10] px-3 text-sm text-zinc-100"
          />
          <code className="block text-xs bg-[#0e0e10] border border-[#272734] rounded-lg px-3 py-2 text-zinc-300">{rtmpUrl}</code>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-[#0e0e10] border border-[#272734] rounded-lg px-3 py-2 text-zinc-300 break-all">{streamKey}</code>
            <button
              type="button"
              onClick={() => copy(streamKey, 'key')}
              className="h-9 w-9 border border-[#272734] rounded-lg flex items-center justify-center text-white"
            >
              {copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {!isLive ? (
            <button type="button" onClick={goLive} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-red-600 text-white text-sm font-medium">
              <Play className="h-4 w-4" /> Go live
            </button>
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
