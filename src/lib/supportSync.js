/**
 * Support tickets — Supabase is source of truth (migration 0018).
 * Local cache is display-only after pull.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getGraphActor } from './graphSync'

const CACHE = 'support_tickets_cloud_cache'

function canCloud() {
  return !!(isSupabaseConfigured() && getGraphActor()?.id)
}

async function sb() {
  try { return await getSupabase() } catch { return null }
}

function cacheAll(rows) {
  lsSet(CACHE, Array.isArray(rows) ? rows : [])
}

export function cachedTickets() {
  const rows = lsGet(CACHE, [])
  return Array.isArray(rows) ? rows : []
}

function mapRow(r) {
  if (!r) return null
  return {
    id: r.id,
    userId: r.user_id,
    email: r.email || '',
    handle: r.handle || '',
    subject: r.subject || '',
    body: r.body || '',
    status: r.status || 'open',
    priority: r.priority || 'normal',
    assigneeId: r.assignee_id || null,
    category: r.category || 'general',
    meta: r.meta || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function pullSupportTickets() {
  if (!canCloud()) return { ok: false, tickets: cachedTickets() }
  const client = await sb()
  if (!client) return { ok: false, tickets: cachedTickets() }
  try {
    const { data, error } = await client
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return { ok: false, tickets: cachedTickets(), error: error.message }
    const rows = (data || []).map(mapRow).filter(Boolean)
    cacheAll(rows)
    return { ok: true, tickets: rows }
  } catch (e) {
    return { ok: false, tickets: cachedTickets(), error: String(e?.message || e) }
  }
}

export async function createSupportTicketCloud({ userId, email, handle, subject, body, category = 'general' }) {
  if (!userId) return { ok: false, error: 'Sign in required.' }
  if (!canCloud() || getGraphActor()?.id !== userId) {
    return { ok: false, error: 'Cloud account required. Tickets are not stored on this device.' }
  }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const id = `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const row = {
    id,
    user_id: userId,
    email: email || '',
    handle: handle || '',
    subject: String(subject || '').trim().slice(0, 200),
    body: String(body || '').trim().slice(0, 5000),
    status: 'open',
    priority: 'normal',
    category,
    meta: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error } = await client.from('support_tickets').insert(row)
  if (error) return { ok: false, error: error.message }
  await pullSupportTickets()
  return { ok: true, ticket: mapRow(row) }
}

export async function updateSupportTicketCloud(id, partial = {}) {
  if (!canCloud() || !id) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const patch = { updated_at: new Date().toISOString() }
  if (partial.status != null) patch.status = partial.status
  if (partial.priority != null) patch.priority = partial.priority
  if (partial.assigneeId != null) patch.assignee_id = partial.assigneeId
  if (partial.category != null) patch.category = partial.category
  const { error } = await client.from('support_tickets').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  await pullSupportTickets()
  return { ok: true }
}
