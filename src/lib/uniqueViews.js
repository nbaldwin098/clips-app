/**
 * Unique viewers for analytics / studio KPIs.
 * One count per viewer identity (signed-in user id, or guest fingerprint / IP key) — not per rewatch.
 */
import { lsGet, lsSet } from './storage'

const UNIQUE_KEY = 'clips_unique_viewers_v1'
const GUEST_KEY = 'clips_guest_viewer_id'

export function getGuestViewerId() {
  if (typeof window === 'undefined') return 'guest_ssr'
  try {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = `g_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  } catch {
    return `g_tmp_${Date.now()}`
  }
}

/** Stable identity for uniqueness: prefer cloud user, else guest device id. */
export function resolveViewerKey(actorId = null) {
  if (actorId) return String(actorId)
  return `guest:${getGuestViewerId()}`
}

function readMap() {
  const all = lsGet(UNIQUE_KEY, {}) || {}
  return all && typeof all === 'object' && !Array.isArray(all) ? all : {}
}

/** @returns {boolean} true if this is the first time this viewer counts for the content */
export function markUniqueViewer(contentId, viewerKey) {
  if (!contentId || !viewerKey) return false
  const all = readMap()
  const bucket = all[contentId] && typeof all[contentId] === 'object' ? all[contentId] : {}
  if (bucket[viewerKey]) return false
  bucket[viewerKey] = Date.now()
  all[contentId] = bucket
  lsSet(UNIQUE_KEY, all)
  return true
}

export function uniqueViewerCount(contentId) {
  if (!contentId) return 0
  const bucket = readMap()[contentId]
  if (!bucket || typeof bucket !== 'object') return 0
  return Object.keys(bucket).length
}

export function uniqueViewerCountForIds(ids = []) {
  let n = 0
  for (const id of ids) n += uniqueViewerCount(id)
  return n
}

/** Prefer cloud unique tally when present; else local unique set. */
export function displayUniqueViews(contentId, cloudViews = null) {
  const cloud = Number(cloudViews)
  if (Number.isFinite(cloud) && cloud > 0) return cloud
  return uniqueViewerCount(contentId)
}
