import { Radio, Key, Copy, Check, Play, Square } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'

function ensureStreamKey(userId) {
  const keyName = `stream_key_${userId || 'anon'}`
  let key = lsGet(keyName, null)
  if (!key) {
    key = `clips_live_${Math.random().toString(36).slice(2, 12)}`
    lsSet(keyName, key)
  }
  return key
}

export default function LiveView({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const approved = user?.creatorStatus === 'approved'
  const [copied, setCopied] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [title, setTitle] = useState('')
  const streamKey = isAuthenticated && approved ? ensureStreamKey(user?.id) : null
  const rtmpUrl = 'rtmp://ingest.clips.app/live'

  useEffect(() => {
    if (!user?.id) return
    const state = lsGet(`live_state_${user.id}`, null)
    if (state?.isLive) {
      setIsLive(true)
      setTitle(state.title || '')
    }
  }, [user?.id])

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
  }

  const endLive = () => {
    if (!user?.id) return
    lsSet(`live_state_${user.id}`, { isLive: false })
    lsSet('live_board', lsGet('live_board', []).filter((b) => b.userId !== user.id))
    setIsLive(false)
  }

  const liveNow = lsGet('live_board', []).filter((b) => b.isLive)

  return (
    <div className="p-4 md:p-6 max-w-[1000px] mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-[#007ACC]">Live</h1>
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-10 text-center">
        <Radio className="h-6 w-6 text-[#007ACC] mx-auto" />
        {liveNow.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-200">No one is live</p>
        ) : (
          liveNow.map((s) => (
            <div key={s.userId} className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-left">
              <span className="text-red-400 text-xs">LIVE</span>
              <p className="text-sm text-zinc-100">{s.title}</p>
              <p className="text-xs text-zinc-500">@{s.handle}</p>
            </div>
          ))
        )}
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-zinc-400">
          <button type="button" onClick={onOpenAuth} className="text-[#007ACC]">Sign in</button> to go live after approval.
        </p>
      ) : !approved ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5">
          <p className="text-sm text-zinc-200">Live requires approved creator status.</p>
          <button type="button" onClick={() => onNavigate?.('creator-apply')} className="mt-3 h-10 px-4 rounded-lg bg-[#007ACC] text-white text-sm">
            Apply to become a creator
          </button>
        </div>
      ) : (
        <section className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2"><Key className="h-4 w-4 text-[#007ACC]" /> Go live</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isLive} placeholder="Stream title" className="w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100" />
          <code className="block text-xs bg-[#0b0b0f] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300">{rtmpUrl}</code>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-[#0b0b0f] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 break-all">{streamKey}</code>
            <button type="button" onClick={() => copy(streamKey, 'key')} className="h-9 w-9 border border-zinc-700 rounded-lg flex items-center justify-center text-[#007ACC]">
              {copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {!isLive ? (
            <button type="button" onClick={goLive} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-red-600 text-white text-sm"><Play className="h-4 w-4" /> Go live</button>
          ) : (
            <button type="button" onClick={endLive} className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-zinc-600 text-zinc-200 text-sm"><Square className="h-4 w-4" /> End stream</button>
          )}
        </section>
      )}
    </div>
  )
}
