import React, { useState } from 'react'
import {
  MessageSquare,
  Radio,
} from 'lucide-react'
import VideoPlayerBox from './VideoPlayerBox'
import StreamDiscoverGrid from './StreamDiscoverGrid'
import SubscribeModal from './SubscribeModal'
import { useTheme } from '../context/ThemeContext'

export default function StreamMainArea({
  currentChannel,
  channels = [],
  onSelectChannel,
  onOpenMobileChat,
  onOpenMobileSidebar,
  searchQuery = '',
}) {
  const { accent, theaterMode } = useTheme()
  const [followedChannels, setFollowedChannels] = useState(() => new Set(['ch_shroud', 'ch_tarik']))
  const [subModalOpen, setSubModalOpen] = useState(false)

  const isFollowed = followedChannels.has(currentChannel?.id)

  const handleFollowToggle = () => {
    setFollowedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(currentChannel?.id)) {
        next.delete(currentChannel?.id)
      } else {
        next.add(currentChannel?.id)
      }
      return next
    })
  }

  return (
    <div className="flex-1 w-full min-w-0 bg-[#09090c] overflow-y-auto">
      
      {/* Mobile Top Controls Bar for Opening Sidebar Drawer & Chat Drawer */}
      <div className="flex lg:hidden items-center justify-between p-2.5 bg-[#121218] border-b border-[#23232c] text-xs">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a24] text-zinc-300 font-semibold hover:text-white"
        >
          <Radio className="h-3.5 w-3.5 text-[#eb0400]" />
          <span>Channels</span>
        </button>

        <button
          type="button"
          onClick={onOpenMobileChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-semibold shadow-sm"
          style={{ backgroundColor: accent.primary, color: '#000000' }}
        >
          <MessageSquare className="h-3.5 w-3.5 fill-current" />
          <span>Live Chat</span>
        </button>
      </div>

      {/* Main Stream Section Container */}
      <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Core Video Player Aspect Ratio Box + Metadata Bar */}
        <VideoPlayerBox
          channel={currentChannel}
          isFollowed={isFollowed}
          onFollowToggle={handleFollowToggle}
          onOpenSubscribeModal={() => setSubModalOpen(true)}
        />

        {/* Discovery Stream Grid & Category Carousel Below Video */}
        {!theaterMode && (
          <StreamDiscoverGrid
            channels={channels}
            onSelectChannel={onSelectChannel}
            currentChannelId={currentChannel?.id}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Subscription Modal Dialog */}
      <SubscribeModal
        open={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        channel={currentChannel}
      />
    </div>
  )
}
