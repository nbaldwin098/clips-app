/**
 * Social account connects + queue posts to YouTube / TikTok / Instagram / X / Facebook.
 * Real OAuth publish only when provider client IDs are configured.
 * Without keys: allow handle + show-on-profile; do not fake a live publish queue.
 */
import { lsGet, lsSet } from './storage'
import { runtimeEnv } from './runtimeEnv'

const SOCIAL = 'social_connects'
const MULTI = 'multi_stream_dest'
const CLIP_JOBS = 'auto_clip_jobs'

export const SOCIAL_PROVIDERS = [
  { id: 'youtube', label: 'YouTube', short: 'YT', accepts: ['video', 'short', 'vod'], envKey: 'VITE_OAUTH_YOUTUBE_CLIENT_ID' },
  { id: 'tiktok', label: 'TikTok', short: 'TT', accepts: ['short', 'video', 'vod'], envKey: 'VITE_OAUTH_TIKTOK_CLIENT_ID' },
  { id: 'instagram', label: 'Instagram', short: 'IG', accepts: ['pic', 'short', 'video'], envKey: 'VITE_OAUTH_INSTAGRAM_CLIENT_ID' },
  { id: 'x', label: 'X', short: 'X', accepts: ['pic', 'short', 'video'], envKey: 'VITE_OAUTH_X_CLIENT_ID' },
  { id: 'facebook', label: 'Facebook', short: 'FB', accepts: ['video', 'pic', 'short', 'vod'], envKey: 'VITE_OAUTH_FACEBOOK_CLIENT_ID' },
]

export function socialOAuthConfigured(providerId) {
  const meta = SOCIAL_PROVIDERS.find((p) => p.id === providerId)
  if (!meta?.envKey) return false
  return !!String(runtimeEnv(meta.envKey) || '').trim()
}

export function anySocialOAuthConfigured() {
  return SOCIAL_PROVIDERS.some((p) => socialOAuthConfigured(p.id))
}

export function getSocialConnects(userId) {
  if (!userId) return {}
  return (lsGet(SOCIAL, {}) || {})[userId] || {}
}

export function listConnectedProviders(userId) {
  const connects = getSocialConnects(userId)
  return SOCIAL_PROVIDERS.filter((p) => connects[p.id]?.connected)
}

export function connectSocial(userId, provider, handle = '', opts = {}) {
  if (!userId || !SOCIAL_PROVIDERS.some((p) => p.id === provider)) {
    return { ok: false, error: 'Unknown provider.' }
  }
  const all = lsGet(SOCIAL, {}) || {}
  const row = all[userId] || {}
  const prev = row[provider] || {}
  row[provider] = {
    connected: true,
    handle: String(handle || '').replace(/^@/, '').slice(0, 64),
    mock: !socialOAuthConfigured(provider),
    oauthReady: socialOAuthConfigured(provider),
    showOnProfile: opts.showOnProfile != null ? !!opts.showOnProfile : (prev.showOnProfile !== false),
    connectedAt: prev.connectedAt || new Date().toISOString(),
  }
  all[userId] = row
  lsSet(SOCIAL, all)
  return { ok: true, connects: row }
}

export function setSocialShowOnProfile(userId, provider, show) {
  if (!userId || !provider) return { ok: false }
  const all = lsGet(SOCIAL, {}) || {}
  const row = all[userId] || {}
  if (!row[provider]?.connected) return { ok: false, error: 'Connect first.' }
  row[provider] = { ...row[provider], showOnProfile: !!show }
  all[userId] = row
  lsSet(SOCIAL, all)
  return { ok: true, connects: row }
}

export function listProfileSocials(userId) {
  const connects = getSocialConnects(userId)
  return SOCIAL_PROVIDERS.filter((p) => connects[p.id]?.connected && connects[p.id]?.showOnProfile !== false)
    .map((p) => ({
      id: p.id,
      label: p.label,
      handle: connects[p.id]?.handle || '',
    }))
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

  const oauthReady = want.filter((id) => socialOAuthConfigured(id) && connects[id]?.oauthReady)
  if (!oauthReady.length) {
    return {
      ok: false,
      error: 'Social publish APIs are not connected yet. You can still save handles and show icons on your profile.',
    }
  }

  const kind = String(contentType || 'short')
  const compatible = oauthReady.filter((id) => {
    const meta = SOCIAL_PROVIDERS.find((p) => p.id === id)
    return !meta?.accepts || meta.accepts.includes(kind)
  })
  if (!compatible.length) {
    return { ok: false, error: `None of your OAuth-ready accounts accept ${kind}s.` }
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
    note: 'Queued for live OAuth publish (provider client IDs are configured).',
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

/** AI highlight is not shipped — keep export for callers, always refuse. */
export function queueAiHighlight() {
  return { ok: false, error: 'AI highlight clips are not available yet.' }
}
