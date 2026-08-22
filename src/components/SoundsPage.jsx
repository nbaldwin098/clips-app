import { useState } from 'react'
import { Music } from 'lucide-react'
import { FREE_SOUNDS, SOUND_CATEGORIES } from '../data/sounds'

export default function SoundsPage() {
  const [cat, setCat] = useState('All')
  const list = FREE_SOUNDS.filter((s) => cat === 'All' || s.category === cat)

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto w-full">
      <h1 className="text-lg font-semibold text-zinc-100">Sounds</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-4">
        Free library for creators (CC0 / public domain labels). Verify license for commercial use. Audio files not hosted in MVP — catalog only.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SOUND_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`h-8 px-3 rounded-full text-xs font-medium ${
              cat === c ? 'bg-[#007acc] text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3">
            <div className="h-10 w-10 rounded-lg bg-[#007acc]/15 flex items-center justify-center">
              <Music className="h-4 w-4 text-[#007acc]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">{s.title}</p>
              <p className="text-xs text-zinc-500">
                {s.category} · {s.duration} · {s.license}
              </p>
            </div>
            <button type="button" className="h-8 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:border-[#007acc]">
              Use
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
