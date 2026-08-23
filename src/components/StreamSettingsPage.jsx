import { useState } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../lib/streamSettings'

export default function StreamSettingsPage({ onNavigate }) {
  const { user } = useAuth()
  const initial = getStreamSettings(user?.id)
  const [quality, setQuality] = useState(initial.defaultQuality || '720p30')
  const [latency, setLatency] = useState(initial.latency || 'low')
  const [saved, setSaved] = useState(false)

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <PageHeader title="Stream settings" onBack={() => onNavigate?.('dashboard')} />
      <div className="rounded-xl border border-[#2f2f37] bg-[#1f1f23] p-5 space-y-4">
        <label className="block text-xs text-[#007ACC]">
          Quality
          <select value={quality} onChange={(e) => setQuality(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-2 text-sm text-zinc-100">
            <option value="1080p30">1080p30</option>
            <option value="720p30">720p30</option>
            <option value="480p30">480p30</option>
          </select>
        </label>
        <label className="block text-xs text-[#007ACC]">
          Latency
          <select value={latency} onChange={(e) => setLatency(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#2f2f37] bg-[#0e0e10] px-2 text-sm text-zinc-100">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <button
          type="button"
          className="h-10 w-full rounded-lg bg-[#007ACC] text-white text-sm"
          onClick={() => {
            setStreamSettings(user?.id, { defaultQuality: quality, latency })
            setSaved(true)
          }}
        >
          Save
        </button>
        {saved && <p className="text-xs text-green-400">Saved.</p>}
      </div>
    </div>
  )
}
