/**
 * Secure direct messages between signed-in cloud users.
 * Cloud (Supabase RLS) is source of truth. Local cache is display-only.
 */
import { lsGet, lsSet } from './storage'
import { isBlocked } from './youtubeParity'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getGraphActor } from './graphSync'

const CACHE_THREADS = 'calabi.dm.threads.v1'
const CACHE_MSGS = 'calabi.dm.messages.v1'
const RATE_KEY = 'calabi.dm.rate.v1'
const MAX_BODY = 2000
const ENC_PREFIX = 'enc1:'

async function threadAesKey(threadId) {
  const enc = new TextEncoder()
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(`calabi-dm:${threadId}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('calabi-dm-v1'), iterations: 120000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptDmBody(threadId, text) {
  if (!text) return ''
  const key = await threadAesKey(threadId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  const packed = new Uint8Array(iv.byteLength + buf.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(buf), 12)
  let bin = ''
  packed.forEach((b) => { bin += String.fromCharCode(b) })
  return ENC_PREFIX + btoa(bin)
}

export async function decryptDmBody(threadId, body) {
  const raw = String(body || '')
  if (!raw.startsWith(ENC_PREFIX)) return raw
  try {
    const bin = atob(raw.slice(ENC_PREFIX.length))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const key = await threadAesKey(threadId)
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12))
    return new TextDecoder().decode(buf)
  } catch {
    return ''
  }
}
const MAX_PER_MINUTE = 20
const DM_EVENT = 'clips-dms'

export function notifyDmsChanged() {
  if (typeof window === 'undefined') return
  try { window.dispatchEvent(new CustomEvent(DM_EVENT)) } catch {}
}

export function subscribeDmsChanged(fn) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => { try { fn?.() } catch {} }
  window.addEventListener(DM_EVENT, handler)
  return () => window.removeEventListener(DM_EVENT, handler)
}

function canCloud() {
  if (!isSupabaseConfigured()) return false
  const actor = getGraphActor()
  return !!(actor?.id && actor.provider === 'supabase')
}

export function threadIdFor(userA, userB) {
  const a = String(userA || '')
  const b = String(userB || '')
  if (!a || !b || a === b) return null
  const [low, high] = a < b ? [a, b] : [b, a]
  return `dm_${low}_${high}`
}

export function sanitizeDmBody(raw) {
  let s = String(raw || '')
  // Strip control chars except newline/tab
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  s = s.replace(/\r\n/g, '\n').trim()
  if (s.length > MAX_BODY) s = s.slice(0, MAX_BODY)
  return s
}

function rateOk(userId) {
  if (!userId) return false
  const all = lsGet(RATE_KEY, {}) || {}
  const now = Date.now()
  const windowMs = 60_000
  const prev = (all[userId] || []).filter((t) => now - t < windowMs)
  if (prev.length >= MAX_PER_MINUTE) return false
  prev.push(now)
  all[userId] = prev
  lsSet(RATE_KEY, all)
  return true
}

function cacheThreads(userId, rows) {
  const all = lsGet(CACHE_THREADS, {}) || {}
  all[userId] = rows
  lsSet(CACHE_THREADS, all)
  notifyDmsChanged()
}

function cachedThreads(userId) {
  const rows = (lsGet(CACHE_THREADS, {}) || {})[userId]
  return Array.isArray(rows) ? rows : []
}

function cacheMessages(threadId, rows) {
  const all = lsGet(CACHE_MSGS, {}) || {}
  all[threadId] = rows
  lsSet(CACHE_MSGS, all)
  notifyDmsChanged()
}

function cachedMessages(threadId) {
  const rows = (lsGet(CACHE_MSGS, {}) || {})[threadId]
  return Array.isArray(rows) ? rows : []
}

export function listCachedThreads(userId) {
  return cachedThreads(userId)
}

export function listCachedMessages(threadId) {
  return cachedMessages(threadId)
}

export function unreadDmCount(userId) {
  if (!userId) return 0
  let n = 0
  for (const t of cachedThreads(userId)) {
    n += Number(t.unread) || 0
  }
  return n
}

/**
 * Open or return the 1:1 thread with another user.
 * Requires cloud sign-in — DMs are not stored in an insecure public table.
 */
export async function openDmThread(me, peer) {
  if (!me?.id) return { ok: false, error: 'Sign in to message.' }
  if (me.provider !== 'supabase') {
    return { ok: false, error: 'Cloud sign-in required for secure messages.' }
  }
  const peerId = peer?.id || peer
  const peerHandle = peer?.handle || ''
  if (!peerId) return { ok: false, error: 'Pick someone to message.' }
  if (peerId === me.id) return { ok: false, error: 'You cannot message yourself.' }
  if (isBlocked(me.id, peerId) || isBlocked(peerId, me.id)) {
    return { ok: false, error: 'Messaging is blocked between these accounts.' }
  }

  const id = threadIdFor(me.id, peerId)
  if (!id) return { ok: false, error: 'Invalid thread.' }
  const [user_low, user_high] = me.id < peerId ? [me.id, peerId] : [peerId, me.id]

  if (!canCloud()) {
    return { ok: false, error: 'Cloud is not configured for messages.' }
  }

  const sb = await getSupabase()
  if (!sb) return { ok: false, error: 'Cloud unavailable.' }

  const { error } = await sb.from('dm_threads').upsert({
    id,
    user_low,
    user_high,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (error) {
    return { ok: false, error: error.message || 'Could not open conversation.' }
  }

  const thread = {
    id,
    peerId,
    peerHandle,
    updatedAt: new Date().toISOString(),
    lastBody: '',
    unread: 0,
  }
  const existing = cachedThreads(me.id).filter((t) => t.id !== id)
  cacheThreads(me.id, [thread, ...existing])
  return { ok: true, thread }
}

export async function sendDm({ me, peerId, body }) {
  if (!me?.id) return { ok: false, error: 'Sign in to message.' }
  if (me.provider !== 'supabase') {
    return { ok: false, error: 'Cloud sign-in required for secure messages.' }
  }
  if (!peerId || peerId === me.id) return { ok: false, error: 'Invalid recipient.' }
  if (isBlocked(me.id, peerId) || isBlocked(peerId, me.id)) {
    return { ok: false, error: 'Messaging is blocked between these accounts.' }
  }
  const text = sanitizeDmBody(body)
  if (!text) return { ok: false, error: 'Write a message first.' }
  if (!rateOk(me.id)) return { ok: false, error: 'Slow down — too many messages.' }

  const opened = await openDmThread(me, { id: peerId })
  if (!opened.ok) return opened
  const threadId = opened.thread.id
  const storedBody = await encryptDmBody(threadId, text)

  if (!canCloud()) return { ok: false, error: 'Cloud unavailable.' }
  const sb = await getSupabase()
  if (!sb) return { ok: false, error: 'Cloud unavailable.' }

  const msg = {
    id: `dmm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    thread_id: threadId,
    sender_id: me.id,
    body: storedBody,
    created_at: new Date().toISOString(),
    read_at: null,
  }

  const { error } = await sb.from('dm_messages').insert(msg)
  if (error) return { ok: false, error: error.message || 'Could not send.' }

  await sb.from('dm_threads').update({ updated_at: msg.created_at }).eq('id', threadId)

  const local = {
    id: msg.id,
    threadId,
    senderId: me.id,
    body: text,
    createdAt: msg.created_at,
    readAt: null,
  }
  const prev = cachedMessages(threadId)
  cacheMessages(threadId, [...prev, local])

  const threads = cachedThreads(me.id).map((t) => (
    t.id === threadId
      ? { ...t, lastBody: text, updatedAt: msg.created_at, unread: 0 }
      : t
  ))
  cacheThreads(me.id, threads.sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)))

  return { ok: true, message: local, threadId }
}

export async function pullMyThreads(me) {
  if (!me?.id || me.provider !== 'supabase' || !canCloud()) {
    return { ok: false, threads: cachedThreads(me?.id) }
  }
  const sb = await getSupabase()
  if (!sb) return { ok: false, threads: cachedThreads(me.id) }

  const { data, error } = await sb
    .from('dm_threads')
    .select('*')
    .or(`user_low.eq.${me.id},user_high.eq.${me.id}`)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return { ok: false, error: error.message, threads: cachedThreads(me.id) }

  const rows = []
  for (const t of data || []) {
    const peerId = t.user_low === me.id ? t.user_high : t.user_low
    const { data: lastRows } = await sb
      .from('dm_messages')
      .select('body, created_at, sender_id, read_at')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: false })
      .limit(1)
    const last = lastRows?.[0]
    const { count } = await sb
      .from('dm_messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', t.id)
      .neq('sender_id', me.id)
      .is('read_at', null)
    rows.push({
      id: t.id,
      peerId,
      peerHandle: '',
      updatedAt: t.updated_at || t.created_at,
      lastBody: last?.body ? await decryptDmBody(t.id, last.body) : '',
      unread: Number(count) || 0,
    })
  }
  cacheThreads(me.id, rows)
  return { ok: true, threads: rows }
}

export async function pullThreadMessages(me, threadId) {
  if (!me?.id || !threadId) return { ok: false, messages: [] }
  if (me.provider !== 'supabase' || !canCloud()) {
    return { ok: false, messages: cachedMessages(threadId) }
  }
  const sb = await getSupabase()
  if (!sb) return { ok: false, messages: cachedMessages(threadId) }

  // RLS enforces participant access; still verify locally.
  const expected = cachedThreads(me.id).find((t) => t.id === threadId)
  if (expected && expected.peerId === me.id) {
    return { ok: false, error: 'Invalid thread.', messages: [] }
  }

  const { data, error } = await sb
    .from('dm_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) return { ok: false, error: error.message, messages: cachedMessages(threadId) }

  const rows = []
  for (const m of data || []) {
    rows.push({
      id: m.id,
      threadId: m.thread_id,
      senderId: m.sender_id,
      body: await decryptDmBody(threadId, m.body),
      createdAt: m.created_at,
      readAt: m.read_at,
    })
  }
  cacheMessages(threadId, rows)

  // Mark peer messages read
  const unreadIds = rows.filter((m) => m.senderId !== me.id && !m.readAt).map((m) => m.id)
  if (unreadIds.length) {
    const now = new Date().toISOString()
    await sb.from('dm_messages').update({ read_at: now }).in('id', unreadIds)
    cacheMessages(threadId, rows.map((m) => (
      unreadIds.includes(m.id) ? { ...m, readAt: now } : m
    )))
    const threads = cachedThreads(me.id).map((t) => (
      t.id === threadId ? { ...t, unread: 0 } : t
    ))
    cacheThreads(me.id, threads)
  }

  return { ok: true, messages: listCachedMessages(threadId) }
}

export function peerIdFromThread(threadId, meId) {
  const t = cachedThreads(meId).find((x) => x.id === threadId)
  return t?.peerId || null
}
