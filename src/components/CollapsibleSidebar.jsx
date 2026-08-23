import React, { useState } from 'react'
import {
  Radio,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gamepad2,
  Search,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

export default function CollapsibleSidebar({
  collapsed,
  onToggleCollapse,
  currentChannelId,
  onSelectChannel,
  channels = [],
  currentView,
  onNavigate,
  mobileOpen,
  onMobileClose,
}) {
  const { accent } = useTheme()
  const [filterQuery, setFilterQuery] = useState('')

  const liveChannels = channels.filter((c) => c.isLive)
  const offlineChannels = channels.filter((c) => !c.isLive)

  const filteredLive = filterQuery.trim()
    ? liveChannels.filter(
        (c) =>
          c.displayName.toLowerCase().includes(filterQuery.toLowerCase()) ||
          c.game.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : liveChannels

  const formatViewers = (n) => {
    if (!n) return '0'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  const renderChannelItem = (channel) => {
    const isSelected = channel.id === currentChannelId && (currentView === 'home' || currentView === 'live')

    return (
      <button
        key={channel.id}
        type="button"
        onClick={() => {
          onSelectChannel(channel)
          if (onMobileClose) onMobileClose()
        }}
        className={cn(
          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all group relative',
          isSelected
            ? 'bg-[#1f1f28] text-white border-l-2'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#181820]'
        )}
        style={{
          borderLeftColor: isSelected ? accent.primary : 'transparent',
        }}
        title={collapsed ? `${channel.displayName} - ${channel.game} (${formatViewers(channel.viewers)})` : undefined}
      >
        {/* Avatar + Live Dot */}
        <div className="relative shrink-0">
          <img
            src={channel.avatar}
            alt={channel.displayName}
            className={cn(
              'h-8 w-8 rounded-full object-cover border transition-transform group-hover:scale-105',
              channel.isLive ? 'border-[#eb0400]' : 'border-zinc-700 opacity-60'
            )}
          />
          {channel.isLive && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#eb0400] ring-2 ring-[#0e0e12] animate-pulse" />
          )}
        </div>

        {/* Channel Details (Full View) */}
        {!collapsed && (
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1">
                <span className={cn('text-xs font-semibold truncate', isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white')}>
                  {channel.displayName}
                </span>
              </div>
              <span className="block text-[11px] text-zinc-500 truncate">
                {channel.game}
              </span>
            </div>

            {channel.isLive ? (
              <div className="flex items-center gap-1 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[#eb0400]" />
                <span className="text-[11px] font-medium text-zinc-300">
                  {formatViewers(channel.viewers)}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-zinc-600 uppercase font-bold shrink-0">
                Offline
              </span>
            )}
          </div>
        )}
      </button>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111116] border-r border-[#23232c] select-none">
      
      {/* Sidebar Header & Collapse Toggle */}
      <div className="flex items-center justify-between p-2.5 border-b border-[#23232c]">
        {!collapsed ? (
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-[#eb0400]" />
              Live Channels
            </span>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27] transition-colors"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27] transition-colors"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Channel List Area */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-4">
        
        {/* Filter Input if Expanded */}
        {!collapsed && channels.length > 5 && (
          <div className="px-1 mb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter channels..."
                className="w-full h-7 rounded-md border border-[#23232c] bg-[#16161f] pl-7 pr-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        )}

        {/* Followed / Recommended Live Channels */}
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Followed Channels ({filteredLive.length})
            </p>
          )}
          {filteredLive.map((ch) => renderChannelItem(ch))}
        </div>

        {/* Offline Channels Section */}
        {!collapsed && offlineChannels.length > 0 && (
          <div className="space-y-0.5 pt-2 border-t border-[#1e1e27]">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Offline Channels
            </p>
            {offlineChannels.map((ch) => renderChannelItem(ch))}
          </div>
        )}

        {/* Quick Platform Navigation */}
        {!collapsed && (
          <div className="space-y-0.5 pt-3 border-t border-[#1e1e27]">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Navigation
            </p>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                currentView === 'home' ? 'text-white bg-[#1f1f28]' : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
              )}
            >
              <Radio className="h-4 w-4" style={{ color: accent.primary }} />
              Live Home
            </button>
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                currentView === 'explore' ? 'text-white bg-[#1f1f28]' : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
              )}
            >
              <Gamepad2 className="h-4 w-4 text-emerald-400" />
              Categories & Games
            </button>
            <button
              type="button"
              onClick={() => onNavigate('clips')}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                currentView === 'clips' ? 'text-white bg-[#1f1f28]' : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
              )}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              Popular Clips
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-2.5 border-t border-[#23232c] text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Pulse v2.4</span>
          <span className="flex items-center gap-1 text-[#eb0400]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#eb0400] animate-pulse" />
            Ingest Active
          </span>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden md:block shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-200 z-30',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
