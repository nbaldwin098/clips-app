/**
 * YouTube-style public content ids — opaque random letters/numbers.
 * Share form: https://calabi.us/<id>
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
/** Match YouTube-ish length; 11 base62 chars ≈ 65 bits. */
export const PUBLIC_ID_LENGTH = 11

/** App route segments that must never be treated as a content id. */
export const RESERVED_PATH_KINDS = new Set([
  'home', 'creators', 'clips', 'shorts', 'live', 'dashboard', 'wallet', 'settings',
  'explore', 'history', 'watch-again', 'hearts', 'liked', 'watch-later', 'library', 'stats', 'help', 'about',
  'notifications', 'messages', 'pics', 'checkout', 'creator-apply', 'verify', 'advertise', 'advertiser-portal', 'support', 'admin',
  'analytics', 'channel', 'profile', 'content-rules', 'vods',
  'subscriptions', 'following', 'playlists', 'community', 'studio-tools', 'stream-settings',
  'calabi-studio', 'calabi-cash', 'shop', 'marketplace', 'seller', 'seller-portal',
  'legal-tos', 'legal-privacy', 'legal-creator', 'legal-community',
  'terms', 'tos', 'privacy', 'creator-agreement', 'guidelines',
  'watch', 'sound', 'tag', 'create', 'pic', 'playlist', 'v', 'content',
  'api', 'assets', 'static', 'favicon.ico', 'robots.txt', 'appeals', 'rewards',
  'news',
])

function randomChar() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(1)
    crypto.getRandomValues(buf)
    return ALPHABET[buf[0] % ALPHABET.length]
  }
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
}

/** Generate an opaque public id (letters + numbers only). */
export function makePublicId(length = PUBLIC_ID_LENGTH) {
  const n = Math.max(8, Math.min(32, Number(length) || PUBLIC_ID_LENGTH))
  let out = ''
  for (let i = 0; i < n; i += 1) out += randomChar()
  // Never collide with a reserved path segment.
  if (RESERVED_PATH_KINDS.has(out.toLowerCase())) return makePublicId(n)
  return out
}

/** True for new short ids (and underscore variant if ever needed). */
export function isShortPublicId(value) {
  const s = String(value || '')
  return /^[A-Za-z0-9]{8,32}$/.test(s) && !RESERVED_PATH_KINDS.has(s.toLowerCase())
}

/**
 * True when a single URL segment should open a post (bare /{id}).
 * Accepts new short ids plus legacy up_/pic_/org- keys so old links still work bare.
 */
export function looksLikeContentId(value) {
  const s = String(value || '')
  if (!s || RESERVED_PATH_KINDS.has(s.toLowerCase())) return false
  if (isShortPublicId(s)) return true
  if (s.startsWith('up_') || s.startsWith('pic_') || s.startsWith('org-')) return true
  return false
}

/**
 * Allocate a unique public id against an optional occupied-id set / checker.
 * @param {(id: string) => boolean} [isTaken]
 */
export function allocatePublicId(isTaken = null, length = PUBLIC_ID_LENGTH) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const id = makePublicId(length)
    if (typeof isTaken === 'function' && isTaken(id)) continue
    return id
  }
  // Extremely unlikely fallback — longer id.
  return makePublicId(length + 4)
}
