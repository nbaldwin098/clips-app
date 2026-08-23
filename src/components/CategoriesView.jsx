import React, { useState } from 'react'
import {
  Gamepad2,
  Search,
} from 'lucide-react'
import { STREAM_CATEGORIES, MOCK_CHANNELS } from '../data/mockStreamData'
import { useTheme } from '../context/ThemeContext'

export default function CategoriesView({ onSelectChannel }) {
  const { accent } = useTheme()
  const [search, setSearch] = useState('')

  const filteredCategories = STREAM_CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 max-w-[1500px] mx-auto space-y-8">
      
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Gamepad2 className="h-7 w-7" style={{ color: accent.primary }} />
              Browse Categories & Live Games
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Discover top streamed games, creative arts, music beds and IRL discussions.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games..."
              className="w-full h-10 rounded-xl border border-[#272736] bg-[#14141d] pl-9 pr-4 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCategories.filter((c) => c.cover).map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                const matched = MOCK_CHANNELS.find((c) => c.game.toLowerCase().includes(cat.name.toLowerCase()))
                if (matched) onSelectChannel(matched)
              }}
              className="stream-card group cursor-pointer overflow-hidden rounded-xl border border-[#252533] bg-[#12121a] hover:border-[var(--color-accent-primary)] transition-all flex flex-col"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-black">
                <img
                  src={cat.cover}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] font-bold text-white">
                  {cat.viewers} Viewers
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-bold text-white group-hover:text-[var(--color-accent-primary)] truncate">
                  {cat.name}
                </h3>
                <span className="text-[11px] text-zinc-500">Live Channels</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
