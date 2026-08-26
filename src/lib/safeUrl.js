import { isProdRuntime } from './runtimeEnv'

/**
 * Central URL allowlist. Never pass raw user input to href, iframe src,
 * <video src>, or window.open without going through one of these helpers.
 */

const DANGEROUS_SCHEME = /^(javascript|data|vbscript|file|about|blob):/i
const SAFE_BLOB = /^blob:/i
const SAFE_DATA_MEDIA = /^data:(image|video)\//i

function asUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  try {
    return new URL(s)
  } catch {
    return null
  }
}

/** https (and optional http) only — for links, ads, redirects. */
export function safeHttpUrl(raw, { allowHttp = false } = {}) {
  const s = String(raw || '').trim()
  if (!s || DANGEROUS_SCHEME.test(s)) return ''
  const u = asUrl(s)
  if (!u) return ''
  if (u.protocol === 'https:') return u.toString()
  if (allowHttp && u.protocol === 'http:') return u.toString()
  return ''
}

/** Playback sources: https, same-tab blob, or image/video data URLs. */
export function safeMediaUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (SAFE_BLOB.test(s) || SAFE_DATA_MEDIA.test(s)) return s
  const allowHttp = !isProdRuntime()
  return safeHttpUrl(s, { allowHttp })
}

/** window.open / <a target=_blank> — https only, no javascript: phishing. */
export function safeOpenUrl(raw) {
  return safeHttpUrl(raw, { allowHttp: false })
}

export function openSafeUrl(raw) {
  const url = safeOpenUrl(raw)
  if (!url || typeof window === 'undefined') return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/** Stripe Checkout must return to this tab so paid posts unlock. */
export function redirectSafeUrl(raw) {
  const url = safeOpenUrl(raw)
  if (!url || typeof window === 'undefined') return false
  window.location.assign(url)
  return true
}

const IFRAME_HOSTS = new Set([
  'www.youtube-nocookie.com',
  'www.youtube.com',
  'www.tiktok.com',
  'www.instagram.com',
  'clips.twitch.tv',
  'player.kick.com',
])

export function safeIframeSrc(raw) {
  const s = String(raw || '').trim()
  const u = asUrl(s)
  if (!u || u.protocol !== 'https:') return ''
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  const full = u.hostname.toLowerCase()
  if (IFRAME_HOSTS.has(full) || IFRAME_HOSTS.has(`www.${host}`)) return u.toString()
  return ''
}
