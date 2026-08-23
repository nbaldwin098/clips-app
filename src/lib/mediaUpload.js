/**
 * Upload a video file to Supabase Storage → public URL (our link).
 * Falls back to null if Supabase is not configured or upload fails.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const BUCKET = 'clips'
const MAX_BYTES = 80 * 1024 * 1024 // 80MB soft cap for free-tier MVP

function extFromFile(file) {
  const n = String(file?.name || '')
  const m = n.match(/\.([a-z0-9]+)$/i)
  if (m) return m[1].toLowerCase()
  if (file?.type?.includes('webm')) return 'webm'
  if (file?.type?.includes('quicktime')) return 'mov'
  return 'mp4'
}

/**
 * @returns {Promise<{ ok: true, publicUrl: string, path: string } | { ok: false, error: string }>}
 */
export async function uploadVideoToSupabase(file, userId) {
  if (!file) return { ok: false, error: 'No file' }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Storage not connected (Supabase env missing).' }
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File too large (max ${Math.round(MAX_BYTES / (1024 * 1024))}MB for MVP). Compress or use Import link.`,
    }
  }

  try {
    const sb = await getSupabase()
    if (!sb) return { ok: false, error: 'Supabase client unavailable.' }

    // Prefer logged-in session so RLS can allow authenticated uploads
    const { data: sessionData } = await sb.auth.getSession()
    const uid = userId || sessionData?.session?.user?.id || 'anon'
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const path = `${uid}/${id}.${extFromFile(file)}`

    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'video/mp4',
    })

    if (upErr) {
      return {
        ok: false,
        error:
          upErr.message ||
          'Upload failed. Create a public Storage bucket named "clips" in Supabase.',
      }
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = data?.publicUrl
    if (!publicUrl) return { ok: false, error: 'Upload ok but no public URL returned.' }

    return { ok: true, publicUrl, path }
  } catch (e) {
    return { ok: false, error: e?.message || 'Upload failed.' }
  }
}
