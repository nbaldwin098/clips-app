import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../../lib/streamSettings'
import { getVodChannel, setVodChannel } from '../../lib/vods'
import { getObsConnectInfo } from '../../lib/liveIngest'
import { provisionCloudflareLive } from '../../lib/cloudflareLive'

function CopyField({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-2 items-stretch">
        <code className={`flex-1 min-w-0 text-xs break-all text-zinc-200 bg-[#18181f] border border-[#272727] rounded-lg px-3 py-2 ${mono ? '' : ''}`}>
          {value}
        </code>
        <button
          type="button"
          className="h-auto px-3 rounded-lg bg-white text-black text-xs font-semibold shrink-0"
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
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
  const [cfNote, setCfNote] = useState('Checking Cloudflare Stream…')

  const obs = getObsConnectInfo(user?.id)
  const ready = !!(cf?.ok && cf.rtmpsUrl && cf.streamKey)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await provisionCloudflareLive()
      if (cancelled) return
      setCf(res)
      if (res.ok) setCfNote('Cloudflare Stream is provisioned for this account.')
      else if (res.error === 'cloudflare_not_configured') setCfNote('Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN on Supabase Edge, then deploy live-ingest.')
      else if (res.error === 'not_deployed') setCfNote('Deploy the live-ingest Edge Function.')
      else if (res.error === 'sign_in') setCfNote('Sign in to get an OBS key.')
      else setCfNote(res.message || 'Cloudflare Stream is not ready. Window share still works.')
    })()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    setStreamSettings(user.id, {
      latency,
      defaultQuality: quality,
      streamTitleTemplate: title,
      storePastBroadcasts: true,
      autoPublishVod: autoPub,
      vodVisibility: vis,
    })
    setVodChannel(user.id, {
      enabled: vodOn,
      handle: vodHandle,
      autoPublish: autoPub,
      visibility: vis,
    }, user)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [user?.id, latency, quality, title, vodOn, vodHandle, autoPub, vis])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Stream & OBS</h1>
        <p className="mt-1 text-sm text-zinc-500">
          OBS pushes to Cloudflare Stream. Viewers play HLS from their CDN. Window share still works if Stream is not set up.
        </p>
      </div>

      <section className="rounded-xl border border-[#272727] bg-[#18181f] p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">Connect OBS</p>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{cfNote}</p>
          </div>
          <a
            href={obs.obsDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="h-9 px-3 inline-flex items-center rounded-lg bg-white text-black text-xs font-semibold"
          >
            Download OBS
          </a>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={`px-2 py-1 rounded border ${ready ? 'border-emerald-700 text-emerald-300' : 'border-[#272727] text-zinc-500'}`}>
            Stream {ready ? 'ready' : 'not ready'}
          </span>
        </div>

        {ready ? (
          <div className="rounded-lg border border-[#272727] bg-[#0f0f0f] p-3 space-y-3">
            <p className="text-xs font-semibold text-zinc-300">OBS → Settings → Stream → Service: Custom</p>
            <CopyField label="Server" value={cf.rtmpsUrl} />
            <CopyField label="Stream key" value={cf.streamKey} />
            <CopyField label="Viewer HLS (test on your phone)" value={cf.hlsUrl} />
          </div>
        ) : (
          <p className="text-xs text-zinc-500 leading-relaxed">
            Until Stream is configured, use Live → window share. Setup: docs/CLOUDFLARE_STREAM.md
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[#272727] bg-[#18181f] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Second channel for VODs</p>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={vodOn} onChange={(e) => setVodOn(e.target.checked)} />
          Enable VOD channel
        </label>
        <label className="block max-w-xs text-xs text-zinc-500">
          VOD handle
          <input value={vodHandle} onChange={(e) => setVodHandle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-white" />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={autoPub} onChange={(e) => setAutoPub(e.target.checked)} />
          Auto-post VODs to that channel
        </label>
        <select value={vis} onChange={(e) => setVis(e.target.value)} className="max-w-xs h-10 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-white">
          <option value="private">Keep private</option>
          <option value="public">Public on VOD channel</option>
        </select>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Preferences on this device</h2>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-500">Preferred quality</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-zinc-100">
            <option value="1080p30">1080p30</option>
            <option value="720p30">720p30</option>
            <option value="480p30">480p30</option>
          </select>
        </label>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-500">Latency preference</span>
          <select value={latency} onChange={(e) => setLatency(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-zinc-100">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <label className="block max-w-md">
          <span className="text-xs font-medium text-zinc-500">Title template</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-zinc-100" placeholder="Optional" />
        </label>
        <p className="text-[11px] text-zinc-500">{saved ? 'Saved' : 'Saved as you change these.'}</p>
      </section>
    </div>
  )
}
