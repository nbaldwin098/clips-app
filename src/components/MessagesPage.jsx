import { useState, useEffect, useRef, useCallback } from 'react'
import { Lock, Search, Send, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'
import ChannelAvatar from './ChannelAvatar'
import {
  dmAvailableFor,
  publishMyPublicKey,
  findMessengablePeer,
  listConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToConversation,
  subscribeToInbox,
  MAX_MESSAGE_CHARS,
} from '../lib/directMessages'

const LIST_POLL_MS = 8000
const THREAD_POLL_MS = 6000

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'now'
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function MessagesPage({ peerParam }) {
  const { user } = useAuth()
  const available = dmAvailableFor(user)

  const [conversations, setConversations] = useState([])
  const [activePeer, setActivePeer] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(false)

  const messagesEndRef = useRef(null)
  const resolvedParam = useRef('')

  const refreshConversations = useCallback(async () => {
    if (!available) return
    const list = await listConversations(user)
    setConversations(list)
  }, [available, user])

  useEffect(() => {
    if (!available) return undefined
    publishMyPublicKey(user)
    refreshConversations()
    const interval = setInterval(refreshConversations, LIST_POLL_MS)
    let unsub = () => {}
    subscribeToInbox(user.id, () => refreshConversations()).then((fn) => { unsub = fn })
    return () => {
      clearInterval(interval)
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, user?.id])

  const openPeer = useCallback((peer) => {
    setActivePeer(peer)
    setMobileShowThread(true)
    setError('')
  }, [])

  useEffect(() => {
    if (!available || !peerParam || resolvedParam.current === peerParam) return
    resolvedParam.current = peerParam
    ;(async () => {
      const peer = await findMessengablePeer(peerParam)
      if (peer && peer.id !== user.id) openPeer(peer)
    })()
  }, [available, peerParam, user?.id, openPeer])

  const refreshMessages = useCallback(async () => {
    if (!available || !activePeer) return
    const list = await getMessages(user, activePeer)
    setMessages(list)
  }, [available, activePeer, user])

  useEffect(() => {
    if (!available || !activePeer) return undefined
    refreshMessages()
    markConversationRead(user, activePeer.id)
    const interval = setInterval(refreshMessages, THREAD_POLL_MS)
    let unsub = () => {}
    const conversationId = [user.id, activePeer.id].sort().join(':')
    subscribeToConversation(conversationId, () => {
      refreshMessages()
      markConversationRead(user, activePeer.id)
    }).then((fn) => { unsub = fn })
    return () => {
      clearInterval(interval)
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, activePeer?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const runSearch = async (e) => {
    e?.preventDefault()
    const q = search.trim()
    if (!q) return
    setSearchBusy(true)
    setError('')
    const peer = await findMessengablePeer(q)
    setSearchBusy(false)
    if (!peer) {
      setError(`No one found at @${q.replace(/^@/, '')}.`)
      return
    }
    if (peer.id === user.id) {
      setError('That is you.')
      return
    }
    setSearch('')
    openPeer(peer)
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim() || !activePeer || busy) return
    setBusy(true)
    setError('')
    const text = input
    setInput('')
    const result = await sendMessage(user, activePeer, text)
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Message did not send.')
      setInput(text)
      return
    }
    setMessages((prev) => [...prev, result.message])
    refreshConversations()
  }

  if (!available) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 min-h-[50vh]">
        <div className="max-w-md text-center">
          <Lock className="h-8 w-8 text-zinc-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-white">Messages need a synced account</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Direct messages are end-to-end encrypted and delivered across devices through a real,
            signed-in account (email or phone) — not the local demo logins, which live on this device only.
            Create a real account in Settings, or sign out and sign back in with email or phone.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-[#000000]">
      <aside
        className={cn(
          'w-full sm:w-72 md:w-80 shrink-0 border-r border-[#1e1e27] flex flex-col',
          mobileShowThread && 'hidden sm:flex'
        )}
      >
        <div className="p-3 border-b border-[#1e1e27]">
          <h1 className="text-sm font-bold text-white px-1 pb-2">Messages</h1>
          <form onSubmit={runSearch} className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Message @handle…"
              className="w-full h-9 rounded-lg border border-[#272734] bg-[#121218] pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
            />
            <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </form>
          {searchBusy && <p className="text-[10px] text-zinc-500 mt-1.5 px-1">Looking…</p>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-zinc-500">
              No conversations yet. Search a @handle to start one.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.conversationId}
                type="button"
                onClick={() => openPeer(c.peer)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#14141c] transition-colors',
                  activePeer?.id === c.peer.id && 'bg-[#14141c]'
                )}
              >
                <ChannelAvatar src={c.peer.avatarUrl} name={c.peer.displayName} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('text-xs truncate', c.unread ? 'font-bold text-white' : 'font-medium text-zinc-200')}>
                      {c.peer.displayName}
                    </span>
                    <span className="text-[10px] text-zinc-500 shrink-0">{timeAgo(c.lastMessageAt)}</span>
                  </span>
                  <span className={cn('block text-[11px] truncate', c.unread ? 'text-zinc-200' : 'text-zinc-500')}>
                    {c.preview || '🔒 Encrypted message'}
                  </span>
                </span>
                {c.unread && <span className="h-2 w-2 rounded-full bg-white shrink-0" />}
              </button>
            ))
          )}
        </div>
      </aside>

      <section className={cn('flex-1 flex flex-col min-w-0', !mobileShowThread && 'hidden sm:flex')}>
        {!activePeer ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <ShieldCheck className="h-7 w-7 text-zinc-600" />
            <p className="text-sm text-zinc-500">Pick a conversation, or search a @handle to start one.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#1e1e27] bg-[#0a0a0c]">
              <button
                type="button"
                onClick={() => setMobileShowThread(false)}
                className="sm:hidden h-8 w-8 flex items-center justify-center rounded text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <ChannelAvatar src={activePeer.avatarUrl} name={activePeer.displayName} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{activePeer.displayName}</p>
                <p className="text-[10px] text-zinc-500 truncate">@{activePeer.handle || 'user'}</p>
              </div>
              <span
                className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-500 shrink-0"
                title="Messages are end-to-end encrypted — this device holds the only key"
              >
                <Lock className="h-3 w-3" /> Encrypted
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 pt-6">
                  No messages yet. Say hello — only you two can read it.
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-snug break-words',
                        m.mine ? 'bg-white text-black' : 'bg-[#1a1a22] text-zinc-100 border border-[#26262f]'
                      )}
                    >
                      {m.ok ? m.text : <span className="italic text-zinc-500">🔒 Can't decrypt on this device</span>}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-2.5 border-t border-[#1e1e27] flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activePeer.publicKey ? 'Send an encrypted message…' : `@${activePeer.handle || 'they'} has not turned on messages yet`}
                maxLength={MAX_MESSAGE_CHARS}
                disabled={!activePeer.publicKey}
                className="flex-1 h-10 rounded-lg border border-[#272734] bg-[#121218] px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy || !activePeer.publicKey}
                className="h-10 w-10 flex items-center justify-center rounded-lg bg-white text-black disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            {error && <p className="px-3 pb-2 text-[11px] text-red-400">{error}</p>}
          </>
        )}
      </section>
    </div>
  )
}
