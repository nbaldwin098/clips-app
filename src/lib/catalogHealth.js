/**
 * Drop dead and fake catalog rows so gray tiles and sample clips cannot
 * come back on refresh. Local cache is the UI source; cloud pull must
 * use the same rules or merge will resurrect junk.
 */
import { lsGet, lsSet, removeImport, getImports } from './storage'
import { isUserUploadRecord } from './mediaMeta'
import { clearFrozenFeeds } from './frozenFeeds'

const HIDDEN_KEY = 'hidden_broken_media'

/** Titles the operator asked to purge. */
const RETIRED_TITLE_RE = /^(insane|spooky\s*halloween)$/i

export function isHttpUrl(url) {
  const u = String(url || '')
  return u.startsWith('https://') || u.startsWith('http://')
}

export function isDataImageUrl(url) {
  return String(url || '').startsWith('data:image/')
}

export function isBlobUrl(url) {
  return String(url || '').startsWith('blob:')
}

export function isReferenceItem(item) {
  if (!item) return true
  if (item.reference === true) return true
  if (item.origin === 'reference') return true
  const id = String(item.id || '')
  const creator = String(item.creatorId || item.userId || '')
  return id.startsWith('ref-short-') || creator.startsWith('ref-creator-')
}

export function isKnownDeadUrl(url) {
  const u = String(url || '').toLowerCase()
  if (!u) return false
  return /picsum\.photos|placekitten|loremflickr|via\.placeholder|sample-videos\.com|test-videos\.co\.uk|gtv-videos-bucket|ref-short-/.test(u)
}

export function hasStableImage(item) {
  if ([item?.mediaUrl, item?.thumbUrl, item?.sourceUrl, item?.mosaicThumb].some(isKnownDeadUrl)) return false
  return [item?.mediaUrl, item?.thumbUrl, item?.sourceUrl, item?.mosaicThumb].some((u) => isHttpUrl(u) || isDataImageUrl(u))
}

export function hasLocalMediaHint(item) {
  if (!item?.id) return false
  if (item.localStored === true) return true
  if (isUserUploadRecord(item) && Number(item.storedBytes) > 0) {
    const media = String(item.mediaUrl || '')
    const source = String(item.sourceUrl || '')
    if (isBlobUrl(media) || isBlobUrl(source)) return true
  }
  return false
}

export function hasPlayableVideo(item) {
  if ([item?.mediaUrl, item?.sourceUrl].some(isKnownDeadUrl)) return false
  if ([item?.mediaUrl, item?.sourceUrl].some((u) => isHttpUrl(u))) return true
  if (hasLocalMediaHint(item) && [item?.mediaUrl, item?.sourceUrl].some(isBlobUrl)) return true
  return false
}

export function isRetiredCatalogItem(item) {
  if (!item) return false
  const id = String(item.id || '')
  const creator = String(item.creatorId || item.userId || '')
  const origin = String(item.origin || '')
  const handle = String(item.handle || '').toLowerCase()
  const title = String(item.title || '').trim()
  if (RETIRED_TITLE_RE.test(title)) return true
  return (
    id.startsWith('edu-')
    || creator === 'edu-kids-class'
    || handle === 'kidsclass'
    || origin === 'public-education'
    || id === 'org-class-english-nouns'
    || /or%c3%a4knebara|oraknebara|substantiv/i.test(String(item.mediaUrl || '') + String(item.title || ''))
  )
}

export function isFeedable(item) {
  if (!item || isReferenceItem(item) || isRetiredCatalogItem(item)) return false
  if (item.visibility === 'private' || item.visibility === 'unlisted') return false
  try {
    if (item.id && hiddenBrokenIds().has(item.id)) return false
  } catch {}
  if (item.type === 'pic') {
    if (isUserUploadRecord(item)) {
      return isHttpUrl(item?.mediaUrl) || isHttpUrl(item?.thumbUrl) || isHttpUrl(item?.sourceUrl) || isDataImageUrl(item?.mediaUrl)
    }
    return hasStableImage(item)
  }
  if (isUserUploadRecord(item)) {
    return isHttpUrl(item?.mediaUrl) || isHttpUrl(item?.sourceUrl)
  }
  return hasPlayableVideo(item)
}

export function hiddenBrokenIds() {
  const list = lsGet(HIDDEN_KEY, [])
  return new Set(Array.isArray(list) ? list : [])
}

export function hideBrokenMedia(id) {
  if (!id) return
  const row = (getImports() || []).find((r) => r?.id === id) || null
  const next = hiddenBrokenIds()
  next.add(id)
  lsSet(HIDDEN_KEY, [...next])
  // Hosted / user uploads stay in the session catalog — only hide from feeds.
  // Never hard-delete cloud truth from a thumb/media error path.
  if (row && (isUserUploadRecord(row) || row.hosted === true)) {
    try { clearFrozenFeeds() } catch { /* ok */ }
    return
  }
  removeImport(id)
}

export function unhideBrokenMedia(ids = []) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : []
  if (!list.length) return
  const next = hiddenBrokenIds()
  let changed = false
  for (const id of list) {
    if (next.delete(id)) changed = true
  }
  if (!changed) return
  lsSet(HIDDEN_KEY, [...next])
  try { clearFrozenFeeds() } catch { /* ok */ }
}

export function purgeDeadCatalog() {
  const hidden = hiddenBrokenIds()
  const list = getImports() || []
  let removed = 0
  for (const row of list) {
    if (!row?.id) continue
    const protect = isUserUploadRecord(row) || row.hosted === true
    if (protect) {
      if (isReferenceItem(row) || isRetiredCatalogItem(row)) {
        removeImport(row.id)
        removed += 1
        continue
      }
      // Keep hosted/http uploads. Drop ghost uploads with no playable URL.
      const hasHttp =
        isHttpUrl(row.mediaUrl) || isHttpUrl(row.sourceUrl) || isHttpUrl(row.thumbUrl)
      if (!isFeedable(row) && !hasHttp) {
        removeImport(row.id)
        removed += 1
      }
      continue
    }
    const drop =
      hidden.has(row.id)
      || isReferenceItem(row)
      || isRetiredCatalogItem(row)
      || !isFeedable(row)
    if (drop) {
      removeImport(row.id)
      removed += 1
    }
  }
  if (removed > 0) {
    try { clearFrozenFeeds() } catch { /* ok */ }
  }
  try {
    localStorage.removeItem('user_clips')
  } catch { /* ok */ }
  return removed
}
