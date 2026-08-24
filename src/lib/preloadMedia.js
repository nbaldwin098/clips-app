import { safeHttpUrl, safeMediaUrl } from './safeUrl'

const warmed = new Set()

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

export function preloadPostedItems(list, limit = 3) {
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
