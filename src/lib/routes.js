/** Hash routes so a video, clip, pic, sound, or tag can be copied and reopened. */

export function parseRoute(hash = '') {
  const full = String(hash || (typeof window !== 'undefined' ? window.location.hash : '')).replace(/^#\/?/, '')
  const [path, qs] = full.split('?')
  const parts = (path || '').split('/').filter(Boolean)
  const kind = decodeURIComponent(parts[0] || 'home')
  const id = parts.slice(1).map((p) => decodeURIComponent(p)).join('/')
  const params = {}
  if (qs) {
    new URLSearchParams(qs).forEach((v, k) => { params[k] = v })
  }
  return { kind: kind === 'shorts' ? 'clips' : kind, id, params }
}

export function buildHash(kind, id = '', params = null) {
  const k = encodeURIComponent(kind || 'home')
  let hash = !id ? `#/${k}` : `#/${k}/${encodeURIComponent(id)}`
  if (params && typeof params === 'object') {
    const q = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
      if (val != null && val !== '') q.set(key, String(val))
    }
    const s = q.toString()
    if (s) hash += `?${s}`
  }
  return hash
}

function applyHash(kind, id, push, params = null) {
  if (typeof window === 'undefined') return buildHash(kind, id, params)
  const next = buildHash(kind, id, params)
  const url = `${window.location.pathname}${window.location.search}${next}`
  if (window.location.hash === next) return next
  if (push) window.history.pushState({ clips: true }, '', url)
  else window.history.replaceState({ clips: true }, '', url)
  return next
}

export function replaceHash(kind, id = '', params = null) {
  return applyHash(kind, id, false, params)
}

export function pushHash(kind, id = '', params = null) {
  return applyHash(kind, id, true, params)
}

export function shareUrl(kind, id, params = null) {
  if (typeof window === 'undefined') return buildHash(kind, id, params)
  return `${window.location.origin}${window.location.pathname}${buildHash(kind, id, params)}`
}

export async function copyShareUrl(kind, id, params = null) {
  const url = shareUrl(kind, id, params)
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
  }
  return url
}
