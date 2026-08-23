import { lsGet, lsSet } from './storage'

const KEY = 'clips_stream_settings'

export const QUALITY_PRESETS = [
  { id: '1080p60', label: '1080p60', height: 1080, fps: 60, videoBitrateKbps: 6000 },
  { id: '1080p30', label: '1080p30', height: 1080, fps: 30, videoBitrateKbps: 4500 },
  { id: '720p60', label: '720p60', height: 720, fps: 60, videoBitrateKbps: 4500 },
  { id: '720p30', label: '720p30 (default)', height: 720, fps: 30, videoBitrateKbps: 3000 },
  { id: '480p30', label: '480p30', height: 480, fps: 30, videoBitrateKbps: 1500 },
]

export const DEFAULT_STREAM_SETTINGS = {
  defaultQuality: '720p30',
  storePastBroadcasts: true,
  vodRetentionDays: 14,
  autoPublishVod: true,
  vodVisibility: 'public',
  chatReplayOnVod: true,
  subscriberOnlyChat: false,
  slowModeSeconds: 0,
  followersOnlyMinutes: 0,
  hideVodFromHome: false,
  streamTitleTemplate: '',
  category: 'Just Chatting',
  tags: [],
  brandingColor: '#ffffff',
}

export function getStreamSettings(userId) {
  if (!userId) return { ...DEFAULT_STREAM_SETTINGS }
  const all = lsGet(KEY, {})
  return { ...DEFAULT_STREAM_SETTINGS, ...(all[userId] || {}) }
}

export function setStreamSettings(userId, partial) {
  if (!userId) return null
  const all = lsGet(KEY, {})
  const next = { ...getStreamSettings(userId), ...partial, updatedAt: new Date().toISOString() }
  all[userId] = next
  lsSet(KEY, all)
  return next
}

export function estimateVodGb(hours, qualityId = '1080p30') {
  const preset = QUALITY_PRESETS.find((p) => p.id === qualityId) || QUALITY_PRESETS[1]
  const gbPerHour = (preset.videoBitrateKbps * 3600) / 8 / 1e6
  return Math.round(hours * gbPerHour * 100) / 100
}
