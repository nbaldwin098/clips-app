/**
 * Restore user uploads that were wiped from clips_imports by the old
 * saveImport .slice(0, 200) + catalog seed loop, while the binary may still
 * live in IndexedDB (and/or legacy user_clips / cloud catalog).
 */
import { getImports, saveImport, mergeImports, lsGet, lsSet } from './storage'
import { isUserUploadRecord } from './mediaMeta'
import { listMediaBlobIds, getMediaBlobMeta } from './videoStorage'
import { notifyContentChanged, pullContentRecords } from './contentSync'

const HIDDEN_KEY = 'hidden_broken_media'

function isUploadLikeId(id) {
  const s = String(id || '')
  return s.startsWith('up_') || s.startsWith('pic_')
}

function readSessionUser() {
  const u = lsGet('user', null)
  return u?.id ? u : null
}

function withActor(row, actor) {
  if (!row || !actor?.id) return row
  if (row.creatorId || row.userId) return row
  return {
    ...row,
    creatorId: actor.id,
    userId: actor.id,
    handle: actor.handle || row.handle || '',
  }
}

function readHidden() {
  const list = lsGet(HIDDEN_KEY, [])
  return new Set(Array.isArray(list) ? list : [])
}

function unhideUploadIds(ids) {
  const want = new Set((ids || []).map(String).filter(isUploadLikeId))
  if (!want.size) return 0
  const hidden = readHidden()
  let removed = 0
  for (const id of want) {
    if (hidden.has(id)) {
      hidden.delete(id)
      removed += 1
    }
  }
  if (removed) lsSet(HIDDEN_KEY, [...hidden])
  return removed
}

function stubFromIdb(meta, actor = null) {
  const id = meta.id
  const isPic = id.startsWith('pic_') || String(meta.type || '').startsWith('image/')
  const titleFromName = String(meta.name || '').replace(/\.[^.]+$/, '') || (isPic ? 'Restored photo' : 'Restored upload')
  return withActor({
    id,
    type: isPic ? 'pic' : 'short',
    title: titleFromName.slice(0, 120),
    description: '',
    sourceUrl: '',
    mediaUrl: '',
    thumbUrl: '',
    origin: isPic ? 'pic-local' : 'upload-local',
    hosted: false,
    localStored: true,
    storedBytes: meta.size || 0,
    createdAt: meta.storedAt ? new Date(meta.storedAt).toISOString() : new Date().toISOString(),
    publishedAt: meta.storedAt ? new Date(meta.storedAt).toISOString() : new Date().toISOString(),
    status: 'published',
    restoredAt: new Date().toISOString(),
    restoredFrom: 'indexeddb',
  }, actor)
}

/** Claim local upload rows that lost their creator after a catalog wipe. */
export function claimOrphanUploads(actor = null) {
  const user = actor?.id ? actor : readSessionUser()
  if (!user?.id) return 0
  let n = 0
  for (const row of getImports()) {
    if (!row?.id) continue
    if (!isUserUploadRecord(row) && !isUploadLikeId(row.id)) continue
    if (row.creatorId || row.userId) continue
    saveImport(withActor(row, user))
    n += 1
  }
  return n
}

/** Bring back legacy user_clips rows into imports if missing. */
export function restoreFromLegacyClips(actor = null) {
  const user = actor?.id ? actor : readSessionUser()
  const legacy = lsGet('user_clips', []) || []
  if (!Array.isArray(legacy) || !legacy.length) return 0
  let n = 0
  const existing = new Set(getImports().map((r) => r?.id).filter(Boolean))
  for (const row of legacy) {
    if (!row?.id || existing.has(row.id)) continue
    if (!isUserUploadRecord(row) && !isUploadLikeId(row.id)) continue
    const next = withActor({
      ...row,
      origin: row.origin || (String(row.id).startsWith('pic_') ? 'pic-local' : 'upload-local'),
      localStored: row.localStored ?? true,
      restoredAt: new Date().toISOString(),
      restoredFrom: 'user_clips',
    }, user)
    saveImport(next)
    existing.add(row.id)
    n += 1
  }
  return n
}

/** Rebuild catalog rows for IndexedDB blobs that no longer have an imports entry. */
export async function restoreFromIndexedDb(actor = null) {
  const user = actor?.id ? actor : readSessionUser()
  const ids = await listMediaBlobIds()
  if (!ids.length) return 0
  const existing = new Set(getImports().map((r) => r?.id).filter(Boolean))
  let n = 0
  const restoredIds = []
  for (const id of ids) {
    if (!isUploadLikeId(id)) continue
    if (existing.has(id)) continue
    const meta = await getMediaBlobMeta(id)
    if (!meta) continue
    saveImport(stubFromIdb(meta, user))
    existing.add(id)
    restoredIds.push(id)
    n += 1
  }
  unhideUploadIds(restoredIds)
  return n
}

/** Pull cloud catalog and keep any upload-like rows missing locally. */
export async function restoreFromCloud(actor = null) {
  const user = actor?.id ? actor : readSessionUser()
  try {
    const rows = await pullContentRecords(400)
    if (!rows?.length) return 0
    const existing = new Set(getImports().map((r) => r?.id).filter(Boolean))
    const missing = rows
      .filter((r) => r?.id && isUploadLikeId(r.id) && !existing.has(r.id))
      .map((r) => withActor({
        ...r,
        restoredAt: new Date().toISOString(),
        restoredFrom: 'cloud',
      }, user))
    if (!missing.length) return 0
    mergeImports(missing)
    unhideUploadIds(missing.map((r) => r.id))
    return missing.length
  } catch {
    return 0
  }
}

/**
 * Full restore pass. Safe to run on every boot — only re-adds missing upload rows.
 * Returns counts so Studio / console can show what came back.
 */
export async function restoreLostUploads(actor = null) {
  const user = actor?.id ? actor : readSessionUser()
  const fromLegacy = restoreFromLegacyClips(user)
  const fromIdb = await restoreFromIndexedDb(user)
  const fromCloud = await restoreFromCloud(user)
  const claimed = claimOrphanUploads(user)
  const unhidden = unhideUploadIds(
    getImports().filter((r) => isUserUploadRecord(r) || isUploadLikeId(r?.id)).map((r) => r.id),
  )
  const total = fromLegacy + fromIdb + fromCloud
  if (total || unhidden || claimed) {
    try { notifyContentChanged() } catch {}
  }
  if (typeof console !== 'undefined' && (total || unhidden || claimed)) {
    console.info('[Clips] restored uploads', { fromLegacy, fromIdb, fromCloud, claimed, unhidden })
  }
  return { fromLegacy, fromIdb, fromCloud, claimed, unhidden, total: total + claimed }
}
