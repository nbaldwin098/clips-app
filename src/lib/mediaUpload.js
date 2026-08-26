/**
 * Upload video/image to Supabase Storage → durable public URL.
 * Published posts must have an http(s) mediaUrl so anyone can play them.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const BUCKET = 'clips'
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024
/** Clips (shorts): tighter cap so storage stays predictable. */
export const MAX_CLIP_BYTES = 40 * 1024 * 1024
export const MAX_CLIP_DURATION_SEC = 60
const MAX_IMAGE = 12 * 1024 * 1024
/** @deprecated use MAX_VIDEO_BYTES */
const MAX_VIDEO = MAX_VIDEO_BYTES
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

/** Active Supabase auth user (needed for storage RLS + catalog upsert). */
export async function getHostSessionUser() {
  if (!isSupabaseConfigured()) return null
  try {
    const sb = await getSupabase()
    if (!sb) return null
    const { data } = await sb.auth.getSession()
    return data?.session?.user || null
  } catch {
    return null
  }
}

/** True when uploads can be hosted as playable public links. */
export function canHostUploads(actor) {
  return !!(isSupabaseConfigured() && actor?.id && actor.provider === 'supabase')
}

/**
 * Resolve who can write to storage right now.
 * Prefers the live Supabase session (so a linked owner login can upload).
 */
export async function resolveUploadHost(actor = null) {
  const sessionUser = await getHostSessionUser()
  if (sessionUser?.id) {
    return {
      id: sessionUser.id,
      handle: actor?.handle || sessionUser.user_metadata?.handle || '',
      displayName: actor?.displayName || sessionUser.user_metadata?.display_name || '',
      provider: 'supabase',
      email: sessionUser.email || actor?.email || '',
    }
  }
  if (canHostUploads(actor)) return actor
  return null
}

export function signInToUploadMessage() {
  return 'Sign in to upload.'
}

export function uploadHostRequiredMessage(actor = null) {
  if (!isSupabaseConfigured()) {
    return 'Uploads need cloud storage — this site is not connected to Supabase yet.'
  }
  if (actor?.id && actor.provider !== 'supabase') {
    return 'Sign in with your calabi account to upload (device-only login cannot publish).'
  }
  return signInToUploadMessage()
}

export function uploadFailedMessage() {
  return "Couldn't upload. Try again."
}

export function clipLimitsMessage() {
  return `Clips max ${MAX_CLIP_DURATION_SEC}s and ${Math.round(MAX_CLIP_BYTES / (1024 * 1024))}MB. Use MP4 for best playback.`
}

export function videoLimitsMessage() {
  return `Videos max ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB.`
}

async function uploadToBucket(file, userId, { maxBytes, kind }) {
  if (!file) return { ok: false, error: 'No file' }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Storage not connected.' }
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).`,
    }
  }
  try {
    const sb = await getSupabase()
    if (!sb) return { ok: false, error: 'Storage unavailable.' }
    const { data: sessionData } = await sb.auth.getSession()
    const uid = sessionData?.session?.user?.id || userId
    if (!uid || uid === 'anon') {
      return { ok: false, error: 'Sign in to upload.' }
    }
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const path = `${kind}/${uid}/${id}.${extFromFile(file, kind === 'pics' ? 'jpg' : 'mp4')}`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || (kind === 'pics' ? 'image/jpeg' : 'video/mp4'),
    })
    if (upErr) {
      return { ok: false, error: upErr.message || 'Upload failed.' }
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) return { ok: false, error: 'No public URL returned.' }
    return { ok: true, publicUrl: data.publicUrl, path }
  } catch (e) {
    return { ok: false, error: e?.message || 'Upload failed.' }
  }
}

export async function uploadVideoToSupabase(file, userId, { asClip = false } = {}) {
  const maxBytes = asClip ? MAX_CLIP_BYTES : MAX_VIDEO_BYTES
  return uploadToBucket(file, userId, { maxBytes, kind: 'videos' })
}

export async function uploadImageToSupabase(file, userId) {
  return uploadToBucket(file, userId, { maxBytes: MAX_IMAGE, kind: 'pics' })
}

/** Host a data:image thumbnail as a durable public URL. */
export async function uploadDataUrlToSupabase(dataUrl, userId, name = 'thumb.jpg') {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], name, { type: blob.type || 'image/jpeg' })
    return uploadImageToSupabase(file, userId)
  } catch (e) {
    return { ok: false, error: e?.message || 'Thumb upload failed.' }
  }
}

function storagePathFromPublicUrl(publicUrl) {
  const u = String(publicUrl || '')
  const i = u.indexOf(PUBLIC_MARKER)
  if (i < 0) return ''
  return decodeURIComponent(u.slice(i + PUBLIC_MARKER.length))
}

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
