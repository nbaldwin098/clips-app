import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { listVods, setVodVisibility, getVodChannel } from '../lib/vods'

export default function VodsPage({ onNavigate }) {
  const { user } = useAuth()
  const vods = listVods(user?.id)
  const ch = getVodChannel(user?.id)

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <PageHeader title="VODs" subtitle="A copy of every ended live lobby" onBack={() => onNavigate?.('dashboard')} />
      <p className="text-xs text-zinc-500 mb-4">
        Live ingest is not connected, so these copies are session records (title, time, length) — not a video file yet.
        {ch.enabled ? ` Second channel @${ch.handle || '—'} is ${ch.autoPublish ? 'auto-posting' : 'manual'}.` : ' Second channel is off — copies stay private here.'}
      </p>
      <button type="button" className="mb-4 h-9 px-3 rounded-lg border border-zinc-700 text-xs text-white" onClick={() => onNavigate?.('settings', 'stream')}>
        VOD channel settings
      </button>
      {vods.length === 0 ? (
        <p className="text-sm text-zinc-500">No lives ended on this device yet.</p>
      ) : vods.map((v) => (
        <div key={v.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-white">{v.title}</p>
            <p className="text-[11px] text-zinc-500">{v.endedAt?.slice(0, 16).replace('T', ' ')} · {Math.round((v.durationSec || 0) / 60)} min · {v.visibility}</p>
          </div>
          <select
            value={v.visibility}
            onChange={(e) => setVodVisibility(v.id, e.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-black px-2 text-xs text-white"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
      ))}
    </div>
  )
}
