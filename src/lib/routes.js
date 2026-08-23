/** Hash routes so a video, clip, pic, sound, or tag can be copied and reopened. */

export function parseRoute(hash = '') {
  const raw = String(hash || (typeof window !== 'undefined' ? window.location.hash : '')).replace(/^#\/?/, '')
  const parts = raw.split('/').filter(Boolean)
  const kind = decodeURIComponent(parts[0] || 'home')
  const id = parts.slice(1).map((p) => decodeURIComponent(p)).join('/')
  return { kind: kind === 'shorts' ? 'clips' : kind, id }
}

export function buildHash(kind, id = '') {
  const k = encodeURIComponent(kind || 'home')
  if (!id) return `#/${k}`
  return `#/${k}/${encodeURIComponent(id)}`
}

function applyHash(kind, id, push) {
  if (typeof window === 'undefined') return buildHash(kind, id)
  const next = buildHash(kind, id)
  const url = `${window.location.pathname}${window.location.search}${next}`
  if (window.location.hash === next) return next
  if (push) window.history.pushState({ clips: true }, '', url)
  else window.history.replaceState({ clips: true }, '', url)
  return next
}

export function replaceHash(kind, id = '') {
  return applyHash(kind, id, false)
}

export function pushHash(kind, id = '') {
  return applyHash(kind, id, true)
}

export function shareUrl(kind, id) {
  if (typeof window === 'undefined') return buildHash(kind, id)
  return `${window.location.origin}${window.location.pathname}${buildHash(kind, id)}`
}

export async function copyShareUrl(kind, id) {
  const url = shareUrl(kind, id)
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
  }
  return url
}
