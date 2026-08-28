import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../../lib/streamSettings'
import { ensureStreamKey, rotateStreamKey } from '../../lib/streamKeys'
import { getVodChannel, setVodChannel } from '../../lib/vods'
import { getObsConnectInfo } from '../../lib/liveIngest'

function CopyField({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <div className="flex flex-wrap gap-2 items-stretch">
        <code
          className={`flex-1 min-w-0 text-xs break-all text-zinc-200 bg-white border border-neutral-200 rounded-lg px-3 py-2 ${mono ? '' : ''}`}
        >
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
  const [key, setKey] = useState(() => (user?.id ? ensureStreamKey(user.id) : ''))
  const [vodOn, setVodOn] = useState(!!vod.enabled)
  const [vodHandle, setVodHandle] = useState(vod.handle || (user?.handle ? `${user.handle}vods` : ''))
  const [autoPub, setAutoPub] = useState(!!vod.autoPublish)
  const [vis, setVis] = useState(vod.visibility || 'private')
  const [saved, setSaved] = useState(false)

  const obs = getObsConnectInfo(user?.id)

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

  useEffect(() => {
    if (user?.id) setKey(ensureStreamKey(user.id))
  }, [user?.id])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Stream & OBS</h1>
        <p className="mt-1 text-sm text-neutral-500">
          OBS Studio is free. Window share works now; Custom RTMP shows when an ingest server URL is configured.
          Ingest is only marked connected when ops set <code className="text-neutral-500">VITE_LIVE_INGEST_CONNECTED</code>.
        </p>
      </div>

      <section className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Connect OBS (free)</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              OBS Studio is free open-source software — no paid plan required.
            </p>
            <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{obs.statusNote}</p>
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
          <span className={`px-2 py-1 rounded border ${obs.ingestConnected ? 'border-emerald-700 text-emerald-300' : 'border-neutral-200 text-neutral-500'}`}>
            Ingest {obs.ingestConnected ? 'connected' : 'not connected'}
          </span>
          <span className={`px-2 py-1 rounded border ${obs.rtmpReady ? 'border-zinc-500 text-neutral-700' : 'border-neutral-200 text-zinc-600'}`}>
            RTMP {obs.rtmpReady ? 'URL set' : 'URL missing'}
          </span>
          <span className={`px-2 py-1 rounded border ${obs.hlsReady ? 'border-zinc-500 text-neutral-700' : 'border-neutral-200 text-zinc-600'}`}>
            HLS {obs.hlsReady ? 'base set' : 'base missing'}
          </span>
        </div>

        <ol className="space-y-3">
          {obs.steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="shrink-0 h-6 w-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">{s.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {obs.rtmpReady ? (
          <div className="rounded-lg border border-neutral-200 bg-white/40 p-3 space-y-3">
            <p className="text-xs font-semibold text-neutral-700">OBS → Settings → Stream → Service: Custom</p>
            <CopyField label="Server" value={obs.serverUrl} />
            <CopyField label="Stream key" value={key || obs.streamKey} />
            {!obs.ingestConnected ? (
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                RTMP fields are shown because the server URL is set, but ingest is not marked connected yet.
                Use window share for viewers until <code className="text-amber-300/90">VITE_LIVE_INGEST_CONNECTED=true</code>.
              </p>
            ) : null}
            <button
              type="button"
              className="h-9 px-3 rounded-lg border border-neutral-200 text-neutral-900 text-xs"
              onClick={() => user?.id && setKey(rotateStreamKey(user.id))}
            >
              Rotate stream key
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white/40 p-3 space-y-3">
            <p className="text-xs font-semibold text-neutral-700">Your stream key (ready for Custom RTMP later)</p>
            <CopyField label="Stream key" value={key || obs.streamKey} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-9 px-3 rounded-lg border border-neutral-200 text-neutral-900 text-xs"
                onClick={() => user?.id && setKey(rotateStreamKey(user.id))}
              >
                Rotate key
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Server URL appears here when <code className="text-neutral-500">VITE_LIVE_RTMP_URL</code> is set on the deploy
              (for example <code className="text-neutral-500">rtmp://your-ingest/live</code>). Until then, use the free window-share path above on Live.
              See <code className="text-neutral-500">docs/mediamtx.md</code>.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-neutral-900">Xbox, PS5, and PC</p>
        <ul className="text-xs text-neutral-500 space-y-2 list-disc pl-5">
          <li>
            <strong className="text-zinc-200">PC + OBS (free):</strong> Build the scene in OBS, then on Live use{' '}
            <strong className="text-zinc-200">Screen / OBS window</strong> and pick OBS (or OBS Virtual Camera).
          </li>
          <li>
            <strong className="text-zinc-200">Xbox / PS5:</strong> Use an HDMI capture card into a PC running OBS, then follow the same free share steps.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-neutral-900">Second channel for VODs</p>
        <p className="text-xs text-neutral-500">Every ended lobby is copied to Studio → VODs. Turn on a second channel if you want public VOD posts under another handle.</p>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={vodOn} onChange={(e) => setVodOn(e.target.checked)} />
          Enable VOD channel
        </label>
        <label className="block max-w-xs text-xs text-neutral-500">
          VOD handle
          <input value={vodHandle} onChange={(e) => setVodHandle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900" />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={autoPub} onChange={(e) => setAutoPub(e.target.checked)} />
          Auto-post VODs to that channel
        </label>
        <select value={vis} onChange={(e) => setVis(e.target.value)} className="max-w-xs h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900">
          <option value="private">Keep private</option>
          <option value="public">Public on VOD channel</option>
        </select>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">Preferences on this device</h2>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-neutral-500">Preferred quality</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-neutral-200 bg-[#000000] px-3 text-sm text-zinc-100">
            <option value="1080p30">1080p30</option>
            <option value="720p30">720p30</option>
            <option value="480p30">480p30</option>
          </select>
        </label>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-neutral-500">Latency preference</span>
          <select value={latency} onChange={(e) => setLatency(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-neutral-200 bg-[#000000] px-3 text-sm text-zinc-100">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <label className="block max-w-md">
          <span className="text-xs font-medium text-neutral-500">Title template</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-neutral-200 bg-[#000000] px-3 text-sm text-zinc-100" placeholder="Optional" />
        </label>
        <p className="text-[11px] text-neutral-500">{saved ? 'Saved' : 'Saved as you change these.'}</p>
      </section>
    </div>
  )
}
