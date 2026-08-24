/**
 * Direct messages between two real, signed-in accounts.
 *
 * Requires a Supabase-backed account on both ends (same gate as
 * src/lib/graphSync.js) — a local/demo login lives on one device only,
 * so there is nowhere for a message to arrive. Content is end-to-end
 * encrypted: Supabase only ever stores ciphertext + a per-message IV in
 * `direct_messages`; `dm_conversations` tracks who is talking to whom
 * and when, so the inbox can list conversations without decrypting
 * everything up front. See src/lib/dmCrypto.js for the crypto and its
 * one honest limitation (per-device keys, not per-account).
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import {
  ensureDeviceKeyPair,
  importPrivateKey,
  importPublicKey,
  deriveSharedKey,
  encryptText,
  decryptText,
} from './dmCrypto'
import { lsGet, lsSet } from './storage'

export const MAX_MESSAGE_CHARS = 2000
const MESSAGE_PAGE_SIZE = 200
const PREVIEW_SCAN_LIMIT = 300
const TRIM_KEEP = 500
const PUBLISHED_KEY_FLAG = 'dm_published_key'

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))
}

export function dmAvailableFor(user) {
  return !!(isSupabaseConfigured() && user?.provider === 'supabase' && isUuid(user.id))
}

export function conversationIdFor(a, b) {
  return [String(a || ''), String(b || '')].sort().join(':')
}

function otherUserId(row, myId) {
  return row.user_a === myId ? row.user_b : row.user_a
}

async function client() {
  if (!isSupabaseConfigured()) return null
  try {
    return await getSupabase()
  } catch {
    return null
  }
}

// Deriving an AES key from ECDH is cheap but not free — cache it per tab
// so re-rendering a thread or list doesn't re-derive on every keystroke.
const sharedKeyCache = new Map()

async function getSharedKey(myUser, peerId, peerPublicKeyBase64) {
  if (!peerPublicKeyBase64) return null
  const cacheKey = `${myUser.id}:${peerId}`
  if (sharedKeyCache.has(cacheKey)) return sharedKeyCache.get(cacheKey)
  try {
    const pair = await ensureDeviceKeyPair(myUser.id)
    if (!pair) return null
    const [priv, pub] = await Promise.all([
      importPrivateKey(pair.privateKeyJwk),
      importPublicKey(peerPublicKeyBase64),
    ])
    const shared = await deriveSharedKey(priv, pub)
    sharedKeyCache.set(cacheKey, shared)
    return shared
  } catch {
    return null
  }
}

/** Publishes this device's public key to the profile once, so peers can start a conversation. Safe to call often — it only writes when the key on file is stale. */
export async function publishMyPublicKey(user) {
  if (!dmAvailableFor(user)) return false
  const sb = await client()
  if (!sb) return false
  try {
    const pair = await ensureDeviceKeyPair(user.id)
    if (!pair) return false
    if (lsGet(PUBLISHED_KEY_FLAG, {})?.[user.id] === pair.publicKeyBase64) return true
    const { error } = await sb.from('profiles').update({ public_key: pair.publicKeyBase64 }).eq('id', user.id)
    if (error) return false
    const flags = lsGet(PUBLISHED_KEY_FLAG, {})
    flags[user.id] = pair.publicKeyBase64
    lsSet(PUBLISHED_KEY_FLAG, flags)
    return true
  } catch {
    return false
  }
}

function mapProfile(row) {
  if (!row?.id) return null
  return {
    id: row.id,
    handle: row.handle || '',
    displayName: row.display_name || row.handle || 'User',
    avatarUrl: row.avatar_url || '',
    publicKey: row.public_key || null,
  }
}

/** Looks up someone to message by @handle or their user id. Only finds real (Supabase) profiles — the only accounts that can receive a message. */
export async function findMessengablePeer(handleOrId) {
  const sb = await client()
  if (!sb) return null
  const raw = String(handleOrId || '').trim().replace(/^@/, '')
  if (!raw) return null
  try {
    const cols = 'id, handle, display_name, avatar_url, public_key'
    const { data } = isUuid(raw)
      ? await sb.from('profiles').select(cols).eq('id', raw).maybeSingle()
      : await sb.from('profiles').select(cols).ilike('handle', raw).maybeSingle()
    return mapProfile(data)
  } catch {
    return null
  }
}

export async function listConversations(user) {
  if (!dmAvailableFor(user)) return []
  const sb = await client()
  if (!sb) return []
  try {
    const { data: convos } = await sb
      .from('dm_conversations')
      .select('*')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .limit(50)
    if (!convos?.length) return []

    const peerIds = [...new Set(convos.map((c) => otherUserId(c, user.id)).filter(Boolean))]
    const { data: profileRows } = peerIds.length
      ? await sb.from('profiles').select('id, handle, display_name, avatar_url, public_key').in('id', peerIds)
      : { data: [] }
    const profileById = new Map((profileRows || []).map((p) => [p.id, mapProfile(p)]))

    const { data: recent } = await sb
      .from('direct_messages')
      .select('conversation_id, ciphertext, iv, created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(PREVIEW_SCAN_LIMIT)
    const latestByConvo = new Map()
    for (const row of recent || []) {
      if (!latestByConvo.has(row.conversation_id)) latestByConvo.set(row.conversation_id, row)
    }

    const out = []
    for (const row of convos) {
      const peerId = otherUserId(row, user.id)
      const peer = profileById.get(peerId) || { id: peerId, handle: '', displayName: 'User', avatarUrl: '', publicKey: null }
      const lastMessage = latestByConvo.get(row.conversation_id)
      const myLastRead = row.user_a === user.id ? row.last_read_a : row.last_read_b
      const unread = !!(row.last_message_at && (!myLastRead || new Date(row.last_message_at) > new Date(myLastRead)))
      let preview = ''
      if (lastMessage && peer.publicKey) {
        const shared = await getSharedKey(user, peerId, peer.publicKey)
        if (shared) {
          try {
            preview = await decryptText(shared, lastMessage.iv, lastMessage.ciphertext)
          } catch {
            preview = ''
          }
        }
      }
      out.push({
        conversationId: row.conversation_id,
        peer,
        lastMessageAt: row.last_message_at,
        unread,
        preview,
      })
    }
    return out
  } catch {
    return []
  }
}

export async function getMessages(user, peer) {
  if (!dmAvailableFor(user) || !peer?.id) return []
  const sb = await client()
  if (!sb) return []
  const conversationId = conversationIdFor(user.id, peer.id)
  try {
    const { data } = await sb
      .from('direct_messages')
      .select('id, sender_id, ciphertext, iv, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MESSAGE_PAGE_SIZE)
    const shared = peer.publicKey ? await getSharedKey(user, peer.id, peer.publicKey) : null
    const out = []
    for (const row of data || []) {
      let text = ''
      let ok = false
      if (shared) {
        try {
          text = await decryptText(shared, row.iv, row.ciphertext)
          ok = true
        } catch {
          ok = false
        }
      }
      out.push({
        id: row.id,
        mine: row.sender_id === user.id,
        text,
        ok,
        createdAt: row.created_at,
      })
    }
    return out
  } catch {
    return []
  }
}

async function trimConversation(sb, conversationId) {
  try {
    const { data } = await sb
      .from('direct_messages')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(TRIM_KEEP, TRIM_KEEP)
    const cutoff = data?.[0]?.created_at
    if (cutoff) {
      await sb.from('direct_messages').delete().eq('conversation_id', conversationId).lt('created_at', cutoff)
    }
  } catch {
    // best-effort storage cap — never block sending on this
  }
}

export async function sendMessage(user, peer, text) {
  if (!dmAvailableFor(user)) return { ok: false, error: 'Messages need a signed-in Calabi account synced to the cloud.' }
  if (!peer?.id) return { ok: false, error: 'Pick someone to message.' }
  const body = String(text || '').trim().slice(0, MAX_MESSAGE_CHARS)
  if (!body) return { ok: false, error: 'Type a message first.' }
  if (!peer.publicKey) return { ok: false, error: `@${peer.handle || 'this user'} has not turned on messages yet.` }
  const sb = await client()
  if (!sb) return { ok: false, error: 'Could not reach the server.' }

  const shared = await getSharedKey(user, peer.id, peer.publicKey)
  if (!shared) return { ok: false, error: 'Could not set up encryption for this conversation.' }

  const conversationId = conversationIdFor(user.id, peer.id)
  const [userA, userB] = [user.id, peer.id].sort()
  const isA = user.id === userA
  const now = new Date().toISOString()

  try {
    const { error: convoErr } = await sb.from('dm_conversations').upsert({
      conversation_id: conversationId,
      user_a: userA,
      user_b: userB,
      last_message_at: now,
      ...(isA ? { last_read_a: now } : { last_read_b: now }),
    })
    if (convoErr) return { ok: false, error: 'Could not open the conversation.' }

    const { iv, ciphertext } = await encryptText(shared, body)
    const { data, error } = await sb
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: peer.id,
        ciphertext,
        iv,
      })
      .select('id, created_at')
      .single()
    if (error) return { ok: false, error: 'Message did not send.' }

    if (Math.random() < 0.05) trimConversation(sb, conversationId)

    return { ok: true, message: { id: data.id, mine: true, text: body, ok: true, createdAt: data.created_at } }
  } catch {
    return { ok: false, error: 'Message did not send.' }
  }
}

export async function markConversationRead(user, peerId) {
  if (!dmAvailableFor(user) || !peerId) return
  const sb = await client()
  if (!sb) return
  const conversationId = conversationIdFor(user.id, peerId)
  const [userA] = [user.id, peerId].sort()
  const isA = user.id === userA
  try {
    await sb
      .from('dm_conversations')
      .update(isA ? { last_read_a: new Date().toISOString() } : { last_read_b: new Date().toISOString() })
      .eq('conversation_id', conversationId)
  } catch {
    // read state is a nice-to-have, never worth surfacing an error for
  }
}

/** Realtime push for one open thread — falls back to nothing (caller keeps polling) if Realtime is unavailable. */
export async function subscribeToConversation(conversationId, onInsert) {
  const sb = await client()
  if (!sb || !conversationId) return () => {}
  const channel = sb
    .channel(`dm:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert?.(payload.new)
    )
    .subscribe()
  return () => {
    try { sb.removeChannel(channel) } catch {}
  }
}

/** Realtime push for "you have a new message" badges/list refresh, independent of which thread (if any) is open. */
export async function subscribeToInbox(userId, onInsert) {
  const sb = await client()
  if (!sb || !userId) return () => {}
  const channel = sb
    .channel(`dm-inbox:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${userId}` },
      (payload) => onInsert?.(payload.new)
    )
    .subscribe()
  return () => {
    try { sb.removeChannel(channel) } catch {}
  }
}
