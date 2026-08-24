import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../../lib/streamSettings'
import { ensureStreamKey, rotateStreamKey } from '../../lib/streamKeys'
import { getVodChannel, setVodChannel } from '../../lib/vods'

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
  const [copied, setCopied] = useState(false)

  const save = () => {
    setStreamSettings(user?.id, {
      latency,
      defaultQuality: quality,
      streamTitleTemplate: title,
      storePastBroadcasts: true,
      autoPublishVod: autoPub,
      vodVisibility: vis,
    })
    setVodChannel(user?.id, {
      enabled: vodOn,
      handle: vodHandle,
      autoPublish: autoPub,
      visibility: vis,
    }, user)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Stream & Ingest</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live ingest is not connected. Your stream key is saved on this device for when OBS can connect. Ended lobbies still get a copy under VODs.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Stream key</p>
        <code className="block text-xs break-all text-zinc-300 bg-black border border-zinc-800 rounded-lg px-3 py-2">{key || 'Sign in to create a key'}</code>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold"
            onClick={async () => {
              if (!key) return
              await navigator.clipboard.writeText(key)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? 'Copied' : 'Copy key'}
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-zinc-700 text-white text-xs"
            onClick={() => user?.id && setKey(rotateStreamKey(user.id))}
          >
            Rotate key
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Xbox, PS5, and PC screens</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          This site does not have a live ingest server yet, so a console picture cannot land on other people’s screens from here. Keep the stream key for OBS when ingest ships.
        </p>
        <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-5">
          <li>
            <strong className="text-zinc-200">PC:</strong> On Live, use Share this screen for a preview on this browser only. For a real broadcast later, OBS (or similar) will use the stream key plus an ingest address we will print here — we do not invent one now.
          </li>
          <li>
            <strong className="text-zinc-200">Xbox / PS5:</strong> Those consoles only push to their own apps (Twitch, YouTube). To send a game to a PC first, use an HDMI capture card, then OBS on the PC. There is no Xbox or PS5 setting that talks to calabi.us today.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Second channel for VODs</p>
        <p className="text-xs text-zinc-500">Every ended lobby is copied to Studio → VODs. Turn on a second channel if you want public VOD posts under another handle. Keep them private to stay on the main account only.</p>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={vodOn} onChange={(e) => setVodOn(e.target.checked)} />
          Enable VOD channel
        </label>
        <label className="block max-w-xs text-xs text-zinc-400">
          VOD handle
          <input value={vodHandle} onChange={(e) => setVodHandle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={autoPub} onChange={(e) => setAutoPub(e.target.checked)} />
          Auto-post VODs to that channel
        </label>
        <select value={vis} onChange={(e) => setVis(e.target.value)} className="max-w-xs h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white">
          <option value="private">Keep private</option>
          <option value="public">Public on VOD channel</option>
        </select>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Preferences on this device</h2>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-400">Preferred quality</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100">
            <option value="1080p30">1080p30</option>
            <option value="720p30">720p30</option>
            <option value="480p30">480p30</option>
          </select>
        </label>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-400">Latency preference</span>
          <select value={latency} onChange={(e) => setLatency(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <label className="block max-w-md">
          <span className="text-xs font-medium text-zinc-400">Title template</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100" placeholder="Optional" />
        </label>
        <button type="button" onClick={save} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
          {saved ? 'Saved' : 'Save'}
        </button>
      </section>
    </div>
  )
}
