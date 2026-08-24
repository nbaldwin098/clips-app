/**
 * Drop dead and fake catalog rows so gray tiles and sample clips cannot
 * come back on refresh. Local cache is the UI source; cloud pull must
 * use the same rules or merge will resurrect junk.
 */
import { lsGet, lsSet, removeImport } from './storage'

const HIDDEN_KEY = 'hidden_broken_media'

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

export function hasPlayableVideo(item) {
  if ([item?.mediaUrl, item?.sourceUrl].some(isKnownDeadUrl)) return false
  return [item?.mediaUrl, item?.sourceUrl].some((u) => isHttpUrl(u) || isBlobUrl(u))
}

export function isRetiredCatalogItem(item) {
  if (!item) return false
  const id = String(item.id || '')
  const creator = String(item.creatorId || item.userId || '')
  const origin = String(item.origin || '')
  const handle = String(item.handle || '').toLowerCase()
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
  if (item.type === 'pic') return hasStableImage(item)
  return hasPlayableVideo(item)
}

export function hiddenBrokenIds() {
  const list = lsGet(HIDDEN_KEY, [])
  return new Set(Array.isArray(list) ? list : [])
}

export function hideBrokenMedia(id) {
  if (!id) return
  const next = hiddenBrokenIds()
  next.add(id)
  lsSet(HIDDEN_KEY, [...next])
  removeImport(id)
}

export function purgeDeadCatalog() {
  const hidden = hiddenBrokenIds()
  const list = lsGet('imports', []) || []
  if (!Array.isArray(list)) {
    lsSet('imports', [])
    return 0
  }
  const next = list.filter((row) => {
    if (!row?.id || hidden.has(row.id)) return false
    if (isReferenceItem(row)) return false
    if (isRetiredCatalogItem(row)) return false
    if (row.type === 'pic' && !hasStableImage(row)) return false
    if ((row.type === 'video' || row.type === 'short') && !hasPlayableVideo(row)) return false
    return true
  })
  if (next.length !== list.length) lsSet('imports', next)
  return list.length - next.length
}
