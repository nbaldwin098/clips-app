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

/** Active realtime channels by resolved id — avoid duplicate subscribe. */
const activeSubs = new Map()

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))
}

export function isGlobalLiveChannel(channelId) {
  return !channelId || channelId === GLOBAL_LIVE_CHANNEL_ID || channelId === GLOBAL_LIVE_ROOM
}

/** Normalize lobby aliases to one cache/subscribe key. */
export function resolveLiveChatChannelId(channelId) {
  if (isGlobalLiveChannel(channelId)) return GLOBAL_LIVE_CHANNEL_ID
  return channelId || ''
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

export function subscribeLiveChat(channelId, onMessages) {
  const resolved = resolveLiveChatChannelId(channelId)
  if (!resolved) return () => {}
  let cancelled = false
  let channel = null
  let pollTimer = null
  let sbRef = null

  const emit = (list) => {
    if (!cancelled) onMessages(list)
  }

  fetchLiveChat(resolved).then(emit).catch(() => emit(readLocalLiveChat(resolved)))

  const startPoll = () => {
    if (pollTimer || cancelled) return
    pollTimer = window.setInterval(() => {
      emit(readLocalLiveChat(resolved))
    }, 4000)
  }

  const stopPoll = () => {
    if (pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const prev = activeSubs.get(resolved)
  if (prev) {
    try { prev() } catch { /* ignore */ }
    activeSubs.delete(resolved)
  }

  if (isSupabaseConfigured() && (isGlobalLiveChannel(channelId) || isUuid(resolved))) {
    ;(async () => {
      const sb = await getSupabase()
      sbRef = sb
      if (!sb || cancelled) {
        startPoll()
        return
      }

      const topic = isGlobalLiveChannel(channelId)
        ? `global-live-chat:${GLOBAL_LIVE_ROOM}`
        : `live-chat:${resolved}`

      const refresh = () => {
        fetchLiveChat(resolved).then(emit).catch(() => emit(readLocalLiveChat(resolved)))
      }

      const ch = sb.channel(topic)
      if (isGlobalLiveChannel(channelId)) {
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
        if (cancelled) return
        if (status === 'SUBSCRIBED') {
          stopPoll()
          refresh()
          return
        }
        // TIMED_OUT / CHANNEL_ERROR / CLOSED — keep local poll + refetch
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[liveChat] realtime', status, topic)
          startPoll()
          refresh()
        }
      })

      channel = ch
      if (cancelled) {
        tearDownChannel(sb, ch)
        channel = null
      }
    })()
  } else {
    startPoll()
  }

  const unsub = () => {
    cancelled = true
    stopPoll()
    tearDownChannel(sbRef, channel)
    channel = null
    if (activeSubs.get(resolved) === unsub) activeSubs.delete(resolved)
  }
  activeSubs.set(resolved, unsub)
  return unsub
}

export function canSyncLiveChat(channelId) {
  if (isGlobalLiveChannel(channelId)) return !!(getGraphActor()?.id && isSupabaseConfigured())
  return !!(getGraphActor()?.id && isUuid(resolveLiveChatChannelId(channelId)))
}
