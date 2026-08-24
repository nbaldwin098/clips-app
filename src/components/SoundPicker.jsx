import { useState } from 'react'
import { Music, Plus, Check, X, ExternalLink } from 'lucide-react'
import { FREE_SOUNDS, SOUND_CATEGORIES } from '../data/sounds'
import { useAuth } from '../context/AuthContext'
import { createUserSound, listUserSounds } from '../lib/engagement'
import { cn } from '../lib/utils'

/** Sounds live in the + upload flow only — not as a sidebar page. */
export default function SoundPicker({ value, onChange, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState('All')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('UI')
  const [mine, setMine] = useState(() => listUserSounds(user?.id))
  const list = FREE_SOUNDS.filter((s) => cat === 'All' || s.category === cat)

  const select = (sound) => {
    onChange?.(sound ? { id: sound.id, title: sound.title } : null)
    setOpen(false)
  }

  const create = (e) => {
    e.preventDefault()
    if (!isAuthenticated) { onOpenAuth?.(); return }
    if (!title.trim()) return
    const sound = createUserSound({
      userId: user.id,
      title: title.trim(),
      category,
      duration: '0:00',
      license: 'User upload (you own rights)',
      creatorName: user.displayName,
    })
    setMine(listUserSounds(user?.id))
    setTitle('')
    select(sound)
  }

  return (
    <div>
      <p className="text-xs text-zinc-400 mb-1.5">Sound</p>
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-[#000000] px-3 h-10">
          <Music className="h-3.5 w-3.5 text-white shrink-0" />
          <span className="text-sm text-white truncate flex-1">{value.title}</span>
          <button type="button" onClick={() => select(null)} className="text-zinc-500 hover:text-white" aria-label="Remove sound">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full h-10 rounded-lg border border-dashed border-zinc-700 bg-[#000000] text-sm text-zinc-400 hover:text-white hover:border-zinc-500 flex items-center justify-center gap-1.5"
        >
          <Music className="h-3.5 w-3.5" /> Add a sound
        </button>
      )}

      {open && (
        <div className="mt-2 rounded-xl border border-zinc-800 bg-[#18181b] p-3 space-y-3">
          <form onSubmit={create} className="space-y-2">
            <p className="text-xs text-white flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Create your own</p>
            <div className="flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sound name"
                className="flex-1 h-9 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100"
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-lg border border-zinc-800 bg-[#000000] px-2 text-xs text-zinc-100">
                {SOUND_CATEGORIES.filter((c) => c !== 'All').map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <button type="submit" className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold shrink-0">Save</button>
            </div>
          </form>

          {mine.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-zinc-500">Your sounds</p>
              {mine.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => select(s)}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2 text-left hover:border-white/30"
                >
                  <Music className="h-3.5 w-3.5 text-white shrink-0" />
                  <span className="flex-1 min-w-0"><span className="block text-sm text-zinc-100 truncate">{s.title}</span><span className="block text-[11px] text-zinc-500">{s.category}</span></span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {SOUND_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn('h-7 px-2.5 rounded-full text-[11px] font-medium', cat === c ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800')}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {list.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => select(s)}
                onKeyDown={(e) => { if (e.key === 'Enter') select(s) }}
                className="w-full flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2 text-left hover:border-white/30 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0"><Music className="h-3.5 w-3.5 text-white" /></div>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-zinc-100 truncate">{s.title}{s.attribution ? <span className="text-zinc-500"> · by {s.attribution}</span> : null}</span>
                  <span className="block text-[11px] text-zinc-500">{s.category} · {s.duration}</span>
                </span>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-zinc-500 hover:text-white shrink-0"
                    title={`View on ${s.source}`}
                    aria-label={`View on ${s.source}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {value?.id === s.id && <Check className="h-4 w-4 text-white shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
