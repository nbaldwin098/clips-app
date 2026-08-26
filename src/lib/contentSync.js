/**
 * Cloud catalog sync. Supabase is the source of truth.
 * Session memory holds the latest pull; catalog is not written to localStorage.
 *
 * Media priority: videos, clips (shorts), and pics are #1 load priority for feeds.
 * Near-term we keep hosted URLs + CDN preload. Cloudflare Stream is a strong later
 * upgrade for adaptive HLS/VOD at scale — not required until ingest/transcode volume grows.
 */
import { replaceImportsFromCloud, removeImport, purgeLegacyLocalCatalog, getImports } from './storage'
import { isUserUploadRecord, stampFirstPublished, olderIso } from './mediaMeta'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { isFeedable, isReferenceItem, hasStableImage, purgeDeadCatalog } from './catalogHealth'
import { clearFrozenFeeds } from './frozenFeeds'
import { markCatalogHydrated } from './catalogStore'

const TABLE = 'videos'
const SYNC_EVENT = 'clips-content-sync'
/** Pull enough media first; shop/admin/etc. are secondary to this catalog. */
const PULL_LIMIT = 500

const MEDIA_TYPES = new Set(['video', 'short', 'pic', 'clip'])

/** Lower = higher priority. Videos / clips / pics always beat everything else. */
export function mediaLoadRank(row) {
  const t = String(row?.type || '').toLowerCase()
  if (t === 'video') return 0
  if (t === 'short' || t === 'clip') return 1
  if (t === 'pic') return 2
  return 9
}

export function prioritizeMediaCatalog(rows = []) {
  return [...(rows || [])].sort((a, b) => {
    const d = mediaLoadRank(a) - mediaLoadRank(b)
    if (d !== 0) return d
    return (Date.parse(b.createdAt || b.publishedAt || 0) || 0) - (Date.parse(a.createdAt || a.publishedAt || 0) || 0)
  })
}

export function isPriorityMedia(row) {
  return MEDIA_TYPES.has(String(row?.type || '').toLowerCase())
}

export function notifyContentChanged() {
  try { clearFrozenFeeds() } catch {}
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SYNC_EVENT))
}

function cloudUrl(url) {
  const u = String(url || '')
  return u.startsWith('https://') || u.startsWith('http://') ? u : ''
}

function toRow(record, actor) {
  const media = cloudUrl(record.mediaUrl) || cloudUrl(record.sourceUrl)
  const source = cloudUrl(record.sourceUrl) || media
  const thumb = cloudUrl(record.thumbUrl) || media
  const stamped = stampFirstPublished(record)
  const createdAt = record.createdAt || stamped.firstPublishedAt || new Date().toISOString()
  const publishedAt = stamped.publishedAt || (stamped.status === 'published' ? createdAt : null)
  return {
    id: record.id,
    creator_id: actor?.id || record.creatorId || record.userId || null,
    handle: actor?.handle || record.handle || null,
    type: record.type || 'short',
    title: record.title || 'Untitled',
    description: record.description || '',
    source_url: source,
    media_url: media,
    thumb_url: thumb,
    origin: record.origin || null,
    hosted: !!record.hosted,
    stored_bytes: record.storedBytes || 0,
    duration_sec: record.durationSec || 0,
    width: record.width || null,
    height: record.height || null,
    tags: record.tags || [],
    engagement: record.engagement || {},
    views: record.views || 0,
    created_at: createdAt,
    published_at: publishedAt,
    first_published_at: stamped.firstPublishedAt || publishedAt || null,
    status: record.status || 'published',
    scheduled_for: record.scheduledFor || null,
    price_usd: Number(record.priceUsd) > 0 ? Number(record.priceUsd) : 0,
  }
}

function fromRow(row) {
  const createdAt = row.created_at
  const publishedAt = row.published_at || row.created_at
  const firstPublishedAt =
    row.first_published_at
    || (row.status === 'published' || row.published_at ? olderIso(publishedAt, createdAt) : null)
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
    createdAt,
    publishedAt,
    firstPublishedAt,
    status: row.status || 'published',
    scheduledFor: row.scheduled_for || null,
    priceUsd: Number(row.price_usd) > 0 ? Number(row.price_usd) : 0,
  }
}

const LEAKED_DB_ERROR = /row-level security|violates|password/i

function catalogSyncErrorMessage(error) {
  const msg = String(error?.message || error || '').trim()
  if (!msg) return "Couldn't save to the catalog."
  if (/Could not find the .* column/i.test(msg)) {
    return 'Site database is out of date — run the latest Supabase migration (0015_videos_first_published_at.sql / 0012).'
  }
  if (LEAKED_DB_ERROR.test(msg)) return "Couldn't publish — sign in with the account that owns this upload."
  return msg
}

export async function pushContentRecord(record, actor) {
  if (!record?.id || !actor?.id || !isSupabaseConfigured()) {
    return { ok: false, error: 'Catalog sync unavailable.' }
  }
  const media = cloudUrl(record.mediaUrl) || cloudUrl(record.sourceUrl)
  if (!media) return { ok: false, error: 'Missing media URL for catalog sync.' }
  try {
    const sb = await getSupabase()
    if (!sb) return { ok: false, error: 'Catalog sync unavailable.' }
    const { data: sessionData } = await sb.auth.getSession()
    if (!sessionData?.session?.user?.id) {
      return { ok: false, error: 'Sign in required to publish.' }
    }
    let payload = toRow(record, actor)
    let { error } = await sb.from(TABLE).upsert(payload, { onConflict: 'id' })
    // Older DBs without 0015: retry without first_published_at so uploads still work.
    if (error && /first_published_at/i.test(String(error.message || ''))) {
      const { first_published_at: _drop, ...rest } = payload
      payload = rest
      ;({ error } = await sb.from(TABLE).upsert(payload, { onConflict: 'id' }))
    }
    if (error) {
      console.warn('[Clips] Cloud content sync (push) failed:', error.message)
      return { ok: false, error: catalogSyncErrorMessage(error) }
    }
    return { ok: true, error: null }
  } catch (err) {
    console.warn('[Clips] Cloud content sync (push) failed:', err?.message)
    return { ok: false, error: catalogSyncErrorMessage(err) }
  }
}

function keepCloudRow(row) {
  if (!row?.id || isReferenceItem(row)) return false
  if (row.type === 'pic') return hasStableImage(row)
  const media = cloudUrl(row.mediaUrl) || cloudUrl(row.sourceUrl)
  if (!media) return false
  return isFeedable(row)
}

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
    // Videos / clips / pics first — rest of site waits on this catalog.
    return prioritizeMediaCatalog(data.map(fromRow).filter(keepCloudRow))
  } catch {
    return []
  }
}

/**
 * Delete a catalog row in Supabase.
 * Uses the live auth session (not actor.provider flags), so owner/local-labeled
 * sessions still delete when signed into Supabase.
 */
export async function deleteContentRecord(id, actor = null) {
  if (!id || !isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { data: sessionData } = await sb.auth.getSession()
    const uid = sessionData?.session?.user?.id || null
    if (!uid) {
      console.warn('[Clips] deleteContentRecord: no auth session')
      return false
    }

    // Prefer scoped delete (matches RLS creator_id = auth.uid())
    let { error } = await sb.from(TABLE).delete().eq('id', id).eq('creator_id', uid)
    if (error) {
      console.warn('[Clips] scoped delete failed:', error.message)
    }

    // Verify gone; if still present try id-only (admin policies)
    const { data: still } = await sb.from(TABLE).select('id').eq('id', id).maybeSingle()
    if (still?.id) {
      const res2 = await sb.from(TABLE).delete().eq('id', id)
      if (res2.error) {
        console.warn('[Clips] id delete failed:', res2.error.message)
        return false
      }
    }

    const { data: check } = await sb.from(TABLE).select('id').eq('id', id).maybeSingle()
    return !check?.id
  } catch (err) {
    console.warn('[Clips] deleteContentRecord failed:', err?.message)
    return false
  }
}

async function deleteOwnedDeadRows(actor) {
  if (!actor?.id || !isSupabaseConfigured()) return
  const sb = await getSupabase()
  if (!sb) return
  try {
    const { data: sessionData } = await sb.auth.getSession()
    const uid = sessionData?.session?.user?.id
    if (!uid) return
    const { data } = await sb.from(TABLE).select('id, type, media_url, source_url, thumb_url, origin, hosted').eq('creator_id', uid)
    for (const row of data || []) {
      const mapped = fromRow(row)
      if (keepCloudRow(mapped)) continue
      if (isUserUploadRecord(mapped)) continue
      await sb.from(TABLE).delete().eq('id', row.id).eq('creator_id', uid)
    }
  } catch {}
}

/**
 * Pull cloud catalog into session memory.
 * Preserves just-uploaded hosted rows for 2 minutes if the pull has not caught up yet.
 * Never wipes the catalog on an empty/failed pull.
 */
export async function syncContentFromCloud(actor = null) {
  purgeLegacyLocalCatalog()
  if (actor) await deleteOwnedDeadRows(actor)
  const rows = await pullContentRecords()
  if (rows.length > 0) {
    const cloudIds = new Set(rows.map((r) => r.id))
    const pending = getImports().filter((r) => {
      if (!r?.id || cloudIds.has(r.id)) return false
      if (!r.hosted) return false
      const media = cloudUrl(r.mediaUrl) || cloudUrl(r.sourceUrl)
      if (!media) return false
      const age = Date.now() - new Date(r.createdAt || 0).getTime()
      return Number.isFinite(age) && age >= 0 && age < 120000
    })
    const existing = getImports()
    const byPrev = new Map(existing.map((r) => [r.id, r]))
    replaceImportsFromCloud([...pending, ...rows].map((row) => {
      const prev = byPrev.get(row.id)
      if (!prev?.firstPublishedAt) return row
      if (row.firstPublishedAt) {
        const a = Date.parse(prev.firstPublishedAt)
        const b = Date.parse(row.firstPublishedAt)
        if (Number.isFinite(a) && Number.isFinite(b) && a < b) {
          return { ...row, firstPublishedAt: prev.firstPublishedAt, createdAt: prev.createdAt || row.createdAt }
        }
        return row
      }
      return { ...row, firstPublishedAt: prev.firstPublishedAt }
    }))
  } else {
    // Empty/failed pull must not wipe, but the UI needs a hydrated signal.
    markCatalogHydrated()
  }
  purgeDeadCatalog()
  notifyContentChanged()
  return rows
}

let liveSub = null

export async function subscribeCloudCatalog(onChange) {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return () => {}
  try {
    const sb = await getSupabase()
    if (!sb) return () => {}
    if (liveSub) {
      try { await sb.removeChannel(liveSub) } catch {}
      liveSub = null
    }
    const channel = sb
      .channel('clips-videos-catalog')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: TABLE },
        (payload) => {
          const id = payload?.old?.id
          if (id) removeImport(id)
          notifyContentChanged()
          onChange?.()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        (payload) => {
          if (payload?.eventType === 'DELETE') return
          syncContentFromCloud().then(() => onChange?.()).catch(() => onChange?.())
        },
      )
      .subscribe()
    liveSub = channel
    return () => {
      try { sb.removeChannel(channel) } catch {}
      if (liveSub === channel) liveSub = null
    }
  } catch {
    return () => {}
  }
}

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
