/**
 * Storage helpers + local persistence.
 * Primary path: Zero-Storage Smart Reference — store only metadata + external URL.
 * Optional later path: owned copies on object storage + Cloudflare delivery.
 * localStorage holds client-side user state until a backend is wired.
 */

import { attachCrossPostMeta, detectPlatformFromUrl } from './crossPostDetector'

export const STORAGE_TARGETS = {
  ZERO_REF: 'zero-storage-reference',
  B2: 'backblaze-b2',
  SUPABASE: 'supabase-free',
}

const LS_KEYS = {
  user: 'clips_user',
  mode: 'clips_mode',
  imports: 'clips_imports',
  liked: 'clips_liked',
  saved: 'clips_saved',
  settings: 'clips_settings',
  watchHistory: 'clips_history',
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function lsGet(key, fallback = null) {
  if (typeof localStorage === 'undefined') return fallback
  const parsed = safeParse(localStorage.getItem(LS_KEYS[key] || key), fallback)
  if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback
  if (
    fallback
    && typeof fallback === 'object'
    && !Array.isArray(fallback)
    && (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
  ) {
    return fallback
  }
  return parsed
}

export function lsSet(key, value) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LS_KEYS[key] || key, JSON.stringify(value))
  } catch {
    // quota or private mode — ignore
  }
}

export function lsRemove(key) {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(LS_KEYS[key] || key)
}

/**
 * Parse a public short URL into a lightweight metadata record.
 * Attaches cross-post assessment. Does not download binary video data.
 */
export function parseExternalShort(url) {
  try {
    const platformInfo = detectPlatformFromUrl(url)
    const platform = platformInfo?.id || 'unknown'

    const record = {
      id: `ref_${Date.now()}`,
      platform,
      sourceUrl: url,
      title: platformInfo ? `Imported from ${platformInfo.label}` : 'Imported short',
      description: 'Zero-storage reference. Binary remains at origin.',
      storedBytes: 0,
      createdAt: new Date().toISOString(),
      type: 'short',
      engagement: {
        completionRate: 0,
        loops: 0,
        shares: 0,
        comments: 0,
        saves: 0,
        earlySkips: 0,
        likes: 0,
      },
      views: 0,
    }

    return attachCrossPostMeta(record)
  } catch {
    return null
  }
}

/**
 * Persist an imported reference into the local library.
 */
export function saveImport(record) {
  const list = lsGet('imports', [])
  const next = [record, ...list.filter((r) => r.id !== record.id)].slice(0, 200)
  lsSet('imports', next)
  return next
}

export function getImports() {
  const list = lsGet('imports', [])
  return Array.isArray(list) ? list.filter((row) => row && typeof row === 'object') : []
}

/**
 * Merge a batch of records (typically pulled from the cloud catalog) into
 * the local import cache. Existing local fields are preserved unless the
 * incoming record overrides them, so a record this device is still
 * mid-publish on never gets clobbered by a stale/partial cloud copy.
 */
function isStableUrl(url) {
  const u = String(url || '')
  return u.startsWith('https://') || u.startsWith('http://') || u.startsWith('data:')
}

function isDeadUrl(url) {
  const u = String(url || '')
  return !u || u.startsWith('blob:')
}

function pickMergedUrl(incoming, existing) {
  if (isDeadUrl(incoming) && isStableUrl(existing)) return existing
  return incoming || existing || ''
}

export function mergeImports(records) {
  if (!records?.length) return getImports()
  const local = getImports()
  const byId = new Map(local.map((r) => [r.id, r]))
  for (const rec of records) {
    if (!rec?.id) continue
    const prev = byId.get(rec.id) || {}
    const next = { ...prev, ...rec }
    next.mediaUrl = pickMergedUrl(rec.mediaUrl, prev.mediaUrl)
    next.sourceUrl = pickMergedUrl(rec.sourceUrl, prev.sourceUrl || prev.mediaUrl)
    next.thumbUrl = pickMergedUrl(rec.thumbUrl, prev.thumbUrl)
    byId.set(rec.id, next)
  }
  const merged = [...byId.values()]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 500)
  lsSet('imports', merged)
  return merged
}

export function toggleLiked(id) {
  const set = new Set(lsGet('liked', []))
  if (set.has(id)) set.delete(id)
  else set.add(id)
  const arr = [...set]
  lsSet('liked', arr)
  return arr
}

export function toggleSaved(id) {
  const set = new Set(lsGet('saved', []))
  if (set.has(id)) set.delete(id)
  else set.add(id)
  const arr = [...set]
  lsSet('saved', arr)
  return arr
}

export function getLiked() {
  return lsGet('liked', [])
}

export function getSaved() {
  return lsGet('saved', [])
}

export function pushHistory(entry) {
  const list = lsGet('watchHistory', [])
  const next = [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, 100)
  lsSet('watchHistory', next)
  return next
}

export function getHistory() {
  return lsGet('watchHistory', [])
}

export function saveUserSettings(partial) {
  const current = lsGet('settings', {})
  const next = { ...current, ...partial }
  lsSet('settings', next)
  return next
}

export function getUserSettings() {
  return lsGet('settings', {})
}
