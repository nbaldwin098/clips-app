/** Path routes — posts share as calabi.us/<id> (YouTube-style). */

import { looksLikeContentId, RESERVED_PATH_KINDS } from './publicId.js'

function routeFromWindow() {
  if (typeof window === 'undefined') return '/'
  const hash = window.location.hash || ''
  if (hash.startsWith('#/')) return hash
  return `${window.location.pathname}${window.location.search}`
}

const CONTENT_SHARE_KINDS = new Set(['watch', 'clips', 'shorts', 'pic', 'v', 'content'])

export function parseRoute(raw = '') {
  let source = String(raw || '')
  if (!source) source = routeFromWindow()
  try {
    if (/^https?:\/\//i.test(source)) {
      const u = new URL(source)
      source = u.hash.startsWith('#/') ? u.hash : `${u.pathname}${u.search}`
    }
  } catch { /* keep source */ }
  const full = source.replace(/^#\/?/, '').replace(/^\//, '')
  const [path, qs] = full.split('?')
  const parts = (path || '').split('/').filter(Boolean)
  let kind = decodeURIComponent(parts[0] || 'home')
  let id = parts.slice(1).map((p) => decodeURIComponent(p)).join('/')
  // Bare /{id} → content (calabi.us/fnf48rth348…)
  if (!id && looksLikeContentId(kind)) {
    id = kind
    kind = 'content'
  }
  const params = {}
  if (qs) {
    new URLSearchParams(qs).forEach((v, k) => { params[k] = v })
  }
  return { kind: kind === 'shorts' ? 'clips' : kind, id, params }
}

/**
 * Build a path. Content kinds with an id become bare /{id} share links.
 * Page routes stay /clips, /watch (list), /profile/@handle, etc.
 * Legacy /watch/{id} still parses via parseRoute.
 */
export function buildHash(kind, id = '', params = null) {
  const rawKind = kind || 'home'
  const k = encodeURIComponent(rawKind)
  let path
  if ((!rawKind || rawKind === 'home') && !id) {
    path = '/'
  } else if (id && CONTENT_SHARE_KINDS.has(rawKind)) {
    // YouTube-style: calabi.us/<id>
    path = `/${encodeURIComponent(id)}`
  } else if (!id) {
    path = `/${k}`
  } else {
    path = `/${k}/${encodeURIComponent(id)}`
  }
  if (params && typeof params === 'object') {
    const q = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
      if (val != null && val !== '') q.set(key, String(val))
    }
    const s = q.toString()
    if (s) path += `?${s}`
  }
  return path
}

/** Explicit bare content path (same as buildHash('content', id)). */
export function buildContentPath(id, params = null) {
  return buildHash('content', id, params)
}

export function migrateHashToPath() {
  if (typeof window === 'undefined') return
  const hash = window.location.hash || ''
  if (!hash.startsWith('#/')) return
  const { kind, id, params } = parseRoute(hash)
  const next = buildHash(kind, id, params)
  window.history.replaceState({ clips: true }, '', next)
}

function applyHash(kind, id, push, params = null) {
  const next = buildHash(kind, id, params)
  if (typeof window === 'undefined') return next
  const current = `${window.location.pathname}${window.location.search}`
  if (current === next && !window.location.hash) return next
  if (push) window.history.pushState({ clips: true }, '', next)
  else window.history.replaceState({ clips: true }, '', next)
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
  return `${window.location.origin}${buildHash(kind, id, params)}`
}

export async function copyShareUrl(kind, id, params = null) {
  const url = shareUrl(kind, id, params)
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
  }
  return url
}

export { looksLikeContentId, RESERVED_PATH_KINDS }
