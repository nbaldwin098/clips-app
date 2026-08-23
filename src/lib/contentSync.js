/**
 * Cross-device content sync.
 *
 * Publishing (via publishLocalMedia / importUserLink / publishPhoto) always
 * writes to the local `imports` cache first, so the UI on *this* device
 * updates instantly and still works offline / without Supabase. When
 * Supabase is configured and the actor is a real signed-in Supabase user,
 * we additionally:
 *   - push the record's metadata (not the raw file) to the shared `videos`
 *     table so other devices/users can see it, and
 *   - pull the latest rows from that table (on load, after publishing, and
 *     on an interval) and merge them into the local cache.
 *
 * Without Supabase configured, everything stays local-only by design —
 * there is no way to sync across devices without a shared backend.
 */
import { mergeImports } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const TABLE = 'videos'
const SYNC_EVENT = 'clips-content-sync'
const PULL_LIMIT = 400

/** Notify any mounted page (this tab) that the local content cache changed. */
export function notifyContentChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SYNC_EVENT))
}

function toRow(record, actor) {
  return {
    id: record.id,
    creator_id: actor?.id || record.creatorId || record.userId || null,
    handle: actor?.handle || record.handle || null,
    type: record.type || 'short',
    title: record.title || 'Untitled',
    description: record.description || '',
    source_url: record.sourceUrl || record.mediaUrl || '',
    media_url: record.mediaUrl || record.sourceUrl || '',
    thumb_url: record.thumbUrl || '',
    origin: record.origin || null,
    hosted: !!record.hosted,
    stored_bytes: record.storedBytes || 0,
    duration_sec: record.durationSec || 0,
    width: record.width || null,
    height: record.height || null,
    tags: record.tags || [],
    engagement: record.engagement || {},
    views: record.views || 0,
    created_at: record.createdAt || new Date().toISOString(),
  }
}

function fromRow(row) {
  return {
    id: row.id,
    creatorId: row.creator_id || undefined,
    userId: row.creator_id || undefined,
    handle: row.handle || undefined,
    type: row.type,
    title: row.title,
    description: row.description || '',
    sourceUrl: row.source_url || '',
    mediaUrl: row.media_url || row.source_url || '',
    thumbUrl: row.thumb_url || '',
    origin: row.origin || undefined,
    hosted: !!row.hosted,
    storedBytes: row.stored_bytes || 0,
    durationSec: row.duration_sec || 0,
    width: row.width || undefined,
    height: row.height || undefined,
    tags: row.tags || [],
    engagement: row.engagement || {},
    views: row.views || 0,
    createdAt: row.created_at,
  }
}

/**
 * Publish a record's metadata to the shared catalog. Only attempted for a
 * real Supabase-authenticated actor (actor.provider === 'supabase'), since
 * the table's RLS insert policy requires creator_id === auth.uid() — an
 * anonymous/local-only viewer could never satisfy that, so we don't even
 * try (avoids a doomed round-trip and any chance of surfacing a DB error).
 */
export async function pushContentRecord(record, actor) {
  if (!record?.id || !actor?.id || actor.provider !== 'supabase' || !isSupabaseConfigured()) {
    return false
  }
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error } = await sb.from(TABLE).upsert(toRow(record, actor), { onConflict: 'id' })
    if (error) {
      console.warn('[Clips] Cloud content sync (push) failed:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Clips] Cloud content sync (push) failed:', err?.message)
    return false
  }
}

/** Pull the most recent catalog rows from Supabase (read is public, no sign-in required). */
export async function pullContentRecords(limit = PULL_LIMIT) {
  if (!isSupabaseConfigured()) return []
  try {
    const sb = await getSupabase()
    if (!sb) return []
    const { data, error } = await sb
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data.map(fromRow)
  } catch {
    return []
  }
}

/** Pull + merge into the local cache, then notify any subscribed pages. Returns rows pulled. */
export async function syncContentFromCloud() {
  const rows = await pullContentRecords()
  if (rows.length) {
    mergeImports(rows)
    notifyContentChanged()
  }
  return rows
}

/** Subscribe to both cross-tab localStorage updates and same-tab sync events. */
export function subscribeContentUpdates(onChange) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onChange?.()
  window.addEventListener(SYNC_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(SYNC_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
