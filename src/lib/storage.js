/**
 * Zero-cost storage architecture helpers + local persistence.
 * - Zero-Storage Smart Reference: store only metadata + external stream URL.
 * - Backblaze B2 S3-compatible target for scale ($0.005/GB).
 * - Cloudflare edge caching assumed for delivery.
 * - localStorage for client-side user state until backend is wired.
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
  return safeParse(localStorage.getItem(LS_KEYS[key] || key), fallback)
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

export function estimateB2Cost(videoCount, avgMb = 30) {
  const gb = (videoCount * avgMb) / 1024
  const monthly = gb * 0.005
  return {
    videoCount,
    totalGb: Math.round(gb * 100) / 100,
    monthlyUsd: Math.round(monthly * 100) / 100,
  }
}

export function estimateS3Cost(videoCount, avgMb = 30) {
  const gb = (videoCount * avgMb) / 1024
  const storage = gb * 0.023
  const egress = gb * 0.09 * 0.3
  return {
    videoCount,
    totalGb: Math.round(gb * 100) / 100,
    monthlyUsd: Math.round((storage + egress) * 100) / 100,
  }
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

export function saveImport(record) {
  const list = lsGet('imports', [])
  const next = [record, ...list.filter((r) => r.id !== record.id)].slice(0, 200)
  lsSet('imports', next)
  return next
}

export function getImports() {
  return lsGet('imports', [])
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
