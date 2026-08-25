/**
 * Cloud live chat — Supabase is source of truth when configured.
 * Local storage remains a cache for offline / non-cloud sessions.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getGraphActor } from './graphSync'

const LOCAL_PREFIX = 'live_chat_'
const MAX = 200

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))
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

export async function fetchLiveChat(channelId) {
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
  const row = {
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: message.userId,
    handle: message.handle || '',
    text: String(message.text || '').slice(0, 500),
    kind: message.kind || 'chat',
    amount: message.amount,
    at: message.at || new Date().toISOString(),
  }
  const local = readLocalLiveChat(channelId)
  local.push(row)
  cache(channelId, local)

  if (!isSupabaseConfigured() || !isUuid(channelId)) return row

  ;(async () => {
    const sb = await getSupabase()
    if (!sb) return
    try {
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
    } catch { /* local cache still works */ }
  })()

  return row
}

export async function removeLiveChatMessageCloud(channelId, messageId) {
  const local = readLocalLiveChat(channelId).filter((m) => m.id !== messageId)
  cache(channelId, local)
  if (!isSupabaseConfigured() || !isUuid(channelId)) return local
  try {
    const sb = await getSupabase()
    if (!sb) return local
    await sb.from('live_chat_messages').delete().eq('id', messageId).eq('channel_id', channelId)
  } catch { /* ignore */ }
  return local
}

export function subscribeLiveChat(channelId, onMessages) {
  if (!channelId) return () => {}
  let cancelled = false
  let unsub = () => {}

  fetchLiveChat(channelId).then((list) => {
    if (!cancelled) onMessages(list)
  })

  if (isSupabaseConfigured() && isUuid(channelId)) {
    ;(async () => {
      const sb = await getSupabase()
      if (!sb || cancelled) return
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
      onMessages(readLocalLiveChat(channelId))
    }, 4000)
    unsub = () => window.clearInterval(interval)
  }

  return () => {
    cancelled = true
    unsub()
  }
}

export function canSyncLiveChat(channelId) {
  return !!(getGraphActor()?.id && isUuid(channelId))
}
