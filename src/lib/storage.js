/**
 * Storage helpers.
 * Catalog (imports) is cloud-backed via catalogStore — not localStorage.
 * Liked/saved/history/settings remain device prefs until those move to cloud too.
 */

import { attachCrossPostMeta, detectPlatformFromUrl } from './crossPostDetector'
import {
  getCatalog,
  setCatalog,
  upsertCatalogRecord,
  patchCatalogRecord,
  removeCatalogRecord,
} from './catalogStore'

export const STORAGE_TARGETS = {
  ZERO_REF: 'zero-storage-reference',
  B2: 'backblaze-b2',
  SUPABASE: 'supabase-free',
}

const LS_KEYS = {
  user: 'clips_user',
  mode: 'clips_mode',
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
  if (key === 'imports' || key === 'clips_imports') {
    try { localStorage.removeItem('clips_imports') } catch { /* ok */ }
    return Array.isArray(fallback) ? fallback : []
  }
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
  if (key === 'imports' || key === 'clips_imports') return
  try {
    localStorage.setItem(LS_KEYS[key] || key, JSON.stringify(value))
  } catch {
    // quota or private mode
  }
}

export function lsRemove(key) {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(LS_KEYS[key] || key)
}

/** One-time wipe of legacy local catalog mirrors. */
export function purgeLegacyLocalCatalog() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem('clips_imports')
    localStorage.removeItem('user_clips')
    localStorage.removeItem('imports')
  } catch { /* ok */ }
}

export function parseExternalShort(url) {
  try {
    const platformInfo = detectPlatformFromUrl(url)
    const platform = platformInfo?.id || 'unknown'

    const record = {
      id: `ref_${Date.now()}`,
      platform,
      sourceUrl: url,
      title: platformInfo ? `Imported from ${platformInfo.label}` : 'Imported short',
      description: 'External reference. Binary remains at origin.',
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

/** Upsert one record into session catalog (after upload or edit). */
export function saveImport(record) {
  if (!record?.id) return getImports()
  return upsertCatalogRecord(record)
}

export function getImports() {
  return getCatalog()
}

export function updateImport(id, patch) {
  return patchCatalogRecord(id, patch)
}

export function removeImport(id) {
  removeCatalogRecord(id)
}

/** Full replace from a successful cloud pull. */
export function replaceImportsFromCloud(records) {
  return setCatalog(Array.isArray(records) ? records : [])
}

/**
 * Merge records into the session catalog (seed + soft sync).
 * Must NOT wipe existing rows — that deleted just-uploaded clips.
 */
export function mergeImports(records) {
  if (!records?.length) return getImports()
  const byId = new Map(getCatalog().map((r) => [r.id, r]))
  for (const rec of records) {
    if (!rec?.id) continue
    const prev = byId.get(rec.id) || {}
    const merged = { ...prev, ...rec }
    // Never let a later sync move the original post clock.
    const prevStamp = prev.firstPublishedAt || prev.publishedAt || prev.createdAt
    const nextStamp = rec.firstPublishedAt || rec.publishedAt || rec.createdAt
    if (prevStamp && nextStamp) {
      const earlier = new Date(prevStamp).getTime() <= new Date(nextStamp).getTime() ? prevStamp : nextStamp
      merged.firstPublishedAt = prev.firstPublishedAt || rec.firstPublishedAt || earlier
      if (prev.createdAt) merged.createdAt = prev.createdAt
    } else if (prev.firstPublishedAt) {
      merged.firstPublishedAt = prev.firstPublishedAt
    }
    byId.set(rec.id, merged)
  }
  return setCatalog([...byId.values()])
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
