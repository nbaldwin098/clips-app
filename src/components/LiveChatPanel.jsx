import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  Smile,
  Settings,
  Shield,
  ChevronRight,
  MessageSquare,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'
import { getLiveChat, postLiveChat } from '../lib/engagement'

// Small set of neutral text emotes — a decorative input helper only, not user/content data.
const QUICK_EMOTES = ['🔥', '👏', '😂', '❤️', '🎉', '👀', '💯', '🙌']

export default function LiveChatPanel({
  channel,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  onOpenAuth,
}) {
  const { user, isAuthenticated } = useAuth()

  const [messages, setMessages] = useState(() => (channel?.userId ? getLiveChat(channel.userId) : []))
  const [inputText, setInputText] = useState('')
  const [showEmotes, setShowEmotes] = useState(false)
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false)
  const [timestampsEnabled, setTimestampsEnabled] = useState(false)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const isScrolledToBottomRef = useRef(true)

  const streamUserId = channel?.userId || null

  const refreshMessages = useCallback(() => {
    if (!streamUserId) {
      setMessages([])
      return
    }
    setMessages(getLiveChat(streamUserId))
  }, [streamUserId])

  useEffect(() => {
    refreshMessages()
  }, [refreshMessages])

  // Real-data poll: picks up messages posted from other tabs/sessions on this device.
  useEffect(() => {
    if (!streamUserId) return
    const interval = setInterval(refreshMessages, 4000)
    return () => clearInterval(interval)
  }, [streamUserId, refreshMessages])

  const scrollToBottom = () => {
    if (isScrolledToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    isScrolledToBottomRef.current = scrollHeight - scrollTop - clientHeight < 60
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e) => {
    e?.preventDefault()
    if (!inputText.trim() || !streamUserId) return
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    postLiveChat(streamUserId, {
      userId: user.id,
      handle: user.handle,
      text: inputText.trim().slice(0, 500),
    })
    setInputText('')
    setShowEmotes(false)
    isScrolledToBottomRef.current = true
    refreshMessages()
    scrollToBottom()
  }

  const handleAddEmote = (symbol) => {
    setInputText((prev) => (prev ? `${prev} ${symbol}` : symbol))
  }

  const chatContent = (
    <div className="flex flex-col h-full bg-[#111116] border-l border-[#23232c] relative select-none">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#23232c] bg-[#14141c]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27] transition-colors"
          title="Collapse chat"
          aria-label="Collapse chat"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 truncate">
            {channel ? `@${channel.handle} chat` : 'Live chat'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setChatSettingsOpen((o) => !o)}
            className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27] transition-colors"
            title="Chat settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {chatSettingsOpen && (
        <div className="absolute top-12 left-3 right-3 z-30 p-3 rounded-xl border border-[#2d2d3c] bg-[#14141d] shadow-2xl space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-1 border-b border-[#23232c]">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Chat preferences</span>
            <button type="button" onClick={() => setChatSettingsOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer pt-1">
            <span>Show timestamps</span>
            <input
              type="checkbox"
              checked={timestampsEnabled}
              onChange={(e) => setTimestampsEnabled(e.target.checked)}
              className="rounded bg-[#1a1a24] border-zinc-700 text-white focus:ring-0"
            />
          </label>
        </div>
      )}

      {!channel ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-2">
          <MessageSquare className="h-6 w-6 text-zinc-600" />
          <p className="text-xs text-zinc-500">Select a live channel to view its chat.</p>
        </div>
      ) : (
        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 text-xs">
          {messages.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#181824] border border-[#252536] text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>No messages yet. Be the first to say something!</span>
            </div>
          ) : (
            messages.map((m) => {
              const isHost = m.userId === channel.userId
              const isSelf = isAuthenticated && m.userId === user?.id
              return (
                <div
                  key={m.id}
                  className={cn(
                    'chat-message-text leading-relaxed hover:bg-[#161622] rounded px-1.5 py-0.5 -mx-1.5 transition-colors',
                    isSelf && 'bg-[#181826]'
                  )}
                >
                  {timestampsEnabled && (
                    <span className="text-[10px] text-zinc-500 font-mono mr-1.5">
                      {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {isHost && (
                    <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase mr-1.5 align-middle bg-white/10 text-white border border-white/25">
                      Host
                    </span>
                  )}
                  <span className={cn('font-bold mr-1.5', isSelf ? 'text-white' : 'text-zinc-300')}>
                    {m.handle || 'viewer'}:
                  </span>
                  <span className="text-zinc-200 select-text">{m.text}</span>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {showEmotes && channel && (
        <div className="p-2 border-t border-[#23232c] bg-[#161620] animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-1.5 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quick reactions</span>
            <button type="button" onClick={() => setShowEmotes(false)} className="text-zinc-500 hover:text-zinc-200">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1.5 pt-1">
            {QUICK_EMOTES.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => handleAddEmote(symbol)}
                className="flex items-center justify-center p-1.5 rounded-lg bg-[#1c1c27] hover:bg-[#252535] hover:scale-105 transition-all text-base"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-2.5 border-t border-[#23232c] bg-[#14141c]">
        {!channel ? null : !isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full h-10 rounded-lg border border-[#272734] bg-[#181822] text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            Sign in to chat
          </button>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Send a message..."
                maxLength={500}
                className="w-full h-10 rounded-lg border border-[#272734] bg-[#181822] pl-3 pr-10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-white"
              />
              <button
                type="button"
                onClick={() => setShowEmotes((v) => !v)}
                className={cn('absolute right-2 h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors', showEmotes && 'text-white')}
                title="Quick reactions"
              >
                <Smile className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={cn(
                  'h-8 px-4 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5',
                  inputText.trim() ? 'hover:brightness-110 active:scale-95' : 'opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-500'
                )}
                style={inputText.trim() ? { backgroundColor: '#ffffff', color: '#000000' } : {}}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Chat</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'hidden lg:block shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-200 z-30',
          collapsed ? 'w-0 overflow-hidden border-0' : 'w-80 xl:w-88'
        )}
      >
        {!collapsed && chatContent}
      </aside>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex fixed right-4 bottom-6 z-40 h-10 px-3.5 rounded-full border border-[#2b2b3b] bg-[#181824] shadow-xl items-center gap-2 text-xs font-bold text-zinc-200 hover:bg-[#202030] hover:text-white transition-all"
        >
          <MessageSquare className="h-4 w-4 text-white" />
          <span>Expand chat</span>
        </button>
      )}

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10">{chatContent}</div>
        </div>
      )}
    </>
  )
}
