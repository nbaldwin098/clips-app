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

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))
}

export function isGlobalLiveChannel(channelId) {
  return !channelId || channelId === GLOBAL_LIVE_CHANNEL_ID || channelId === GLOBAL_LIVE_ROOM
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
  return lsGet(`${LOCAL_PREFIX}${channelId}`, []) || []
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
  if (!channelId) return []
  if (!isSupabaseConfigured() || !isUuid(channelId)) {
    return readLocalLiveChat(channelId)
  }
  try {
    const sb = await getSupabase()
    if (!sb) return readLocalLiveChat(channelId)
    const { data, error } = await sb
      .from('live_chat_messages')
      .select('id, channel_id, user_id, handle, body, kind, amount, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(MAX)
    if (error || !Array.isArray(data)) return readLocalLiveChat(channelId)
    const mapped = data.map(rowToMessage).filter(Boolean)
    cache(channelId, mapped)
    return mapped
  } catch {
    return readLocalLiveChat(channelId)
  }
}

export function pushLiveChatMessage(channelId, message) {
  const resolved = isGlobalLiveChannel(channelId) ? GLOBAL_LIVE_CHANNEL_ID : channelId
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
        await sb.from('global_live_chat').upsert({
          id: row.id,
          room_id: GLOBAL_LIVE_ROOM,
          user_id: String(row.userId || ''),
          handle: row.handle,
          body: row.text,
          kind: row.kind,
          amount: row.amount ?? null,
          created_at: row.at,
        })
        return
      }
      if (!isUuid(channelId)) return
      await sb.from('live_chat_messages').upsert({
        id: row.id,
        channel_id: channelId,
        user_id: String(row.userId || ''),
        handle: row.handle,
        body: row.text,
        kind: row.kind,
        amount: row.amount ?? null,
        created_at: row.at,
      })
    } catch { /* cache still works */ }
  })()

  return row
}

export async function removeLiveChatMessageCloud(channelId, messageId) {
  const resolved = isGlobalLiveChannel(channelId) ? GLOBAL_LIVE_CHANNEL_ID : channelId
  const local = readLocalLiveChat(resolved).filter((m) => m.id !== messageId)
  cache(resolved, local)
  if (!isSupabaseConfigured()) return local
  try {
    const sb = await getSupabase()
    if (!sb) return local
    if (isGlobalLiveChannel(channelId)) {
      await sb.from('global_live_chat').delete().eq('id', messageId)
    } else if (isUuid(channelId)) {
      await sb.from('live_chat_messages').delete().eq('id', messageId).eq('channel_id', channelId)
    }
  } catch { /* ignore */ }
  return local
}

export function subscribeLiveChat(channelId, onMessages) {
  const resolved = isGlobalLiveChannel(channelId) ? GLOBAL_LIVE_CHANNEL_ID : channelId
  if (!resolved) return () => {}
  let cancelled = false
  let unsub = () => {}

  fetchLiveChat(resolved).then((list) => {
    if (!cancelled) onMessages(list)
  })

  if (isSupabaseConfigured() && (isGlobalLiveChannel(channelId) || isUuid(channelId))) {
    ;(async () => {
      const sb = await getSupabase()
      if (!sb || cancelled) return
      if (isGlobalLiveChannel(channelId)) {
        const channel = sb
          .channel(`global-live-chat:${GLOBAL_LIVE_ROOM}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'global_live_chat', filter: `room_id=eq.${GLOBAL_LIVE_ROOM}` },
            () => {
              fetchGlobalChat().then((list) => {
                if (!cancelled) onMessages(list)
              })
            },
          )
          .subscribe()
        unsub = () => {
          try { sb.removeChannel(channel) } catch { /* ignore */ }
        }
        return
      }
      const channel = sb
        .channel(`live-chat:${channelId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_chat_messages', filter: `channel_id=eq.${channelId}` },
          () => {
            fetchLiveChat(channelId).then((list) => {
              if (!cancelled) onMessages(list)
            })
          },
        )
        .subscribe()
      unsub = () => {
        try { sb.removeChannel(channel) } catch { /* ignore */ }
      }
    })()
  } else {
    const interval = window.setInterval(() => {
      onMessages(readLocalLiveChat(resolved))
    }, 4000)
    unsub = () => window.clearInterval(interval)
  }

  return () => {
    cancelled = true
    unsub()
  }
}

export function canSyncLiveChat(channelId) {
  if (isGlobalLiveChannel(channelId)) return !!(getGraphActor()?.id && isSupabaseConfigured())
  return !!(getGraphActor()?.id && isUuid(channelId))
}
