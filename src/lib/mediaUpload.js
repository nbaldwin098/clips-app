/**
 * Upload video/image to Supabase Storage → durable public URL.
 * Duration limits: clips 60s, videos 24h. No public size caps (safety ceiling only).
 *
 * REQUIRES a public Storage bucket named exactly "clips".
 * Create it in Supabase → Storage, or run supabase/migrations/0003_clips_storage_bucket.sql
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const BUCKET = 'clips'
/** Clips only — 60 seconds. */
export const MAX_CLIP_DURATION_SEC = 60
/** Long-form videos — 24 hours. */
export const MAX_VIDEO_DURATION_SEC = 24 * 60 * 60
/** Abuse ceiling only (not shown to users as a product limit). */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024
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

export function canHostUploads(actor) {
  return !!(isSupabaseConfigured() && actor?.id && actor.provider === 'supabase')
}

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

export function clipLimitsMessage(durationSec = null) {
  const limit = MAX_CLIP_DURATION_SEC
  const got = Number(durationSec)
  if (Number.isFinite(got) && got > 0) {
    return `This clip is ${Math.ceil(got)}s — clips must be ${limit} seconds or shorter. Trim it or upload as a video instead.`
  }
  return `Clips must be ${limit} seconds or shorter. MP4 works best on phones.`
}

export function videoLimitsMessage(durationSec = null) {
  const hours = MAX_VIDEO_DURATION_SEC / 3600
  const got = Number(durationSec)
  if (Number.isFinite(got) && got > 0) {
    const gotHours = (got / 3600).toFixed(1)
    return `This file is about ${gotHours}h — videos must be ${hours} hours or shorter.`
  }
  return `Videos must be ${hours} hours or shorter.`
}

export function audioOnlyMessage() {
  return 'This file looks audio-only. Upload a video with a picture track (MP4 works best).'
}

function bucketMissingMessage() {
  return 'Storage bucket "clips" is missing. In Supabase → Storage, create a PUBLIC bucket named exactly clips (or run migration 0003_clips_storage_bucket.sql in the SQL editor).'
}

async function uploadToBucket(file, userId, { maxBytes, kind }) {
  if (!file) return { ok: false, error: 'No file' }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Storage not connected.' }
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: 'File is too large to upload.',
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
      const msg = String(upErr.message || upErr.error || 'Upload failed.')
      if (/bucket not found|NoSuchBucket/i.test(msg)) {
        return { ok: false, error: bucketMissingMessage() }
      }
      return { ok: false, error: msg }
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) return { ok: false, error: 'No public URL returned.' }
    return { ok: true, publicUrl: data.publicUrl, path }
  } catch (e) {
    const msg = e?.message || 'Upload failed.'
    if (/bucket not found|NoSuchBucket/i.test(msg)) {
      return { ok: false, error: bucketMissingMessage() }
    }
    return { ok: false, error: msg }
  }
}

export async function uploadVideoToSupabase(file, userId, { asClip = false } = {}) {
  return uploadToBucket(file, userId, { maxBytes: MAX_UPLOAD_BYTES, kind: 'videos' })
}

export async function uploadImageToSupabase(file, userId) {
  return uploadToBucket(file, userId, { maxBytes: MAX_IMAGE, kind: 'pics' })
}

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

function decodeStoragePath(raw) {
  const sliced = String(raw || '').split('?')[0]
  if (!sliced) return ''
  try {
    return decodeURIComponent(sliced)
  } catch {
    return sliced
  }
}

/** Bucket-relative path from a public, signed, or authenticated Storage URL. */
export function storagePathFromPublicUrl(publicUrl) {
  const u = String(publicUrl || '')
  if (!u) return ''
  // Public object URL: .../storage/v1/object/public/clips/<path>
  let i = u.indexOf(PUBLIC_MARKER)
  if (i >= 0) return decodeStoragePath(u.slice(i + PUBLIC_MARKER.length))
  // Signed / render variants — still under the clips bucket
  const alt = `/storage/v1/object/sign/${BUCKET}/`
  i = u.indexOf(alt)
  if (i >= 0) return decodeStoragePath(u.slice(i + alt.length))
  const authenticated = `/storage/v1/object/authenticated/${BUCKET}/`
  i = u.indexOf(authenticated)
  if (i >= 0) return decodeStoragePath(u.slice(i + authenticated.length))
  return ''
}

/**
 * Accept a public/signed URL or a raw bucket path (`videos/<uid>/file.mp4`).
 * Returns '' when the value is not a clips-bucket object.
 */
export function hostedMediaObjectPath(urlOrPath) {
  const s = String(urlOrPath || '').trim()
  if (!s) return ''
  const fromUrl = storagePathFromPublicUrl(s)
  if (fromUrl) return fromUrl
  if (s.includes('://') || s.startsWith('data:') || s.startsWith('blob:')) return ''
  const cleaned = s.replace(/^\/+/, '')
  if (!cleaned || cleaned.includes('..')) return ''
  if (/^(videos|pics|thumbs)\//i.test(cleaned)) return cleaned
  return ''
}

/** Unique clips-bucket paths on a catalog row (media, thumb, stored path). */
export function collectHostedMediaTargets(record) {
  if (!record) return []
  const seen = new Set()
  const out = []
  const add = (value) => {
    const path = hostedMediaObjectPath(value)
    if (!path || seen.has(path)) return
    seen.add(path)
    out.push(path)
  }
  add(record.storagePath)
  add(record.mediaUrl)
  add(record.sourceUrl)
  add(record.thumbUrl)
  add(record.mosaicThumb)
  return out
}

export async function deleteHostedMedia(urlOrPath) {
  const path = hostedMediaObjectPath(urlOrPath)
  if (!path) return false
  if (!isSupabaseConfigured()) {
    console.warn('[calabi] deleteHostedMedia: Supabase not configured', path)
    return false
  }
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error } = await sb.storage.from(BUCKET).remove([path])
    if (error) {
      console.warn('[calabi] storage remove failed:', error.message || error, path)
      return false
    }
    return true
  } catch (err) {
    console.warn('[calabi] deleteHostedMedia error:', err?.message || err)
    return false
  }
}
