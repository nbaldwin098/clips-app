/**
 * Upload video/image to Supabase Storage → public URL.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const BUCKET = 'clips'
const MAX_VIDEO = 80 * 1024 * 1024
const MAX_IMAGE = 12 * 1024 * 1024

function extFromFile(file, fallback = 'bin') {
  const n = String(file?.name || '')
  const m = n.match(/\.([a-z0-9]+)$/i)
  if (m) return m[1].toLowerCase()
  if (file?.type?.includes('webm')) return 'webm'
  if (file?.type?.includes('png')) return 'png'
  if (file?.type?.includes('webp')) return 'webp'
  if (file?.type?.includes('jpeg') || file?.type?.includes('jpg')) return 'jpg'
  if (file?.type?.includes('mp4')) return 'mp4'
  return fallback
}

async function uploadToBucket(file, userId, { maxBytes, kind }) {
  if (!file) return { ok: false, error: 'No file' }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Storage not connected (Supabase env missing).' }
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).`,
    }
  }
  try {
    const sb = await getSupabase()
    if (!sb) return { ok: false, error: 'Supabase client unavailable.' }
    const { data: sessionData } = await sb.auth.getSession()
    const uid = userId || sessionData?.session?.user?.id || 'anon'
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const path = `${kind}/${uid}/${id}.${extFromFile(file, kind === 'pics' ? 'jpg' : 'mp4')}`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || (kind === 'pics' ? 'image/jpeg' : 'video/mp4'),
    })
    if (upErr) {
      return {
        ok: false,
        error: upErr.message || 'Upload failed. Create public Storage bucket "clips".',
      }
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) return { ok: false, error: 'No public URL returned.' }
    return { ok: true, publicUrl: data.publicUrl, path }
  } catch (e) {
    return { ok: false, error: e?.message || 'Upload failed.' }
  }
}

export async function uploadVideoToSupabase(file, userId) {
  return uploadToBucket(file, userId, { maxBytes: MAX_VIDEO, kind: 'videos' })
}

export async function uploadImageToSupabase(file, userId) {
  return uploadToBucket(file, userId, { maxBytes: MAX_IMAGE, kind: 'pics' })
}
