/**
 * Promote legacy device-only uploads (IndexedDB) into cloud-hosted links.
 */
import { getImports, saveImport, updateImport } from './storage'
import { isUserUploadRecord } from './mediaMeta'
import { getMediaFile, deleteMediaBlob } from './videoStorage'
import {
  uploadVideoToSupabase,
  uploadImageToSupabase,
  canHostUploads,
} from './mediaUpload'
import { pushContentRecord, notifyContentChanged } from './contentSync'

function isHttp(url) {
  const u = String(url || '')
  return u.startsWith('https://') || u.startsWith('http://')
}

/**
 * For each local-only upload still in IndexedDB, upload to Storage, rewrite
 * the catalog row to a public URL, push cloud metadata, then drop the device blob.
 */
export async function promoteDeviceUploadsToCloud(actor = null) {
  if (!canHostUploads(actor)) return { promoted: 0, failed: 0 }
  let promoted = 0
  let failed = 0
  const rows = getImports().filter((r) => {
    if (!isUserUploadRecord(r)) return false
    if (isHttp(r.mediaUrl) || isHttp(r.sourceUrl)) return false
    return true
  })
  for (const row of rows) {
    try {
      const file = await getMediaFile(row.id)
      if (!file) {
        failed += 1
        continue
      }
      const isPic = row.type === 'pic' || String(row.id).startsWith('pic_')
      const up = isPic
        ? await uploadImageToSupabase(file, actor.id)
        : await uploadVideoToSupabase(file, actor.id)
      if (!up.ok || !up.publicUrl) {
        failed += 1
        continue
      }
      const next = {
        ...row,
        mediaUrl: up.publicUrl,
        sourceUrl: up.publicUrl,
        thumbUrl: isHttp(row.thumbUrl) ? row.thumbUrl : up.publicUrl,
        origin: isPic ? 'pic-upload' : 'upload',
        hosted: true,
        localStored: false,
        storagePath: up.path || '',
        creatorId: row.creatorId || actor.id,
        userId: row.userId || actor.id,
        handle: row.handle || actor.handle,
      }
      const pushed = await pushContentRecord(next, actor)
      if (!pushed) {
        failed += 1
        continue
      }
      saveImport(next)
      try { await deleteMediaBlob(row.id) } catch {}
      promoted += 1
    } catch {
      failed += 1
    }
  }
  if (promoted) {
    try { notifyContentChanged() } catch {}
  }
  if (typeof console !== 'undefined' && (promoted || failed)) {
    console.info('[Clips] promoted device uploads to cloud', { promoted, failed })
  }
  return { promoted, failed }
}

/** No-op alias kept for call sites that only need to mark hosted rows. */
export function markHosted(id, patch) {
  if (!id) return
  updateImport(id, patch || {})
}
