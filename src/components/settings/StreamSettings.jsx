import { useState } from 'react'
import { Copy, Check, Key, Globe } from 'lucide-react'

export default function StreamSettings() {
  const [region, setRegion] = useState('us-east')
  const [latency, setLatency] = useState('ultra')
  const [delay, setDelay] = useState(0)
  const [autoVod, setAutoVod] = useState(true)
  const [allowClips, setAllowClips] = useState(true)
  const [copied, setCopied] = useState(false)

  const streamKey = 'clips_live_••••••••••••••••'
  const rtmpUrl = 'rtmp://ingest.clips.tv/live'
  const srtUrl = 'srt://ingest.clips.tv:9000'

  const copy = (text) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Stream & Ingest</h1>
        <p className="mt-1 text-sm text-slate-500">RTMP / SRT keys, region, latency, and archive controls.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Key className="h-4 w-4" /> Stream key</h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">RTMP URL</p>
            <div className="flex gap-2">
              <code className="flex-1 text-sm bg-white border border-slate-200 rounded px-3 py-2 truncate">{rtmpUrl}</code>
              <button onClick={() => copy(rtmpUrl)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Stream key</p>
            <div className="flex gap-2">
              <code className="flex-1 text-sm bg-white border border-slate-200 rounded px-3 py-2">{streamKey}</code>
              <button onClick={() => copy('clips_live_demo_key')} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white">
                <Copy className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">SRT URL</p>
            <code className="block text-sm bg-white border border-slate-200 rounded px-3 py-2">{srtUrl}</code>
          </div>
          <button className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-white">Reset stream key</button>
        </div>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Globe className="h-4 w-4" /> Ingest region</h2>
        <select value={region} onChange={e => setRegion(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
          <option value="us-east">US East</option>
          <option value="us-west">US West</option>
          <option value="eu">Europe</option>
          <option value="asia">Asia Pacific</option>
        </select>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Latency mode</h2>
        <div className="flex gap-3">
          <button onClick={() => setLatency('ultra')} className={`h-9 px-4 rounded-lg text-sm font-medium border ${latency === 'ultra' ? 'bg-[#2C729B] text-white border-[#2C729B]' : 'border-slate-200 text-slate-700'}`}>Ultra-low</button>
          <button onClick={() => setLatency('standard')} className={`h-9 px-4 rounded-lg text-sm font-medium border ${latency === 'standard' ? 'bg-[#2C729B] text-white border-[#2C729B]' : 'border-slate-200 text-slate-700'}`}>Standard</button>
        </div>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-slate-600">Broadcast delay (seconds)</span>
          <input type="number" min={0} max={10} value={delay} onChange={e => setDelay(Number(e.target.value))} className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" />
        </label>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={autoVod} onChange={e => setAutoVod(e.target.checked)} className="rounded border-slate-300 text-[#2C729B]" />
          <span className="text-sm text-slate-700">Auto-archive live streams to VOD library</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={allowClips} onChange={e => setAllowClips(e.target.checked)} className="rounded border-slate-300 text-[#2C729B]" />
          <span className="text-sm text-slate-700">Allow viewers to create clips</span>
        </label>
      </section>
    </div>
  )
}
