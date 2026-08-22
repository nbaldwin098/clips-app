import { useState } from 'react'
import { Music, Plus } from 'lucide-react'
import { FREE_SOUNDS, SOUND_CATEGORIES } from '../data/sounds'
import { useAuth } from '../context/AuthContext'
import { createUserSound, listUserSounds } from '../lib/engagement'

export default function SoundsPage({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [cat, setCat] = useState('All')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('UI')
  const [mine, setMine] = useState(() => listUserSounds())
  const list = FREE_SOUNDS.filter((s) => cat === 'All' || s.category === cat)

  const create = (e) => {
    e.preventDefault()
    if (!isAuthenticated) { onOpenAuth?.(); return }
    if (!title.trim()) return
    createUserSound({ userId: user.id, title: title.trim(), category, duration: '0:00', license: 'User upload (you own rights)', creatorName: user.displayName })
    setMine(listUserSounds())
    setTitle('')
  }

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto w-full">
      <h1 className="text-lg font-semibold text-[#007ACC]">Sounds</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-4">Free library + create your own (you must own rights).</p>
      <form onSubmit={create} className="mb-6 rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-xs text-[#007ACC] flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Create sound</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sound name" className="w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100" />
        <div className="flex gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100">
            {SOUND_CATEGORIES.filter((c) => c !== 'All').map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <button type="submit" className="h-10 px-4 rounded-lg bg-[#007ACC] text-white text-sm">Save sound</button>
        </div>
      </form>
      {mine.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-medium text-zinc-400">Your sounds</p>
          {mine.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3">
              <Music className="h-4 w-4 text-[#007ACC]" />
              <div className="flex-1"><p className="text-sm text-zinc-100">{s.title}</p><p className="text-xs text-zinc-500">{s.category} · {s.license}</p></div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        {SOUND_CATEGORIES.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={`h-8 px-3 rounded-full text-xs font-medium ${cat === c ? 'bg-[#007ACC] text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>{c}</button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3">
            <div className="h-10 w-10 rounded-lg bg-[#007acc]/15 flex items-center justify-center"><Music className="h-4 w-4 text-[#007ACC]" /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-zinc-100 truncate">{s.title}</p><p className="text-xs text-zinc-500">{s.category} · {s.duration} · {s.license}</p></div>
            <button type="button" className="h-8 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-300">Use</button>
          </div>
        ))}
      </div>
    </div>
  )
}
