/**
 * Storage helpers.
 * Catalog (imports) is cloud-only via catalogStore — not localStorage.
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
  // imports intentionally NOT persisted
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
  // Never serve a persisted catalog — wipe legacy key if present
  if (key === 'imports' || key === LS_KEYS.imports) {
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
  // Block catalog writes to disk
  if (key === 'imports' || key === 'clips_imports') return
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

/** Optimistic memory update only — cloud is source of truth after sync. */
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

/**
 * Replace memory catalog with cloud rows (not a merge with disk).
 * Call after every successful cloud pull.
 */
export function replaceImportsFromCloud(records) {
  return setCatalog(Array.isArray(records) ? records : [])
}

/** @deprecated use replaceImportsFromCloud — kept so old callers compile */
export function mergeImports(records) {
  return replaceImportsFromCloud(records)
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
