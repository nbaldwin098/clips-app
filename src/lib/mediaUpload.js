/**
 * Upload video/image to Supabase Storage → durable public URL.
 * Device IndexedDB is not the source of truth for published media.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { isOwnerAccount } from '../data/ownerLogin'

const BUCKET = 'clips'
const MAX_VIDEO = 80 * 1024 * 1024
const MAX_IMAGE = 12 * 1024 * 1024
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`

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

/** True when this signed-in user can write to the clips storage bucket + videos table. */
export function canHostUploads(actor) {
  return !!(
    isSupabaseConfigured()
    && actor?.id
    && actor.provider === 'supabase'
  )
}

export function cloudHostRequiredMessage(actor) {
  if (!isSupabaseConfigured()) {
    return 'Cloud storage is not connected. Uploads must be hosted as links — they are not saved on this device.'
  }
  if (!actor?.id) {
    return 'Sign in to upload. Files are hosted in the cloud, not on this device.'
  }
  if (actor.provider !== 'supabase') {
    if (isOwnerAccount(actor) || actor.provider === 'local') {
      return 'You are on a local login (like cs1). Sign out, then sign in with a cloud email or Apple/Microsoft/X so uploads get a calabi.us link.'
    }
    return 'Sign in with a cloud Clips account to upload. Local-only sessions cannot host media.'
  }
  return 'Could not host this upload in the cloud.'
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

/** Host a data:image thumbnail as a durable public URL. */
export async function uploadDataUrlToSupabase(dataUrl, userId, name = 'thumb.jpg') {
  const raw = String(dataUrl || '')
  if (!raw.startsWith('data:image/')) return { ok: false, error: 'Not an image data URL.' }
  try {
    const res = await fetch(raw)
    const blob = await res.blob()
    const file = new File([blob], name, { type: blob.type || 'image/jpeg' })
    return uploadImageToSupabase(file, userId)
  } catch (e) {
    return { ok: false, error: e?.message || 'Thumb upload failed.' }
  }
}

export function storagePathFromPublicUrl(url) {
  const u = String(url || '')
  const i = u.indexOf(PUBLIC_MARKER)
  if (i < 0) return null
  try {
    return decodeURIComponent(u.slice(i + PUBLIC_MARKER.length).split('?')[0])
  } catch {
    return u.slice(i + PUBLIC_MARKER.length).split('?')[0] || null
  }
}

/** Remove a hosted file from the clips bucket (best-effort). */
export async function deleteHostedMedia(publicUrl) {
  const path = storagePathFromPublicUrl(publicUrl)
  if (!path || !isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error } = await sb.storage.from(BUCKET).remove([path])
    return !error
  } catch {
    return false
  }
}
