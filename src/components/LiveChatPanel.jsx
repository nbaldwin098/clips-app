import React, { useState, useEffect, useRef } from 'react'
import {
  Send,
  Smile,
  Settings,
  Shield,
  Sparkles,
  ChevronRight,
  Pin,
  MessageSquare,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import {
  SIMULATED_CHAT_USERS,
  CHAT_EMOTES,
  SIMULATED_CHAT_MESSAGES,
} from '../data/mockStreamData'

export default function LiveChatPanel({
  channel,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}) {
  const { user } = useAuth()
  const { accent, accentKey } = useTheme()

  const [messages, setMessages] = useState(() => [
    {
      id: 'init_1',
      user: 'StreamBot',
      color: '#9146FF',
      badges: ['mod'],
      text: `Welcome to ${channel?.displayName || 'the'} live chat! Follow community guidelines.`,
      time: '12:00',
      isSystem: true,
    },
    {
      id: 'init_2',
      user: 'VortexSniper',
      color: '#00FF9D',
      badges: ['vip', 'sub'],
      text: 'LET’S GOOO radiant game today! 🔥',
      time: '12:01',
    },
    {
      id: 'init_3',
      user: 'CyberKitten',
      color: '#FF2E93',
      badges: ['sub'],
      text: 'KEKW that warmup in the range was crazy',
      time: '12:02',
    },
  ])

  const [inputText, setInputText] = useState('')
  const [showEmotes, setShowEmotes] = useState(false)
  const [chatSpeed, setChatSpeed] = useState('normal') // 'normal' | 'slow' | 'paused'
  const [pinnedMessage, setPinnedMessage] = useState({
    title: 'STREAM RULES & DROPS',
    body: 'Be respectful in chat. Connect your account for in-game drops! Type !sens for configs.',
  })
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false)
  const [timestampsEnabled, setTimestampsEnabled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const isScrolledToBottomRef = useRef(true)

  // Auto-scroll handler
  const scrollToBottom = () => {
    if (isScrolledToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setUnreadCount(0)
    }
  }

  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60
    isScrolledToBottomRef.current = isAtBottom
    if (isAtBottom) {
      setUnreadCount(0)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Simulated active live chat feed
  useEffect(() => {
    if (chatSpeed === 'paused') return

    const intervalTime = chatSpeed === 'slow' ? 4500 : 2200

    const interval = setInterval(() => {
      const randomUser = SIMULATED_CHAT_USERS[Math.floor(Math.random() * SIMULATED_CHAT_USERS.length)]
      const randomText = SIMULATED_CHAT_MESSAGES[Math.floor(Math.random() * SIMULATED_CHAT_MESSAGES.length)]
      const now = new Date()
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

      const newMsg = {
        id: `msg_${Date.now()}_${Math.random()}`,
        user: randomUser.name,
        color: randomUser.color,
        badges: randomUser.badges,
        text: randomText,
        time: timeStr,
      }

      setMessages((prev) => [...prev.slice(-150), newMsg])

      if (!isScrolledToBottomRef.current) {
        setUnreadCount((c) => c + 1)
      }
    }, intervalTime)

    return () => clearInterval(interval)
  }, [chatSpeed])

  const handleSendMessage = (e) => {
    e?.preventDefault()
    if (!inputText.trim()) return

    const now = new Date()
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

    const myMsg = {
      id: `my_${Date.now()}`,
      user: user?.displayName || user?.handle || 'You',
      color: accent.primary,
      badges: ['sub', 'vip'],
      text: inputText.trim(),
      time: timeStr,
      isSelf: true,
    }

    setMessages((prev) => [...prev, myMsg])
    setInputText('')
    setShowEmotes(false)
    isScrolledToBottomRef.current = true
    scrollToBottom()
  }

  const handleAddEmote = (emoteCode) => {
    setInputText((prev) => (prev ? `${prev} ${emoteCode}` : emoteCode))
  }

  const renderBadge = (badge) => {
    switch (badge) {
      case 'mod':
        return (
          <span
            key="mod"
            className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#00AD03]/20 text-[#00FF55] border border-[#00AD03]/40 uppercase"
            title="Moderator"
          >
            MOD
          </span>
        )
      case 'vip':
        return (
          <span
            key="vip"
            className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#E005B9]/20 text-[#FF57DE] border border-[#E005B9]/40 uppercase"
            title="VIP"
          >
            VIP
          </span>
        )
      case 'sub':
        return (
          <span
            key="sub"
            className="px-1 py-0.5 rounded text-[9px] font-bold uppercase"
            style={{
              backgroundColor: accent.badgeBg,
              color: accent.primary,
              border: `1px solid ${accent.badgeBorder}`,
            }}
            title="Subscriber"
          >
            SUB
          </span>
        )
      case 'founder':
        return (
          <span
            key="founder"
            className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase"
            title="Founder"
          >
            ★ 1st
          </span>
        )
      default:
        return null
    }
  }

  const chatContent = (
    <div className="flex flex-col h-full bg-[#111116] border-l border-[#23232c] relative select-none">
      
      {/* Top Chat Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#23232c] bg-[#14141c]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27] transition-colors"
          title="Collapse Chat"
          aria-label="Collapse Chat"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Stream Chat
          </span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent.primary }}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setChatSettingsOpen((o) => !o)}
            className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27] transition-colors"
            title="Chat Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="md:hidden h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Optional Pinned Message / Stream Banner */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-[#171722] border-b border-[#23232c] flex items-start gap-2 relative">
          <Pin className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: accent.primary }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-zinc-200 tracking-wide">
              {pinnedMessage.title}
            </p>
            <p className="text-[11px] text-zinc-400 leading-tight">
              {pinnedMessage.body}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPinnedMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 p-0.5"
            title="Dismiss pin"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Chat Settings Modal / Popover */}
      {chatSettingsOpen && (
        <div className="absolute top-12 left-3 right-3 z-30 p-3 rounded-xl border border-[#2d2d3c] bg-[#14141d] shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-1 border-b border-[#23232c]">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Chat Preferences
            </span>
            <button
              type="button"
              onClick={() => setChatSettingsOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-zinc-300 cursor-pointer">
              <span>Show Timestamps</span>
              <input
                type="checkbox"
                checked={timestampsEnabled}
                onChange={(e) => setTimestampsEnabled(e.target.checked)}
                className="rounded bg-[#1a1a24] border-zinc-700 text-[var(--color-accent-primary)] focus:ring-0"
              />
            </label>

            <div className="flex items-center justify-between text-zinc-300 pt-1">
              <span>Chat Speed</span>
              <div className="flex gap-1">
                {['normal', 'slow', 'paused'].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setChatSpeed(spd)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors',
                      chatSpeed === spd
                        ? 'bg-[var(--color-accent-primary)] text-black'
                        : 'bg-[#1e1e27] text-zinc-400 hover:text-white'
                    )}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Stream Messages Feed Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 text-xs"
      >
        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <div
                key={m.id}
                className="p-2 rounded-lg bg-[#181824] border border-[#252536] text-[11px] text-zinc-300 flex items-center gap-1.5"
              >
                <Shield className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>{m.text}</span>
              </div>
            )
          }

          return (
            <div
              key={m.id}
              className={cn(
                'chat-message-text leading-relaxed hover:bg-[#161622] rounded px-1.5 py-0.5 -mx-1.5 transition-colors',
                m.isSelf && 'bg-[#181826]'
              )}
            >
              {timestampsEnabled && (
                <span className="text-[10px] text-zinc-500 font-mono mr-1.5">
                  {m.time}
                </span>
              )}

              {/* Badges */}
              {m.badges && m.badges.length > 0 && (
                <span className="inline-flex items-center gap-1 mr-1.5 align-middle">
                  {m.badges.map((b) => renderBadge(b))}
                </span>
              )}

              {/* Username */}
              <span
                className="font-bold mr-1.5 hover:underline cursor-pointer"
                style={{ color: m.color || accent.primary }}
              >
                {m.user}:
              </span>

              {/* Content */}
              <span className="text-zinc-200 select-text">{m.text}</span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* New Messages Jump to Bottom indicator */}
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={() => {
            isScrolledToBottomRef.current = true
            scrollToBottom()
          }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-xs font-bold text-black shadow-lg flex items-center gap-1 animate-bounce"
          style={{ backgroundColor: accent.primary }}
        >
          <span>More messages ({unreadCount})</span>
        </button>
      )}

      {/* Emote Selector Drawer */}
      {showEmotes && (
        <div className="p-2 border-t border-[#23232c] bg-[#161620] animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#23232c]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Channel Emotes
            </span>
            <button
              type="button"
              onClick={() => setShowEmotes(false)}
              className="text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-2">
            {CHAT_EMOTES.map((em) => (
              <button
                key={em.code}
                type="button"
                onClick={() => handleAddEmote(em.code)}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-[#1c1c27] hover:bg-[#252535] hover:scale-105 transition-all text-sm group"
                title={em.label}
              >
                <span>{em.symbol}</span>
                <span className="text-[9px] text-zinc-400 group-hover:text-white truncate max-w-full">
                  {em.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Chat Input Form */}
      <div className="p-2.5 border-t border-[#23232c] bg-[#14141c]">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send a message..."
              className="w-full h-10 rounded-lg border border-[#272734] bg-[#181822] pl-3 pr-10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowEmotes((v) => !v)}
              className={cn(
                'absolute right-2 h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors',
                showEmotes && 'text-[var(--color-accent-primary)]'
              )}
              title="Emotes"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Slow mode: 3s</span>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={cn(
                'h-8 px-4 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5',
                inputText.trim()
                  ? 'hover:brightness-110 active:scale-95'
                  : 'opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-500'
              )}
              style={
                inputText.trim()
                  ? {
                      backgroundColor: accent.primary,
                      color: accentKey === 'green' ? '#000000' : '#ffffff',
                    }
                  : {}
              }
            >
              <Send className="h-3.5 w-3.5" />
              <span>Chat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Right Side Panel */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-200 z-30',
          collapsed ? 'w-0 overflow-hidden border-0' : 'w-80 xl:w-88'
        )}
      >
        {!collapsed && chatContent}
      </aside>

      {/* Floating Reopen Button if Desktop Chat is collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex fixed right-4 bottom-6 z-40 h-10 px-3.5 rounded-full border border-[#2b2b3b] bg-[#181824] shadow-xl items-center gap-2 text-xs font-bold text-zinc-200 hover:bg-[#202030] hover:text-white transition-all"
        >
          <MessageSquare className="h-4 w-4" style={{ color: accent.primary }} />
          <span>Expand Chat</span>
        </button>
      )}

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10">
            {chatContent}
          </div>
        </div>
      )}
    </>
  )
}
