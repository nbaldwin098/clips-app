import { safeHttpUrl, safeMediaUrl } from './safeUrl'

const warmed = new Set()
const preloadLinks = new Set()

function remember(url) {
  if (!url || warmed.has(url)) return false
  warmed.add(url)
  return true
}

/** Warm the next clip / pic / watch file so swipe and Next are not a blank wait. */
export function preloadMediaUrl(raw, kind = 'video') {
  if (typeof document === 'undefined') return
  const asImage = kind === 'image'
  const url = asImage
    ? (safeHttpUrl(raw, { allowHttp: true }) || (String(raw || '').startsWith('data:image/') ? String(raw) : ''))
    : safeMediaUrl(raw)
  if (!url || url.startsWith('blob:')) return
  if (!remember(`${kind}:${url}`)) return
  if (asImage || /^data:image\//.test(url)) {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    return
  }
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'video'
  link.href = url
  document.head.appendChild(link)
  preloadLinks.add(link)
}

/** Drop stale preload links when the reel moves on (keeps memory flat on long sessions). */
export function revokeStalePreloads(keepUrls = []) {
  if (typeof document === 'undefined') return
  const keep = new Set((keepUrls || []).filter(Boolean))
  for (const link of preloadLinks) {
    if (!keep.has(link.href)) {
      link.remove()
      preloadLinks.delete(link)
    }
  }
}

export function preloadPostedItem(item) {
  if (!item) return
  if (item.type === 'pic') {
    preloadMediaUrl(item.thumbUrl || item.mediaUrl || item.sourceUrl, 'image')
    return
  }
  preloadMediaUrl(item.thumbUrl, 'image')
  preloadMediaUrl(item.mediaUrl || item.sourceUrl, 'video')
}

export function preloadPostedItems(list, limit = 4) {
  const rows = Array.isArray(list) ? list : []
  let n = 0
  for (const row of rows) {
    const item = row?.item || row
    if (!item || row?.kind === 'ad') continue
    preloadPostedItem(item)
    n += 1
    if (n >= limit) break
  }
}

/** Warm content ahead in a mixed reel. */
export function preloadReelAhead(mixed, fromIndex = 0, count = 3) {
  const rows = Array.isArray(mixed) ? mixed : []
  const slice = rows.slice(Math.max(0, fromIndex), Math.max(0, fromIndex) + count + 2)
  preloadPostedItems(slice, count)
}

/** @deprecated ads removed */
export function warmAdsForSurface() {}
