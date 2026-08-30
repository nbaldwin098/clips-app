/**
 * Cloud live chat — Supabase is source of truth.
 * Creator channels use live_chat_messages (uuid channel_id).
 * Lobby uses global_live_chat (room_id text) — migration 0017.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getGraphActor } from './graphSync'

const LOCAL_PREFIX = 'live_chat_'
const MAX = 200
export const GLOBAL_LIVE_ROOM = 'lobby'
export const GLOBAL_LIVE_CHANNEL_ID = '__calabi_global__'

/** Shared realtime/poll hubs by resolved id — one subscribe per channel. */
const hubs = new Map()

const GLOBAL_ALIASES = new Set([
  '',
  GLOBAL_LIVE_CHANNEL_ID.toLowerCase(),
  GLOBAL_LIVE_ROOM,
  'global',
  '__clips_global__',
])

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))
}

export function isGlobalLiveChannel(channelId) {
  const key = String(channelId || '').trim().toLowerCase()
  return GLOBAL_ALIASES.has(key)
}

/** Normalize lobby aliases to one cache/subscribe key. */
export function resolveLiveChatChannelId(channelId) {
  const raw = String(channelId || '').trim()
  if (isGlobalLiveChannel(raw)) return GLOBAL_LIVE_CHANNEL_ID
  return raw
}

/** Drop duplicate message ids (upsert + realtime can double-emit). */
export function dedupeLiveChatMessages(list) {
  const seen = new Set()
  const out = []
  for (const row of Array.isArray(list) ? list : []) {
    const id = row?.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

function rowToMessage(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    handle: row.handle || '',
    text: row.body || '',
    kind: row.kind || 'chat',
    amount: row.amount != null ? Number(row.amount) : undefined,
    at: row.created_at || new Date().toISOString(),
  }
}

function cache(channelId, list) {
  lsSet(`${LOCAL_PREFIX}${channelId}`, list.slice(-MAX))
}

export function readLocalLiveChat(channelId) {
  const key = resolveLiveChatChannelId(channelId)
  if (!key) return []
  return lsGet(`${LOCAL_PREFIX}${key}`, []) || []
}

async function fetchGlobalChat() {
  const room = GLOBAL_LIVE_ROOM
  const key = GLOBAL_LIVE_CHANNEL_ID
  if (!isSupabaseConfigured()) return readLocalLiveChat(key)
  try {
    const sb = await getSupabase()
    if (!sb) return readLocalLiveChat(key)
    const { data, error } = await sb
      .from('global_live_chat')
      .select('id, room_id, user_id, handle, body, kind, amount, created_at')
      .eq('room_id', room)
      .order('created_at', { ascending: true })
      .limit(MAX)
    if (error || !Array.isArray(data)) return readLocalLiveChat(key)
    const mapped = data.map(rowToMessage).filter(Boolean)
    cache(key, mapped)
    return mapped
  } catch {
    return readLocalLiveChat(key)
  }
}

export async function fetchLiveChat(channelId) {
  if (isGlobalLiveChannel(channelId)) return fetchGlobalChat()
  const resolved = resolveLiveChatChannelId(channelId)
  if (!resolved) return []
  if (!isSupabaseConfigured() || !isUuid(resolved)) {
    return readLocalLiveChat(resolved)
  }
  try {
    const sb = await getSupabase()
    if (!sb) return readLocalLiveChat(resolved)
    const { data, error } = await sb
      .from('live_chat_messages')
      .select('id, channel_id, user_id, handle, body, kind, amount, created_at')
      .eq('channel_id', resolved)
      .order('created_at', { ascending: true })
      .limit(MAX)
    if (error || !Array.isArray(data)) return readLocalLiveChat(resolved)
    const mapped = data.map(rowToMessage).filter(Boolean)
    cache(resolved, mapped)
    return mapped
  } catch {
    return readLocalLiveChat(resolved)
  }
}

export function pushLiveChatMessage(channelId, message) {
  const resolved = resolveLiveChatChannelId(channelId)
  const row = {
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: message.userId,
    handle: message.handle || '',
    text: String(message.text || '').slice(0, 500),
    kind: message.kind || 'chat',
    amount: message.amount,
    at: message.at || new Date().toISOString(),
  }
  const local = readLocalLiveChat(resolved)
  local.push(row)
  cache(resolved, local)

  if (!isSupabaseConfigured()) return row

  ;(async () => {
    const sb = await getSupabase()
    if (!sb) return
    try {
      if (isGlobalLiveChannel(channelId)) {
        const { error } = await sb.from('global_live_chat').upsert({
          id: row.id,
          room_id: GLOBAL_LIVE_ROOM,
          user_id: String(row.userId || ''),
          handle: row.handle,
          body: row.text,
          kind: row.kind,
          amount: row.amount ?? null,
          created_at: row.at,
        })
        if (error) console.warn('[liveChat] global upsert failed:', error.message)
        return
      }
      if (!isUuid(resolved)) return
      const { error } = await sb.from('live_chat_messages').upsert({
        id: row.id,
        channel_id: resolved,
        user_id: String(row.userId || ''),
        handle: row.handle,
        body: row.text,
        kind: row.kind,
        amount: row.amount ?? null,
        created_at: row.at,
      })
      if (error) console.warn('[liveChat] upsert failed:', error.message)
    } catch (err) {
      console.warn('[liveChat] upsert threw:', err?.message || err)
    }
  })()

  return row
}

export async function removeLiveChatMessageCloud(channelId, messageId) {
  const resolved = resolveLiveChatChannelId(channelId)
  const local = readLocalLiveChat(resolved).filter((m) => m.id !== messageId)
  cache(resolved, local)
  if (!isSupabaseConfigured()) return local
  try {
    const sb = await getSupabase()
    if (!sb) return local
    if (isGlobalLiveChannel(channelId)) {
      await sb.from('global_live_chat').delete().eq('id', messageId)
    } else if (isUuid(resolved)) {
      await sb.from('live_chat_messages').delete().eq('id', messageId).eq('channel_id', resolved)
    }
  } catch { /* ignore */ }
  return local
}

function tearDownChannel(sb, channel) {
  if (!sb || !channel) return
  try { sb.removeChannel(channel) } catch { /* ignore */ }
}

function emitHub(hub, list) {
  const clean = dedupeLiveChatMessages(list)
  for (const fn of hub.listeners) {
    try { fn(clean) } catch { /* ignore */ }
  }
}

function pollTick(resolved, hub) {
  if (hub.cancelled) return
  fetchLiveChat(resolved)
    .then((list) => emitHub(hub, list))
    .catch(() => emitHub(hub, readLocalLiveChat(resolved)))
}

function startPoll(resolved, hub) {
  if (hub.pollTimer || hub.cancelled) return
  if (typeof window === 'undefined' || typeof window.setInterval !== 'function') {
    pollTick(resolved, hub)
    return
  }
  pollTick(resolved, hub)
  hub.pollTimer = window.setInterval(() => pollTick(resolved, hub), 4000)
}

function stopPoll(hub) {
  if (hub.pollTimer && typeof window !== 'undefined') {
    window.clearInterval(hub.pollTimer)
  }
  hub.pollTimer = null
}

function attachRealtime(resolved, hub) {
  if (hub.cancelled) return
  if (!isSupabaseConfigured() || !(isGlobalLiveChannel(resolved) || isUuid(resolved))) {
    startPoll(resolved, hub)
    return
  }
  ;(async () => {
    const sb = await getSupabase()
    hub.sbRef = sb
    if (!sb || hub.cancelled) {
      startPoll(resolved, hub)
      return
    }

    const topic = isGlobalLiveChannel(resolved)
      ? `global-live-chat:${GLOBAL_LIVE_ROOM}`
      : `live-chat:${resolved}`

    const refresh = () => pollTick(resolved, hub)

    tearDownChannel(sb, hub.channel)
    const ch = sb.channel(topic)
    if (isGlobalLiveChannel(resolved)) {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_live_chat', filter: `room_id=eq.${GLOBAL_LIVE_ROOM}` },
        refresh,
      )
    } else {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_chat_messages', filter: `channel_id=eq.${resolved}` },
        refresh,
      )
    }

    ch.subscribe((status) => {
      if (hub.cancelled) return
      if (status === 'SUBSCRIBED') {
        stopPoll(hub)
        refresh()
        return
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('[liveChat] realtime', status, topic)
        startPoll(resolved, hub)
        refresh()
      }
    })

    hub.channel = ch
    if (hub.cancelled) {
      tearDownChannel(sb, ch)
      hub.channel = null
    }
  })()
}

function bindReconnect(resolved, hub) {
  if (typeof window === 'undefined' || hub.reconnectBound) return
  hub.reconnectBound = true
  hub.onOnline = () => {
    if (hub.cancelled) return
    startPoll(resolved, hub)
    attachRealtime(resolved, hub)
  }
  hub.onVis = () => {
    if (hub.cancelled) return
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      startPoll(resolved, hub)
      attachRealtime(resolved, hub)
    }
  }
  window.addEventListener('online', hub.onOnline)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', hub.onVis)
  }
}

function unbindReconnect(hub) {
  if (typeof window === 'undefined') return
  if (hub.onOnline) window.removeEventListener('online', hub.onOnline)
  if (hub.onVis && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', hub.onVis)
  }
  hub.onOnline = null
  hub.onVis = null
  hub.reconnectBound = false
}

function disposeHub(resolved, hub) {
  hub.cancelled = true
  stopPoll(hub)
  unbindReconnect(hub)
  tearDownChannel(hub.sbRef, hub.channel)
  hub.channel = null
  if (hubs.get(resolved) === hub) hubs.delete(resolved)
}

export function subscribeLiveChat(channelId, onMessages) {
  const resolved = resolveLiveChatChannelId(channelId)
  if (!resolved || typeof onMessages !== 'function') return () => {}

  let hub = hubs.get(resolved)
  if (!hub || hub.cancelled) {
    hub = {
      listeners: new Set(),
      cancelled: false,
      channel: null,
      pollTimer: null,
      sbRef: null,
      reconnectBound: false,
      onOnline: null,
      onVis: null,
    }
    hubs.set(resolved, hub)
    fetchLiveChat(resolved)
      .then((list) => emitHub(hub, list))
      .catch(() => emitHub(hub, readLocalLiveChat(resolved)))
    attachRealtime(resolved, hub)
    bindReconnect(resolved, hub)
  }

  hub.listeners.add(onMessages)
  const cached = readLocalLiveChat(resolved)
  if (cached.length) onMessages(dedupeLiveChatMessages(cached))

  return () => {
    hub.listeners.delete(onMessages)
    if (hub.listeners.size === 0) disposeHub(resolved, hub)
  }
}

export function canSyncLiveChat(channelId) {
  if (isGlobalLiveChannel(channelId)) return !!(getGraphActor()?.id && isSupabaseConfigured())
  return !!(getGraphActor()?.id && isUuid(resolveLiveChatChannelId(channelId)))
}
