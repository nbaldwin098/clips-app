import { getImports, saveImport } from './storage'
import {
  uploadImageToSupabase,
  resolveUploadHost,
  signInToUploadMessage,
  uploadFailedMessage,
  deleteHostedMedia,
} from './mediaUpload'
import { pushContentRecord, notifyContentChanged, syncContentFromCloud } from './contentSync'
import { processImageFile } from './videoStorage'
import { hasStableImage, hiddenBrokenIds, isFeedable } from './catalogHealth'
import { isAccountHidden } from './trustSafety'
import { newContentId } from './newContentId'

const LEAKED_ERROR_PATTERN = /row-level security|violates|local only\s*—/i
function sanitizeDescription(desc) {
  const text = String(desc || '')
  return LEAKED_ERROR_PATTERN.test(text) ? '' : text
}

export function isHttpUrl(url) {
  const u = String(url || '')
  return u.startsWith('https://') || u.startsWith('http://')
}

export function isDataImageUrl(url) {
  return String(url || '').startsWith('data:image/')
}

export function pickImmediatePhotoSrc(pic, { full = false } = {}) {
  if (!pic) return ''
  if (full) {
    if (isHttpUrl(pic.mediaUrl)) return pic.mediaUrl
    if (isHttpUrl(pic.sourceUrl)) return pic.sourceUrl
    if (String(pic.mediaUrl || '').startsWith('blob:')) return pic.mediaUrl
    if (String(pic.sourceUrl || '').startsWith('blob:')) return pic.sourceUrl
    if (isHttpUrl(pic.thumbUrl) || isDataImageUrl(pic.thumbUrl)) return pic.thumbUrl
    return pic.mediaUrl || pic.thumbUrl || pic.sourceUrl || ''
  }
  const list = [pic.mosaicThumb, pic.thumbUrl, pic.mediaUrl, pic.sourceUrl]
  if (!full) {
    const data = list.find((u) => isDataImageUrl(u))
    if (data) return data
  }
  const stable = list.find((u) => isHttpUrl(u) || isDataImageUrl(u))
  if (stable) return stable
  return list.find(Boolean) || ''
}

export function getPicsFeed() {
  const hidden = hiddenBrokenIds()
  const all = (getImports() || []).filter((i) => i && i.type === 'pic' && isFeedable(i) && hasStableImage(i) && !hidden.has(i.id) && !isAccountHidden(i.creatorId || i.userId, i.handle))
  return all
    .map((raw) => ({
      id: raw.id,
      type: 'pic',
      title: raw.title || 'Photo',
      description: sanitizeDescription(raw.description),
      sourceUrl: raw.sourceUrl || raw.mediaUrl || '',
      mediaUrl: raw.mediaUrl || raw.sourceUrl || '',
      thumbUrl: raw.mosaicThumb || raw.thumbUrl || raw.mediaUrl || '',
      mosaicThumb: raw.mosaicThumb || (String(raw.thumbUrl || '').startsWith('data:image/') ? raw.thumbUrl : ''),
      handle: raw.handle,
      displayName: raw.displayName || raw.handle,
      avatarUrl: raw.avatarUrl || null,
      creatorId: raw.creatorId || raw.userId,
      origin: raw.origin || '',
      createdAt: raw.createdAt || raw.publishedAt || '',
      hosted: !!raw.hosted,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function publishPhoto(file, actor = null) {
  if (!file) return { ok: false, item: null, error: 'Choose a photo.' }
  if (!String(file.type || '').startsWith('image/')) {
    return { ok: false, item: null, error: 'Choose an image file (jpg, png, webp).' }
  }
  if (!actor?.id) return { ok: false, item: null, error: signInToUploadMessage() }

  const host = await resolveUploadHost(actor)
  if (!host?.id) {
    return {
      ok: false,
      item: null,
      error: actor?.id ? uploadFailedMessage() : signInToUploadMessage(),
    }
  }

  try {
    const processed = await processImageFile(file)
    const id = newContentId()
    const uploadFile = processed.displayFile || file

    const up = await uploadImageToSupabase(uploadFile, host.id)
    if (!up.ok || !up.publicUrl) {
      return { ok: false, item: null, error: uploadFailedMessage() }
    }
    const mediaUrl = up.publicUrl

    const record = {
      id,
      type: 'pic',
      title: String(file.name || 'Photo').replace(/\.[^.]+$/, '') || 'Photo',
      description: '',
      sourceUrl: mediaUrl,
      mediaUrl,
      thumbUrl: mediaUrl,
      mosaicThumb: String(processed.thumbUrl || '').startsWith('data:image/')
        ? processed.thumbUrl
        : mediaUrl,
      origin: 'pic-upload',
      hosted: true,
      localStored: false,
      storagePath: up.path || '',
      storedBytes: (processed.displayFile || file).size || 0,
      width: processed.width,
      height: processed.height,
      createdAt: new Date().toISOString(),
      priceUsd: 0,
      creatorId: host.id,
      userId: host.id,
      handle: host.handle || actor.handle,
      displayName: host.displayName || actor.displayName || actor.handle,
      avatarUrl: actor.avatarUrl || null,
    }

    const pushed = await pushContentRecord(record, host)
    if (!pushed) {
      await deleteHostedMedia(mediaUrl)
      return { ok: false, item: null, error: uploadFailedMessage() }
    }

    saveImport(record)
    notifyContentChanged()
    syncContentFromCloud(host).catch(() => {})
    return { ok: true, item: record, error: null, hosted: true }
  } catch {
    return { ok: false, item: null, error: uploadFailedMessage() }
  }
}
