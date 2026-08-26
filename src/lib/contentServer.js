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
