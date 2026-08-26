/**
 * Social account connects + one-click clip posting (OAuth tokens TBD).
 * Multi-stream destination prefs for Calabi + YouTube + TikTok.
 */

import { lsGet, lsSet } from './storage'

const SOCIAL = 'social_connects'
const MULTI = 'multi_stream_dest'
const CLIP_JOBS = 'auto_clip_jobs'

export const SOCIAL_PROVIDERS = [
  { id: 'youtube', label: 'YouTube', short: 'YT' },
  { id: 'tiktok', label: 'TikTok', short: 'TT' },
  { id: 'instagram', label: 'Instagram', short: 'IG' },
  { id: 'x', label: 'X', short: 'X' },
]

export function getSocialConnects(userId) {
  if (!userId) return {}
  return (lsGet(SOCIAL, {}) || {})[userId] || {}
}

export function connectSocial(userId, provider, handle = '') {
  if (!userId || !SOCIAL_PROVIDERS.some((p) => p.id === provider)) {
    return { ok: false, error: 'Unknown provider.' }
  }
  const all = lsGet(SOCIAL, {}) || {}
  const row = all[userId] || {}
  row[provider] = {
    connected: true,
    handle: String(handle || '').slice(0, 64),
    // Placeholder until real OAuth ships
    mock: true,
    connectedAt: new Date().toISOString(),
  }
  all[userId] = row
  lsSet(SOCIAL, all)
  return { ok: true, connects: row }
}

export function disconnectSocial(userId, provider) {
  const all = lsGet(SOCIAL, {}) || {}
  const row = all[userId] || {}
  delete row[provider]
  all[userId] = row
  lsSet(SOCIAL, all)
  return { ok: true, connects: row }
}

export function getMultiStreamDest(userId) {
  const d = (lsGet(MULTI, {}) || {})[userId] || {}
  return {
    calabi: d.calabi !== false,
    youtube: !!d.youtube,
    tiktok: !!d.tiktok,
    unifyChat: d.unifyChat !== false,
  }
}

export function setMultiStreamDest(userId, patch) {
  if (!userId) return { ok: false }
  const all = lsGet(MULTI, {}) || {}
  all[userId] = { ...getMultiStreamDest(userId), ...patch }
  lsSet(MULTI, all)
  return { ok: true, dest: all[userId] }
}

/**
 * Queue a clip for social push. Actual API upload is planned —
 * this records intent and marks connected destinations.
 */
export function queueClipPost({ userId, contentId, title, providers, startSec = 0, endSec = 30 }) {
  if (!userId || !contentId) return { ok: false, error: 'Missing clip.' }
  const connects = getSocialConnects(userId)
  const want = (providers || []).filter((p) => connects[p]?.connected)
  if (!want.length) return { ok: false, error: 'Connect a social first.' }
  const job = {
    id: `clip_${Date.now().toString(36)}`,
    userId,
    contentId,
    title: String(title || 'Clip').slice(0, 100),
    providers: want,
    startSec,
    endSec,
    status: 'queued',
    note: 'Queued locally. OAuth publish to YouTube/TikTok ships with API keys.',
    at: new Date().toISOString(),
  }
  const all = lsGet(CLIP_JOBS, []) || []
  all.unshift(job)
  lsSet(CLIP_JOBS, all.slice(0, 100))
  return { ok: true, job }
}

export function listClipJobs(userId, limit = 20) {
  return (lsGet(CLIP_JOBS, []) || []).filter((j) => j.userId === userId).slice(0, limit)
}

/** AI highlight stub — marks a range for auto vertical clip. */
export function queueAiHighlight({ userId, streamId, label = 'Highlight' }) {
  return queueClipPost({
    userId,
    contentId: streamId || `live_${userId}`,
    title: `AI · ${label}`,
    providers: Object.keys(getSocialConnects(userId)).filter((p) => getSocialConnects(userId)[p]?.connected),
    startSec: 0,
    endSec: 45,
  })
}
