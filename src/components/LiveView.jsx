import { Radio, Settings, Key, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'

function ensureStreamKey(userId) {
  const keyName = `stream_key_${userId || 'anon'}`
  let key = lsGet(keyName, null)
  if (!key) {
    key = `clips_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
    lsSet(keyName, key)
  }
  return key
}

export default function LiveView({ onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [copied, setCopied] = useState(false)
  const streamKey = isAuthenticated ? ensureStreamKey(user?.id) : null
  const rtmpUrl = 'rtmp://ingest.clips.local/live'

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Live broadcasts</h1>

      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#EBF4FA] flex items-center justify-center">
          <Radio className="h-7 w-7 text-[#2C729B]" />
        </div>
        <p className="mt-5 text-sm font-medium text-slate-800">No one is live</p>
        <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Viewer counts stay at zero until a real stream is connected. We never show fake numbers.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-[#2C729B]" />
          <h2 className="text-sm font-semibold text-slate-900">Your stream key (OBS / Streamlabs)</h2>
        </div>
        {!isAuthenticated ? (
          <p className="text-sm text-slate-500">Sign in to generate a stream key.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-1">Server (RTMP)</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 break-all">
                  {rtmpUrl}
                </code>
                <button type="button" onClick={() => copy(rtmpUrl)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Stream key</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 break-all">
                  {streamKey}
                </code>
                <button type="button" onClick={() => copy(streamKey)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ingest host is a placeholder until MediaMTX is attached. Key is stored on this device for now.
            </p>
            <button type="button" onClick={() => onNavigate?.('settings')} className="inline-flex items-center gap-2 text-xs font-medium text-[#2C729B]">
              <Settings className="h-3.5 w-3.5" />
              Full stream settings
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
