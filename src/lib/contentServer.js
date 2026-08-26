/**
 * Server-only catalog reads for Next.js metadata / SSR.
 * Uses the anon key (public rows only under RLS).
 */
import { createClient } from '@supabase/supabase-js'
import { runtimeEnv } from './runtimeEnv.js'

function mapRow(row) {
  if (!row) return null
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
    durationSec: row.duration_sec || 0,
    views: row.views || 0,
    createdAt: row.created_at,
    publishedAt: row.published_at || row.created_at,
    firstPublishedAt: row.first_published_at || row.published_at || row.created_at,
    status: row.status || 'published',
  }
}

function serverSupabase() {
  const url = runtimeEnv('VITE_SUPABASE_URL') || runtimeEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = runtimeEnv('VITE_SUPABASE_ANON_KEY') || runtimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!url || !anon) return null
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function fetchContentById(id) {
  if (!id) return null
  const sb = serverSupabase()
  if (!sb) return null
  try {
    const { data, error } = await sb.from('videos').select('*').eq('id', id).maybeSingle()
    if (error || !data) return null
    return mapRow(data)
  } catch {
    return null
  }
}

/** Recent public catalog ids for sitemap (best-effort). */
export async function fetchRecentContentIds(limit = 200) {
  const rows = await fetchRecentContent(limit)
  return rows.map((r) => r.id).filter(Boolean)
}

/** Recent public posts for home SSR / crawlers. */
export async function fetchRecentContent(limit = 24) {
  const sb = serverSupabase()
  if (!sb) return []
  try {
    const { data, error } = await sb
      .from('videos')
      .select('id, creator_id, handle, type, title, description, source_url, media_url, thumb_url, origin, hosted, duration_sec, views, created_at, published_at, status')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(100, Number(limit) || 24)))
    if (error || !data) return []
    return data.map(mapRow).filter(Boolean)
  } catch {
    return []
  }
}

function normalizeHandle(handle) {
  return String(handle || '').replace(/^@/, '').trim()
}

/** Public profile by handle (RLS: profiles are viewable by everyone). */
export async function fetchProfileByHandle(handle) {
  const h = normalizeHandle(handle)
  if (!h) return null
  const sb = serverSupabase()
  if (!sb) return null
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('id, handle, display_name, bio, avatar_url, creator_status')
      .ilike('handle', h)
      .limit(1)
    if (error || !data?.length) return null
    const row = data[0]
    return {
      id: row.id,
      handle: row.handle || h,
      displayName: row.display_name || row.handle || h,
      bio: row.bio || '',
      avatarUrl: row.avatar_url || '',
      creatorStatus: row.creator_status || 'none',
    }
  } catch {
    return null
  }
}

/** Recent posts for a creator handle (home/profile SSR). */
export async function fetchContentByHandle(handle, limit = 12) {
  const h = normalizeHandle(handle)
  if (!h) return []
  const sb = serverSupabase()
  if (!sb) return []
  try {
    const { data, error } = await sb
      .from('videos')
      .select('id, creator_id, handle, type, title, description, source_url, media_url, thumb_url, origin, hosted, duration_sec, views, created_at, published_at, status')
      .ilike('handle', h)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(50, Number(limit) || 12)))
    if (error || !data) return []
    return data.map(mapRow).filter(Boolean)
  } catch {
    return []
  }
}

/** Creator handles for sitemap (best-effort). */
export async function fetchRecentCreatorHandles(limit = 100) {
  const sb = serverSupabase()
  if (!sb) return []
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('handle')
      .not('handle', 'is', null)
      .neq('handle', '')
      .order('updated_at', { ascending: false })
      .limit(Math.max(1, Math.min(200, Number(limit) || 100)))
    if (error || !data) return []
    const seen = new Set()
    const out = []
    for (const row of data) {
      const h = normalizeHandle(row.handle)
      if (!h) continue
      const key = h.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(h)
    }
    return out
  } catch {
    return []
  }
}
