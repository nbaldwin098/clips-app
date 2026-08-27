import { useEffect, useMemo, useState } from 'react'
import { MessageSquare, Send, ArrowLeft, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  listCachedThreads,
  listCachedMessages,
  pullMyThreads,
  pullThreadMessages,
  openDmThread,
  sendDm,
  subscribeDmsChanged,
  unreadDmCount,
} from '../lib/directMessages'
import { listIndexedUsers as listUsers } from '../lib/moderation'
import ChannelAvatar from './ChannelAvatar'
import PageHeader from './PageHeader'
import { cn } from '../lib/utils'

function peerLabel(peerId, peerHandle) {
  if (peerHandle) return `@${String(peerHandle).replace(/^@/, '')}`
  const users = listUsers() || []
  const u = users.find((x) => x.id === peerId)
  if (u?.handle) return `@${u.handle}`
  if (u?.displayName) return u.displayName
  return peerId ? `${String(peerId).slice(0, 8)}…` : 'User'
}

function peerAvatar(peerId) {
  const users = listUsers() || []
  return users.find((x) => x.id === peerId) || null
}

export default function MessagesPage({
  onNavigate,
  onOpenAuth,
  initialPeerId = '',
  initialPeerHandle = '',
}) {
  const { user, isAuthenticated } = useAuth()
  const [tick, setTick] = useState(0)
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeQ, setComposeQ] = useState('')

  useEffect(() => subscribeDmsChanged(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    if (!user?.id) return undefined
    pullMyThreads(user).then(() => setTick((n) => n + 1)).catch(() => {})
    const t = setInterval(() => {
      pullMyThreads(user).then(() => setTick((n) => n + 1)).catch(() => {})
      if (activeId) pullThreadMessages(user, activeId).then(() => setTick((n) => n + 1)).catch(() => {})
    }, 12_000)
    return () => clearInterval(t)
  }, [user?.id, activeId])

  useEffect(() => {
    if (!user?.id || !initialPeerId) return
    let cancelled = false
    ;(async () => {
      const res = await openDmThread(user, { id: initialPeerId, handle: initialPeerHandle })
      if (cancelled) return
      if (!res.ok) {
        setNote(res.error || 'Could not open conversation.')
        return
      }
      setActiveId(res.thread.id)
      setMobileShowThread(true)
      await pullThreadMessages(user, res.thread.id)
      setTick((n) => n + 1)
    })()
    return () => { cancelled = true }
  }, [user?.id, initialPeerId, initialPeerHandle])

  const threads = useMemo(() => listCachedThreads(user?.id), [user?.id, tick])
  const active = threads.find((t) => t.id === activeId) || null
  const messages = useMemo(
    () => (activeId ? listCachedMessages(activeId) : []),
    [activeId, tick]
  )
  const unread = unreadDmCount(user?.id)

  const people = useMemo(() => {
    const q = String(composeQ || '').trim().toLowerCase().replace(/^@/, '')
    const all = (listUsers() || []).filter((u) => u?.id && u.id !== user?.id)
    if (!q) return all.slice(0, 12)
    return all
      .filter((u) => {
        const h = String(u.handle || '').toLowerCase()
        const n = String(u.displayName || '').toLowerCase()
        return h.includes(q) || n.includes(q)
      })
      .slice(0, 20)
  }, [composeQ, user?.id, tick])

  const selectThread = async (id) => {
    setActiveId(id)
    setMobileShowThread(true)
    setComposeOpen(false)
    setNote('')
    if (user) {
      await pullThreadMessages(user, id)
      setTick((n) => n + 1)
    }
  }

  const startWith = async (peer) => {
    if (!user || !peer?.id) return
    setBusy(true)
    setNote('')
    const res = await openDmThread(user, { id: peer.id, handle: peer.handle })
    setBusy(false)
    if (!res.ok) {
      setNote(res.error || 'Could not start conversation.')
      return
    }
    setComposeOpen(false)
    setComposeQ('')
    setActiveId(res.thread.id)
    setMobileShowThread(true)
    await pullThreadMessages(user, res.thread.id)
    setTick((n) => n + 1)
  }

  const onSend = async (e) => {
    e?.preventDefault?.()
    if (!user || !active?.peerId || busy) return
    setBusy(true)
    setNote('')
    const res = await sendDm({ me: user, peerId: active.peerId, body: draft })
    setBusy(false)
    if (!res.ok) {
      setNote(res.error || 'Could not send.')
      return
    }
    setDraft('')
    setTick((n) => n + 1)
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto text-sm text-zinc-400">
        <button type="button" onClick={onOpenAuth} className="text-white font-medium">Sign in</button>
        {' '}to use messages.
      </div>
    )
  }

  if (user?.provider !== 'supabase') {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-3">
        <PageHeader title="Messages" onBack={() => onNavigate?.('home')} />
        <button type="button" onClick={onOpenAuth} className="h-10 px-4 bg-white text-black text-sm font-semibold">
          Sign in with cloud
        </button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] min-h-[420px] flex flex-col max-w-5xl mx-auto">
      <div className="shrink-0 px-4 pt-4 pb-2 flex items-start justify-between gap-3">
        <PageHeader
          title="Messages"
          subtitle={unread ? `${unread} unread` : undefined}
          onBack={() => onNavigate?.('home')}
        />
        <button
          type="button"
          onClick={() => { setComposeOpen(true); setMobileShowThread(false) }}
          className="shrink-0 h-9 px-3 inline-flex items-center gap-1.5 bg-white text-black text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> New message
        </button>
      </div>

      <div className="flex-1 min-h-0 flex border-t border-zinc-800 mx-0 sm:mx-4 sm:mb-4 sm:border sm:border-zinc-800 overflow-hidden">
        <aside
          className={cn(
            'w-full sm:w-72 shrink-0 border-r border-zinc-800 flex flex-col bg-[#07070a]',
            mobileShowThread && !composeOpen ? 'hidden sm:flex' : 'flex'
          )}
        >
          {composeOpen ? (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2 border-b border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">New message</p>
                  <button type="button" className="text-[11px] text-zinc-400 hover:text-white" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </button>
                </div>
                <input
                  value={composeQ}
                  onChange={(e) => setComposeQ(e.target.value)}
                  placeholder="@handle"
                  className="w-full h-9 border border-zinc-700 bg-[#121218] px-3 text-sm text-white"
                  autoFocus
                />
              </div>
              <ul className="flex-1 overflow-y-auto">
                {people.length === 0 ? (
                  <li className="p-6 text-center text-xs text-zinc-500">No people found.</li>
                ) : people.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startWith(p)}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#121218]"
                    >
                      <ChannelAvatar src={p.avatarUrl} name={p.displayName || p.handle} size={36} />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{p.displayName || p.handle}</p>
                        <p className="text-[11px] text-zinc-500 truncate">@{String(p.handle || '').replace(/^@/, '')}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <li className="p-6 text-center text-xs text-zinc-500">
                  No messages yet.
                  <button type="button" className="block mx-auto mt-3 text-white underline" onClick={() => setComposeOpen(true)}>
                    Start a message
                  </button>
                </li>
              ) : threads.map((t) => {
                const peer = peerAvatar(t.peerId)
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectThread(t.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#121218]',
                        activeId === t.id && 'bg-[#141418]'
                      )}
                    >
                      <ChannelAvatar src={peer?.avatarUrl} name={peer?.displayName || t.peerHandle || '?'} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-white truncate">{peerLabel(t.peerId, t.peerHandle || peer?.handle)}</p>
                          {t.unread ? (
                            <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center">
                              {t.unread}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{t.lastBody || '—'}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section
          className={cn(
            'flex-1 min-w-0 flex flex-col bg-[#050506]',
            (!mobileShowThread || composeOpen) ? 'hidden sm:flex' : 'flex'
          )}
        >
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300">Select a conversation</p>
              <button
                type="button"
                className="mt-4 h-9 px-4 bg-white text-black text-xs font-semibold"
                onClick={() => setComposeOpen(true)}
              >
                New message
              </button>
            </div>
          ) : (
            <>
              <div className="shrink-0 h-12 px-3 border-b border-zinc-800 flex items-center gap-2">
                <button
                  type="button"
                  className="sm:hidden h-8 w-8 inline-flex items-center justify-center text-zinc-300"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to inbox"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-white truncate hover:underline"
                  onClick={() => {
                    const peer = peerAvatar(active.peerId)
                    onNavigate?.('profile', peer?.handle || active.peerHandle || '')
                  }}
                >
                  {peerLabel(active.peerId, active.peerHandle)}
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
                {messages.map((m) => {
                  const mine = m.senderId === user?.id
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[80%] px-3 py-2 text-sm',
                        mine ? 'bg-white text-black' : 'bg-[#1a1a22] text-zinc-100'
                      )}>
                        {m.body}
                      </div>
                    </div>
                  )
                })}
              </div>
              {note ? <p className="px-3 text-xs text-rose-400">{note}</p> : null}
              <form onSubmit={onSend} className="shrink-0 p-3 border-t border-zinc-800 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message"
                  className="flex-1 h-10 border border-zinc-700 bg-[#121218] px-3 text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="h-10 w-10 inline-flex items-center justify-center bg-white text-black disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
