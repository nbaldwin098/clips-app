import { useState, useEffect, useRef } from 'react'
import {
  Send,
  Smile,
  Settings,
  Shield,
  ChevronRight,
  MessageSquare,
  X,
  Image,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'
import { trySendLiveChat, removeLiveChatMessage } from '../lib/liveChat'
import { subscribeLiveChat, GLOBAL_LIVE_CHANNEL_ID, isGlobalLiveChannel } from '../lib/liveChatSync'
import { isChannelMod, timeoutChatUser, banChatUser } from '../lib/channelStaff'
import { startTipCheckout, TIP_AMOUNTS, TIP_AMOUNT_MIN, TIP_AMOUNT_MAX } from '../lib/tips'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'
import CoinIcon from './CoinIcon'
import { redirectSafeUrl } from '../lib/safeUrl'

const QUICK_EMOTES = [
  '😀', '😂', '❤️', '🔥', '👏', '🎉', '👀', '💯', '🙌', '😮', '😢', '🤔',
  '👍', '👎', '💀', '✨', '🫡', '🎮', '⚡', '🏆',
]

const QUICK_GIFS = [
  { label: 'Clap', url: 'https://media.giphy.com/media/111rbok8Ohclq/giphy.gif' },
  { label: 'Wow', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { label: 'GG', url: 'https://media.giphy.com/media/26BRuo6sOlfd6fa92/giphy.gif' },
  { label: 'Hype', url: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif' },
  { label: 'LOL', url: 'https://media.giphy.com/media/13CoXDiaIcGvhu/giphy.gif' },
  { label: 'Heart', url: 'https://media.giphy.com/media/26BRBK7GdjwoC5lqE/giphy.gif' },
]

const GIF_RE = /\[gif\](https?:\/\/[^\s]+)\[\/gif\]/i

function ChatBody({ text }) {
  const raw = String(text || '')
  const gifMatch = raw.match(GIF_RE)
  if (gifMatch) {
    return (
      <span className="inline-block align-middle">
        <img src={gifMatch[1]} alt="" className="max-h-24 rounded-md border border-zinc-700 mt-0.5" loading="lazy" />
      </span>
    )
  }
  return <span className="text-zinc-200 select-text">{raw}</span>
}

export default function LiveChatPanel({
  channel,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  onOpenAuth,
}) {
  const { user, isAuthenticated } = useAuth()

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [picker, setPicker] = useState('')
  const [chatError, setChatError] = useState('')
  const [tipBusy, setTipBusy] = useState('')
  const [customTip, setCustomTip] = useState('')
  const [timestampsEnabled, setTimestampsEnabled] = useState(false)
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false)
  const [liveRegion, setLiveRegion] = useState('')

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const isScrolledToBottomRef = useRef(true)

  const streamUserId = channel?.userId || GLOBAL_LIVE_CHANNEL_ID
  const isGlobal = isGlobalLiveChannel(streamUserId) || !channel?.userId

  useEffect(() => {
    return subscribeLiveChat(streamUserId, (list) => {
      setMessages(list)
      const last = list[list.length - 1]
      if (last?.text) setLiveRegion(`${last.handle || 'viewer'}: ${last.text}`)
    })
  }, [streamUserId])

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
    if (!inputText.trim()) return
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    const result = trySendLiveChat(isGlobal ? GLOBAL_LIVE_CHANNEL_ID : streamUserId, {
      userId: user.id,
      handle: user.handle,
      text: inputText.trim().slice(0, 500),
    }, { actor: user })
    if (!result.ok) {
      setChatError(result.error || 'Could not send.')
      return
    }
    setChatError('')
    setInputText('')
    setPicker('')
    isScrolledToBottomRef.current = true
    scrollToBottom()
  }

  const donateLive = async (amount) => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    if (isGlobal || !channel?.userId) {
      setChatError('Open a creator stream to tip.')
      return
    }
    setTipBusy(String(amount))
    const result = await startTipCheckout({
      user,
      kind: 'live_tip',
      creatorId: streamUserId,
      amount,
      handle: user.handle,
    })
    setTipBusy('')
    setChatError(result.message || '')
    if (result.url) redirectSafeUrl(result.url)
  }

  const canMod = isAuthenticated && !isGlobal && streamUserId && isChannelMod(streamUserId, user)

  const handleAddEmote = (symbol) => {
    setInputText((prev) => (prev ? `${prev} ${symbol}` : symbol))
  }

  const handleAddGif = (url) => {
    setInputText(`[gif]${url}[/gif]`)
    setPicker('')
  }

  const chatContent = (
    <div className="flex flex-col h-full bg-[#000000] border-l border-[#23232c] relative select-none">
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
            {isGlobal ? 'Global chat' : `@${channel?.handle || 'creator'} chat`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setChatSettingsOpen((o) => !o)}
            className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27] transition-colors"
            title="Chat settings"
            aria-label="Chat settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27]"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {chatSettingsOpen && (
        <div className="absolute top-12 left-3 right-3 z-30 p-3 rounded-xl border border-[#2d2d3c] bg-[#14141d] shadow-2xl space-y-2 animate-in fade-in zoom-in-95" role="dialog" aria-label="Chat preferences">
          <div className="flex items-center justify-between pb-1 border-b border-[#23232c]">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Chat preferences</span>
            <button type="button" onClick={() => setChatSettingsOpen(false)} className="text-zinc-400 hover:text-white" aria-label="Close chat preferences">
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

      <div aria-live="polite" aria-atomic="true" className="sr-only">{liveRegion}</div>
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 text-xs" role="log" aria-label="Live chat messages">
        {messages.length === 0 ? (
          <div className="p-3 rounded-lg bg-[#181824] border border-[#252536] text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span>
              {isGlobal
                ? 'Global chat — say something, or open a live creator for their room.'
                : 'No messages yet. Be the first to say something!'}
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const isHost = !isGlobal && m.userId === channel?.userId
            const isSelf = isAuthenticated && m.userId === user?.id
            const isGift = m.kind === 'donation'
            const isBot = m.kind === 'bot'
            return (
              <div
                key={m.id}
                className={cn(
                  'chat-message-text leading-relaxed hover:bg-[#161622] rounded px-1.5 py-0.5 -mx-1.5 transition-colors',
                  isSelf && 'bg-[#181826]',
                  isGift && 'bg-white/10 border border-white/20 py-1.5'
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
                {isBot && (
                  <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase mr-1.5 align-middle bg-white/10 text-zinc-200">
                    Bot
                  </span>
                )}
                {isGift && (
                  <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase mr-1.5 align-middle bg-white text-black">
                    ${Number(m.amount || 0).toFixed(2)}
                  </span>
                )}
                <span className={cn('font-bold mr-1.5', isSelf ? 'text-white' : 'text-zinc-300')}>
                  {m.handle || 'viewer'}:
                </span>
                <ChatBody text={m.text} />
                {canMod && m.kind !== 'bot' && m.userId !== channel?.userId && (
                  <span className="ml-2 inline-flex gap-1">
                    <button type="button" className="text-[10px] text-zinc-500 hover:text-white" onClick={() => { timeoutChatUser(streamUserId, m.userId, 60); setChatError('Timed out 60s.') }}>Timeout</button>
                    <button type="button" className="text-[10px] text-zinc-500 hover:text-white" onClick={() => { banChatUser(streamUserId, m.userId, true); setChatError('Banned.') }}>Ban</button>
                    <button type="button" className="text-[10px] text-zinc-500 hover:text-white" onClick={() => { removeLiveChatMessage(streamUserId, m.id) }}>Delete</button>
                  </span>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {picker ? (
        <div className="p-2 border-t border-[#23232c] bg-[#161620] animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-1.5 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {picker === 'gif' ? 'GIF reactions' : 'Emoji reactions'}
            </span>
            <button type="button" onClick={() => setPicker('')} className="text-zinc-500 hover:text-zinc-200" aria-label="Close picker">
              <X className="h-3 w-3" />
            </button>
          </div>
          {picker === 'gif' ? (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {QUICK_GIFS.map((gif) => (
                <button
                  key={gif.url}
                  type="button"
                  onClick={() => handleAddGif(gif.url)}
                  className="rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500"
                  title={gif.label}
                >
                  <img src={gif.url} alt={gif.label} className="h-16 w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
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
          )}
        </div>
      ) : null}

      <div className="p-2.5 border-t border-[#23232c] bg-[#14141c]">
        {!isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full h-10 rounded-lg border border-[#272734] bg-[#181822] text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            Sign in to chat
          </button>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {!isGlobal && ownCheckoutConfigured() ? (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1">
                  {TIP_AMOUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={!!tipBusy || streamUserId === user?.id}
                      onClick={() => donateLive(n)}
                      className="h-7 px-2 rounded-md bg-white/10 text-[11px] font-semibold text-white disabled:opacity-40"
                    >
                      {tipBusy === String(n) ? '…' : `$${n}`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={TIP_AMOUNT_MIN}
                    max={TIP_AMOUNT_MAX}
                    step="0.01"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder={`$${TIP_AMOUNT_MIN}–${TIP_AMOUNT_MAX}`}
                    className="h-7 w-24 rounded-md border border-zinc-800 bg-black px-2 text-[11px] text-white"
                  />
                  <button
                    type="button"
                    disabled={!!tipBusy || !customTip || streamUserId === user?.id}
                    onClick={() => donateLive(customTip)}
                    className="h-7 px-2 rounded-md bg-white text-[11px] font-semibold text-black disabled:opacity-40"
                  >
                    {tipBusy === customTip ? '…' : 'Give'}
                  </button>
                </div>
              </div>
            ) : !isGlobal ? (
              <p className="text-[10px] text-zinc-600">Live donate needs own Stripe Checkout (deploy create-checkout-session).</p>
            ) : null}
            {chatError ? <p className="text-[11px] text-red-400">{chatError}</p> : null}
            <div className="relative flex items-center gap-1">
              <span className="absolute left-2.5 z-10 pointer-events-none">
                <CoinIcon className="h-3.5 w-3.5" title="Coins" />
              </span>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Send a message..."
                maxLength={500}
                className="w-full h-10 rounded-lg border border-[#272734] bg-[#181822] pl-8 pr-20 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-white"
              />
              <button
                type="button"
                onClick={() => setPicker((v) => (v === 'emoji' ? '' : 'emoji'))}
                className={cn('absolute right-10 h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors', picker === 'emoji' && 'text-white')}
                title="Emoji"
                aria-label="Insert emoji"
              >
                <Smile className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPicker((v) => (v === 'gif' ? '' : 'gif'))}
                className={cn('absolute right-2 h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors', picker === 'gif' && 'text-white')}
                title="GIF"
                aria-label="Insert GIF"
              >
                <Image className="h-4 w-4" />
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
