import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../../lib/streamSettings'

export default function StreamSettings() {
  const { user } = useAuth()
  const initial = getStreamSettings(user?.id)
  const [latency, setLatency] = useState(initial.latency || 'low')
  const [quality, setQuality] = useState(initial.defaultQuality || '720p30')
  const [title, setTitle] = useState(initial.streamTitleTemplate || '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setStreamSettings(user?.id, {
      latency,
      defaultQuality: quality,
      streamTitleTemplate: title,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Stream & Ingest</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live ingest is not connected. There is no RTMP URL or stream key to copy. These fields only remember how you want a future stream labeled.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm text-zinc-400">
        The Live lobby on calabi.us cannot take OBS yet. When ingest is real, keys will appear here.
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
