import { getImports, saveImport } from './storage'
import { uploadImageToSupabase } from './mediaUpload'
import { isSupabaseConfigured } from './supabaseClient'
import { pushContentRecord, notifyContentChanged } from './contentSync'

// Defensively strip raw storage/database error text that may have been saved
// into `description` by an earlier build, so it never renders on a card.
const LEAKED_ERROR_PATTERN = /row-level security|violates|local only\s*—/i
function sanitizeDescription(desc) {
  const text = String(desc || '')
  return LEAKED_ERROR_PATTERN.test(text) ? '' : text
}

export function getPicsFeed() {
  const all = (getImports() || []).filter((i) => i && i.type === 'pic')
  return all
    .map((raw) => ({
      id: raw.id,
      type: 'pic',
      title: raw.title || 'Photo',
      description: sanitizeDescription(raw.description),
      sourceUrl: raw.sourceUrl || raw.mediaUrl || '',
      mediaUrl: raw.mediaUrl || raw.sourceUrl || '',
      thumbUrl: raw.thumbUrl || raw.mediaUrl || '',
      handle: raw.handle,
      displayName: raw.displayName || raw.handle,
      avatarUrl: raw.avatarUrl || null,
      creatorId: raw.creatorId || raw.userId,
      createdAt: raw.createdAt || new Date().toISOString(),
      hosted: !!raw.hosted,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function publishPhoto(file, actor = null) {
  if (!file) return { ok: false, item: null, error: 'Choose a photo.' }
  if (!String(file.type || '').startsWith('image/')) {
    return { ok: false, item: null, error: 'Choose an image file (jpg, png, webp).' }
  }
  try {
    const id = `pic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    let mediaUrl = URL.createObjectURL(file)
    let hosted = false

    // Never surface raw storage/database errors to viewers — log internally and
    // fall back to the zero-storage local link. Cloud writes require a signed-in actor.
    if (actor?.id && isSupabaseConfigured()) {
      const up = await uploadImageToSupabase(file, actor.id)
      if (up.ok && up.publicUrl) {
        mediaUrl = up.publicUrl
        hosted = true
      } else if (up.error) {
        console.warn('[Clips] Supabase image upload failed, using local link:', up.error)
      }
    }

    const record = {
      id,
      type: 'pic',
      title: String(file.name || 'Photo').replace(/\.[^.]+$/, '') || 'Photo',
      description: '',
      sourceUrl: mediaUrl,
      mediaUrl,
      thumbUrl: mediaUrl,
      origin: hosted ? 'pic-upload' : 'pic-local',
      hosted,
      storedBytes: file.size || 0,
      createdAt: new Date().toISOString(),
    }
    if (actor?.id) {
      record.creatorId = actor.id
      record.userId = actor.id
      record.handle = actor.handle
      record.displayName = actor.displayName || actor.handle
      record.avatarUrl = actor.avatarUrl || null
    }
    saveImport(record)
    notifyContentChanged()
    pushContentRecord(record, actor).catch(() => {})
    return { ok: true, item: record, error: null, hosted }
  } catch (err) {
    return { ok: false, item: null, error: err?.message || 'Could not upload photo.' }
  }
}
