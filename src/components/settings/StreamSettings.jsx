import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../../lib/streamSettings'
import { ensureStreamKey } from '../../lib/streamKeys'
import { getVodChannel, setVodChannel } from '../../lib/vods'
import { getObsConnectInfo } from '../../lib/liveIngest'
import { provisionCloudflareLive } from '../../lib/cloudflareLive'
import BrowserLiveGo from '../studio/BrowserLiveGo'

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-2 items-stretch">
        <code className="flex-1 min-w-0 text-xs break-all text-zinc-200 bg-[#0f0f0f] border border-[#272727] rounded-lg px-3 py-2">{value}</code>
        <button type="button" className="h-auto px-3 rounded-lg bg-white text-black text-xs font-semibold shrink-0" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  )
}

export default function StreamSettings() {
  const { user } = useAuth()
  const initial = getStreamSettings(user?.id)
  const vod = getVodChannel(user?.id)
  const [latency, setLatency] = useState(initial.latency || 'low')
  const [quality, setQuality] = useState(initial.defaultQuality || '720p30')
  const [title, setTitle] = useState(initial.streamTitleTemplate || '')
  const [vodOn, setVodOn] = useState(!!vod.enabled)
  const [vodHandle, setVodHandle] = useState(vod.handle || (user?.handle ? `${user.handle}vods` : ''))
  const [autoPub, setAutoPub] = useState(!!vod.autoPublish)
  const [vis, setVis] = useState(vod.visibility || 'private')
  const [saved, setSaved] = useState(false)
  const [cf, setCf] = useState(null)
  const [key, setKey] = useState(() => (user?.id ? ensureStreamKey(user.id) : ''))

  const obs = getObsConnectInfo(user?.id)
  const server = (cf?.ok && cf.rtmpsUrl) || obs.serverUrl || ''
  const streamKey = (cf?.ok && cf.streamKey) || key || obs.streamKey || ''
  const hls = (cf?.ok && cf.hlsUrl) || (obs.hlsBase && streamKey ? `${obs.hlsBase.replace(/\/$/, '')}/${encodeURIComponent(streamKey)}/index.m3u8` : '')

  useEffect(() => { if (user?.id) setKey(ensureStreamKey(user.id)) }, [user?.id])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await provisionCloudflareLive()
      if (!cancelled) setCf(res)
    })()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    setStreamSettings(user.id, { latency, defaultQuality: quality, streamTitleTemplate: title, storePastBroadcasts: true, autoPublishVod: autoPub, vodVisibility: vis })
    setVodChannel(user.id, { enabled: vodOn, handle: vodHandle, autoPublish: autoPub, visibility: vis }, user)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [user?.id, latency, quality, title, vodOn, vodHandle, autoPub, vis])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Stream & OBS</h1>
        <p className="mt-1 text-sm text-zinc-500">Go live in the browser, or paste Server + key into OBS.</p>
      </div>

      <section className="rounded-xl border border-[#272727] bg-[#18181f] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Go live from Calabi</p>
        <p className="text-[11px] text-zinc-500">Uses this device camera. Stay on the page. Same server as OBS.</p>
        <BrowserLiveGo />
      </section>

      <section className="rounded-xl border border-[#272727] bg-[#18181f] p-4 space-y-4">
        <p className="text-sm font-semibold text-white">Connect OBS</p>
        <p className="text-[11px] text-zinc-500">{obs.statusNote}</p>
        <div className="rounded-lg border border-[#272727] bg-[#0f0f0f] p-3 space-y-3">
          <CopyField label="Server" value={server || 'Add VITE_LIVE_RTMP_URL on Render'} />
          <CopyField label="Stream key" value={user?.id ? streamKey : 'Sign in to get a key'} />
          {hls ? <CopyField label="Viewer HLS" value={hls} /> : null}
        </div>
      </section>

      <section className="rounded-xl border border-[#272727] bg-[#18181f] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Second channel for VODs</p>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={vodOn} onChange={(e) => setVodOn(e.target.checked)} /> Enable VOD channel
        </label>
        <input value={vodHandle} onChange={(e) => setVodHandle(e.target.value)} className="max-w-xs h-10 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-white" />
        <select value={vis} onChange={(e) => setVis(e.target.value)} className="max-w-xs h-10 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-white">
          <option value="private">Keep private</option>
          <option value="public">Public on VOD channel</option>
        </select>
      </section>
    </div>
  )
}
