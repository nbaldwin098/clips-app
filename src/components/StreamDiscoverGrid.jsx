import React, { useState } from 'react'
import {
  Radio,
  Gamepad2,
  Eye,
  Check,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import { STREAM_CATEGORIES } from '../data/mockStreamData'

export default function StreamDiscoverGrid({
  channels = [],
  onSelectChannel,
  currentChannelId,
  searchQuery = '',
}) {
  const { accent, accentKey } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState('all')

  const formatViewers = (n) => {
    if (!n) return '0'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  // Filter channels based on search and category
  const filteredChannels = channels.filter((ch) => {
    const matchesSearch =
      !searchQuery.trim() ||
      ch.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ch.tags && ch.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))

    const matchesCategory =
      selectedCategory === 'all' ||
      ch.game.toLowerCase().replace(/[^a-z0-9]/g, '') === selectedCategory.replace(/[^a-z0-9]/g, '') ||
      (selectedCategory === 'just-chatting' && ch.game.toLowerCase().includes('chatting'))

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6 pt-6">
      
      {/* Category Pills Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" style={{ color: accent.primary }} />
            <h2 className="text-base font-bold text-white tracking-tight">
              Top Live Categories
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            Browse 24+ games & IRL streams
          </span>
        </div>

        {/* Categories Horizontal Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {STREAM_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border',
                  isCatActive
                    ? 'text-black shadow-md'
                    : 'bg-[#161620] border-[#252533] text-zinc-300 hover:bg-[#1f1f2c] hover:text-white'
                )}
                style={
                  isCatActive
                    ? {
                        backgroundColor: accent.primary,
                        borderColor: accent.primary,
                        color: accentKey === 'green' ? '#000000' : '#ffffff',
                      }
                    : {}
                }
              >
                <span>{cat.name}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-medium',
                    isCatActive ? 'bg-black/20 text-current' : 'bg-[#232332] text-zinc-400'
                  )}
                >
                  {cat.viewers}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recommended Live Streams Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#eb0400]" />
            <h2 className="text-base font-bold text-white tracking-tight">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'Live Channels You May Like'}
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            {filteredChannels.length} streams available
          </span>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="p-10 rounded-2xl border border-[#23232c] bg-[#121218] text-center space-y-2">
            <p className="text-sm font-semibold text-zinc-300">No channels match your filters</p>
            <p className="text-xs text-zinc-500">Try searching for a different game or reset category filter.</p>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="mt-2 text-xs font-bold underline text-[var(--color-accent-primary)]"
            >
              Reset to All Categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredChannels.map((item) => {
              const isSelected = item.id === currentChannelId

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectChannel(item)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={cn(
                    'stream-card group cursor-pointer overflow-hidden flex flex-col',
                    isSelected && 'ring-2 ring-[var(--color-accent-primary)]'
                  )}
                >
                  {/* Thumbnail / Video Preview Poster */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={item.videoPoster || item.banner}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Live Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {item.isLive ? (
                        <span className="px-2 py-0.5 rounded bg-[#eb0400] text-white font-extrabold text-[10px] tracking-wider uppercase live-badge-glow flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold text-[10px] uppercase">
                          OFFLINE
                        </span>
                      )}
                    </div>

                    {/* Viewer Counter */}
                    {item.isLive && (
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur text-white text-[11px] font-semibold flex items-center gap-1">
                        <Eye className="h-3 w-3 text-zinc-400" />
                        <span>{formatViewers(item.viewers)}</span>
                      </div>
                    )}

                    {/* Stream Quality Tag */}
                    <div className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur text-zinc-300 text-[10px] font-mono">
                      1080p60
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <div className="p-3 flex items-start gap-3 flex-1 bg-[#13131a]">
                    <img
                      src={item.avatar}
                      alt={item.displayName}
                      className="h-10 w-10 rounded-full object-cover border border-[#2d2d3c] shrink-0 mt-0.5 group-hover:border-[var(--color-accent-primary)] transition-colors"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-white leading-snug line-clamp-1 group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-zinc-300 font-semibold truncate">
                          {item.displayName}
                        </span>
                        {item.verified && (
                          <span
                            className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-black"
                            style={{ backgroundColor: accent.primary }}
                          >
                            <Check className="h-2 w-2 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium block truncate">
                        {item.game}
                      </span>

                      {/* Tags */}
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {item.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#1c1c28] text-zinc-400 border border-[#252535]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
