/**
 * Social account connects + queue posts to YouTube / TikTok / Instagram / X / Facebook.
 * OAuth tokens are mocked until provider API keys ship — destinations + job queue are local SOT for UI.
 */
import { lsGet, lsSet } from './storage'

const SOCIAL = 'social_connects'
const MULTI = 'multi_stream_dest'
const CLIP_JOBS = 'auto_clip_jobs'

export const SOCIAL_PROVIDERS = [
  { id: 'youtube', label: 'YouTube', short: 'YT', accepts: ['video', 'short', 'vod'] },
  { id: 'tiktok', label: 'TikTok', short: 'TT', accepts: ['short', 'video', 'vod'] },
  { id: 'instagram', label: 'Instagram', short: 'IG', accepts: ['pic', 'short', 'video'] },
  { id: 'x', label: 'X', short: 'X', accepts: ['pic', 'short', 'video'] },
  { id: 'facebook', label: 'Facebook', short: 'FB', accepts: ['video', 'pic', 'short', 'vod'] },
]

export function getSocialConnects(userId) {
  if (!userId) return {}
  return (lsGet(SOCIAL, {}) || {})[userId] || {}
}

export function listConnectedProviders(userId) {
  const connects = getSocialConnects(userId)
  return SOCIAL_PROVIDERS.filter((p) => connects[p.id]?.connected)
}

export function connectSocial(userId, provider, handle = '') {
  if (!userId || !SOCIAL_PROVIDERS.some((p) => p.id === provider)) {
    return { ok: false, error: 'Unknown provider.' }
  }
  const all = lsGet(SOCIAL, {}) || {}
  const row = all[userId] || {}
  row[provider] = {
    connected: true,
    handle: String(handle || '').replace(/^@/, '').slice(0, 64),
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

function saveJob(job) {
  const all = lsGet(CLIP_JOBS, []) || []
  all.unshift(job)
  lsSet(CLIP_JOBS, all.slice(0, 100))
  return job
}

/**
 * Queue a clip for social push (legacy Calabi Studio / live highlights).
 */
export function queueClipPost({ userId, contentId, title, providers, startSec = 0, endSec = 30 }) {
  return queueSocialPost({
    userId,
    contentId,
    title,
    providers,
    contentType: 'short',
    startSec,
    endSec,
  })
}

/**
 * Queue a video / clip / pic / VOD to connected social accounts.
 */
export function queueSocialPost({
  userId,
  contentId,
  title,
  caption = '',
  providers,
  contentType = 'short',
  startSec = 0,
  endSec = null,
} = {}) {
  if (!userId || !contentId) return { ok: false, error: 'Pick something to post.' }
  const connects = getSocialConnects(userId)
  const want = (providers || []).filter((p) => connects[p]?.connected)
  if (!want.length) return { ok: false, error: 'Connect at least one social account first.' }

  const kind = String(contentType || 'short')
  const compatible = want.filter((id) => {
    const meta = SOCIAL_PROVIDERS.find((p) => p.id === id)
    return !meta?.accepts || meta.accepts.includes(kind)
  })
  if (!compatible.length) {
    return { ok: false, error: `None of your connected accounts accept ${kind}s.` }
  }

  const job = {
    id: `soc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    contentId,
    contentType: kind,
    title: String(title || 'Post').slice(0, 120),
    caption: String(caption || '').slice(0, 2200),
    providers: compatible,
    startSec: Math.max(0, Number(startSec) || 0),
    endSec: endSec == null ? null : Math.max(0, Number(endSec) || 0),
    status: 'queued',
    note: 'Queued on this device. Live OAuth publish ships when YouTube / TikTok / IG / X / Facebook API keys are connected.',
    at: new Date().toISOString(),
  }
  saveJob(job)
  return { ok: true, job, skipped: want.filter((p) => !compatible.includes(p)) }
}

export function listClipJobs(userId, limit = 20) {
  return (lsGet(CLIP_JOBS, []) || []).filter((j) => j.userId === userId).slice(0, limit)
}

export function listSocialJobs(userId, limit = 30) {
  return listClipJobs(userId, limit)
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
