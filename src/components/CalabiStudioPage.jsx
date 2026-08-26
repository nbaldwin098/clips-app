import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { STREAM_FILTERS, getStreamFilter, setStreamFilter, filterCss } from '../lib/streamFilters'
import { generateAiAvatar, saveAiAvatar, listAiAvatars } from '../lib/aiAvatar'
import { queueClipPost, getSocialConnects, listClipJobs } from '../lib/socialConnects'
import { getCalabiCashBalance } from '../lib/calabiCash'

/**
 * Calabi Studio — free CapCut-style shell: timeline trim, filters, AI avatar,
 * auto-clip export to connected socials. Heavy media encode ships with cloud jobs later.
 */
export default function CalabiStudioPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [seed, setSeed] = useState(() => user?.handle || 'calabi')
  const [style, setStyle] = useState('orb')
  const [filterId, setFilterId] = useState(() => getStreamFilter(user?.id).filterId)
  const [startSec, setStartSec] = useState(0)
  const [endSec, setEndSec] = useState(30)
  const [contentId, setContentId] = useState('')
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState(null)
  const [, bump] = useState(0)
  const avatars = listAiAvatars(user?.id)
  const connects = getSocialConnects(user?.id)
  const jobs = listClipJobs(user?.id, 6)
  const cash = getCalabiCashBalance(user?.id)
  const css = useMemo(() => filterCss(filterId), [filterId])

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-white">Calabi Studio</h1>
        <p className="text-sm text-zinc-400 mt-2">Sign in to edit clips, apply filters, and push to socials.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Calabi Studio</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Free CapCut-style tools on calabi: trim ranges, filters, AI avatars, and one-tap social posts.
          Cloud encode/OAuth publish is queued until keys are connected. Cash balance: {cash}
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Timeline trim</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-zinc-400">
            Content id
            <input value={contentId} onChange={(e) => setContentId(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" placeholder="post id" />
          </label>
          <label className="text-xs text-zinc-400">
            Start (sec)
            <input type="number" value={startSec} onChange={(e) => setStartSec(Number(e.target.value))} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
          </label>
          <label className="text-xs text-zinc-400">
            End (sec)
            <input type="number" value={endSec} onChange={(e) => setEndSec(Number(e.target.value))} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
          </label>
        </div>
        <p className="text-[11px] text-zinc-500">Vertical export for TikTok / Shorts uses this range.</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Filters</p>
        <div className="flex flex-wrap gap-2">
          {STREAM_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilterId(f.id)
                setStreamFilter(user.id, { filterId: f.id })
              }}
              className={`h-9 px-3 rounded-lg text-xs border ${filterId === f.id ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div
          className="h-28 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-800"
          style={{ filter: css || undefined }}
        />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">AI avatar maker</p>
        <p className="text-xs text-zinc-500">Generate channel avatars, banners, or a full-body overlay for streams/videos.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-zinc-400">
            Seed
            <input value={seed} onChange={(e) => setSeed(e.target.value)} className="mt-1 block h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
          </label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white">
            <option value="orb">Face orb</option>
            <option value="body">Full body</option>
            <option value="banner">Banner</option>
          </select>
          <button
            type="button"
            className="h-10 px-4 rounded-lg bg-white text-black text-xs font-semibold"
            onClick={() => {
              const av = generateAiAvatar({ seed, style, label: user.handle })
              saveAiAvatar(user.id, av)
              setPreview(av)
              if (style === 'body') setStreamFilter(user.id, { bodyAvatar: true, avatarId: av.id })
              bump((n) => n + 1)
            }}
          >
            Generate
          </button>
        </div>
        {preview ? <img src={preview.dataUrl} alt="" className="h-28 w-28 rounded-xl border border-zinc-700 bg-black" /> : null}
        <div className="flex flex-wrap gap-2">
          {avatars.slice(0, 8).map((a) => (
            <img key={a.id} src={a.dataUrl} alt="" className="h-14 w-14 rounded-lg border border-zinc-700" />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Auto clip → socials</p>
        <p className="text-xs text-zinc-500">
          Connected: {Object.keys(connects).filter((k) => connects[k]?.connected).join(', ') || 'none — connect in Settings → Channel / Socials'}
        </p>
        <button
          type="button"
          className="h-10 px-4 rounded-lg bg-white text-black text-xs font-semibold"
          onClick={() => {
            if (!contentId) {
              setNote('Enter a content id to clip.')
              return
            }
            const providers = Object.keys(connects).filter((k) => connects[k]?.connected)
            const r = queueClipPost({
              userId: user.id,
              contentId,
              title: `Studio clip ${startSec}-${endSec}`,
              providers,
              startSec,
              endSec,
            })
            setNote(r.ok ? 'Queued for connected socials (OAuth publish pending).' : r.error)
            bump((n) => n + 1)
          }}
        >
          Push clip
        </button>
        {note ? <p className="text-xs text-amber-400">{note}</p> : null}
        <ul className="text-[11px] text-zinc-500 space-y-1">
          {jobs.map((j) => (
            <li key={j.id}>{j.title} → {j.providers.join(', ')} · {j.status}</li>
          ))}
        </ul>
        <button type="button" className="text-xs text-zinc-400 underline" onClick={() => onNavigate?.('settings', 'channel')}>
          Manage social connects
        </button>
      </section>
    </div>
  )
}
