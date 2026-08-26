import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { STREAM_FILTERS, getStreamFilter, setStreamFilter } from '../lib/streamFilters'
import { generateAiAvatar, saveAiAvatar, listAiAvatars } from '../lib/aiAvatar'
import { queueClipPost, getSocialConnects, listClipJobs } from '../lib/socialConnects'
import CreatorLab from './studio/CreatorLab'

/**
 * Calabi Studio — in-browser CapCut + OBS Creator Lab, plus avatar / social helpers.
 */
export default function CalabiStudioPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [seed, setSeed] = useState(() => user?.handle || 'calabi')
  const [style, setStyle] = useState('orb')
  const [filterId, setFilterId] = useState(() => getStreamFilter(user?.id).filterId)
  const [contentId, setContentId] = useState('')
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState(null)
  const [, bump] = useState(0)
  const avatars = listAiAvatars(user?.id)
  const connects = getSocialConnects(user?.id)
  const jobs = listClipJobs(user?.id, 6)

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-white">Calabi Studio</h1>
        <p className="text-sm text-zinc-400 mt-2">Sign in to use Creator Lab (edit + live mixer) on calabi.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      <CreatorLab onNavigate={onNavigate} />

      <div className="max-w-6xl mx-auto px-4 md:px-6 grid gap-4 md:grid-cols-2">
        <section className="border border-zinc-800 bg-[#121218] p-4 space-y-3">
          <p className="text-sm font-semibold text-white">AI avatar maker</p>
          <p className="text-xs text-zinc-500">Channel faces, banners, or a body overlay for Live studio.</p>
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

        <section className="border border-zinc-800 bg-[#121218] p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Stream look + social queue</p>
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
          <p className="text-xs text-zinc-500">
            Connected: {Object.keys(connects).filter((k) => connects[k]?.connected).join(', ') || 'none — Settings → Channel / Studio → Socials'}
          </p>
          <label className="text-xs text-zinc-400 block">
            Content id (optional queue)
            <input value={contentId} onChange={(e) => setContentId(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" placeholder="post id" />
          </label>
          <button
            type="button"
            className="h-10 px-4 rounded-lg bg-white text-black text-xs font-semibold"
            onClick={() => {
              if (!contentId) {
                setNote('Enter a content id, or use Studio → Socials.')
                return
              }
              const providers = Object.keys(connects).filter((k) => connects[k]?.connected)
              const r = queueClipPost({
                userId: user.id,
                contentId,
                title: 'Studio clip',
                providers,
                startSec: 0,
                endSec: 30,
              })
              setNote(r.ok ? 'Queued for connected socials (OAuth publish pending).' : r.error)
              bump((n) => n + 1)
            }}
          >
            Queue to socials
          </button>
          {note ? <p className="text-xs text-amber-400">{note}</p> : null}
          <ul className="text-[11px] text-zinc-500 space-y-1">
            {jobs.map((j) => (
              <li key={j.id}>{j.title} → {j.providers.join(', ')} · {j.status}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
