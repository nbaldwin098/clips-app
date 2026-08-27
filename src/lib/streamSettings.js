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
  latency: 'low',
  storePastBroadcasts: true,
  vodRetentionDays: 14,
  autoPublishVod: true,
  vodVisibility: 'public',
  chatReplayOnVod: true,
  subscriberOnlyChat: false,
  chatEveryone: true,
  chatFollowers: false,
  chatPremium: false,
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
  const raw = all[userId] || {}
  const merged = { ...DEFAULT_STREAM_SETTINGS, ...raw }
  // Prefer new audience fields; migrate from subscriberOnlyChat when unset
  if (
    raw.chatEveryone === undefined
    && raw.chatFollowers === undefined
    && raw.chatPremium === undefined
    && raw.subscriberOnlyChat
  ) {
    merged.chatEveryone = false
    merged.chatFollowers = true
    merged.chatPremium = true
  }
  return merged
}

export function setStreamSettings(userId, partial) {
  if (!userId) return null
  const all = lsGet(KEY, {})
  const next = { ...getStreamSettings(userId), ...partial, updatedAt: new Date().toISOString() }
  all[userId] = next
  lsSet(KEY, all)
  pushStreamSettingsCloud(userId, next)
  return next
}

export function estimateVodGb(hours, qualityId = '1080p30') {
  const preset = QUALITY_PRESETS.find((p) => p.id === qualityId) || QUALITY_PRESETS[1]
  const gbPerHour = (preset.videoBitrateKbps * 3600) / 8 / 1e6
  return Math.round(hours * gbPerHour * 100) / 100
}


/** Push stream + VOD channel prefs to Supabase (migration 0016). */
export function pushStreamSettingsCloud(userId, settings, vodChannel = null) {
  if (!userId) return
  queueMicrotask(() => {
    import('./supabaseClient').then(async ({ getSupabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured()) return
      const { getGraphActor } = await import('./graphSync')
      const actor = getGraphActor()
      if (!actor?.id || actor.id !== userId) return
      const sb = await getSupabase()
      if (!sb) return
      const s = settings || getStreamSettings(userId)
      await sb.from('stream_settings').upsert({
        user_id: userId,
        latency: s.latency || 'low',
        default_quality: s.defaultQuality || '720p30',
        stream_title_template: s.streamTitleTemplate || '',
        store_past_broadcasts: s.storePastBroadcasts !== false,
        auto_publish_vod: !!(vodChannel?.autoPublish ?? s.autoPublishVod),
        vod_visibility: vodChannel?.visibility || s.vodVisibility || 'private',
        vod_channel_enabled: !!vodChannel?.enabled,
        vod_channel_handle: vodChannel?.handle || '',
        updated_at: new Date().toISOString(),
      })
    }).catch(() => {})
  })
}

export async function pullStreamSettingsCloud(userId) {
  if (!userId) return null
  try {
    const { getSupabase, isSupabaseConfigured } = await import('./supabaseClient')
    if (!isSupabaseConfigured()) return null
    const { getGraphActor } = await import('./graphSync')
    const actor = getGraphActor()
    if (!actor?.id || actor.id !== userId) return null
    const sb = await getSupabase()
    if (!sb) return null
    const { data, error } = await sb.from('stream_settings').select('*').eq('user_id', userId).maybeSingle()
    if (error || !data) return null
    return setStreamSettings(userId, {
      latency: data.latency,
      defaultQuality: data.default_quality,
      streamTitleTemplate: data.stream_title_template,
      storePastBroadcasts: data.store_past_broadcasts,
      autoPublishVod: data.auto_publish_vod,
      vodVisibility: data.vod_visibility,
    })
  } catch {
    return null
  }
}
