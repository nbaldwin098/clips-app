/**
 * Copies of ended live lobbies. Optional second channel for public VODs.
 */
import { lsGet, lsSet, saveImport, getImports } from './storage'
import { indexUser } from './moderation'

const VODS_KEY = 'clips_live_vods'
const CHANNEL_KEY = 'clips_vod_channels'

export function getVodChannel(userId) {
  if (!userId) return null
  const all = lsGet(CHANNEL_KEY, {}) || {}
  return all[userId] || {
    enabled: false,
    handle: '',
    autoPublish: false,
    visibility: 'private',
  }
}

export function setVodChannel(userId, partial, owner = {}) {
  if (!userId) return getVodChannel(userId)
  const all = lsGet(CHANNEL_KEY, {}) || {}
  const prev = getVodChannel(userId)
  const handle = String(partial.handle ?? prev.handle ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24)
  const next = {
    ...prev,
    ...partial,
    handle,
    enabled: partial.enabled != null ? !!partial.enabled : prev.enabled,
    autoPublish: partial.autoPublish != null ? !!partial.autoPublish : prev.autoPublish,
    visibility: partial.visibility || prev.visibility || 'private',
    updatedAt: new Date().toISOString(),
  }
  all[userId] = next
  lsSet(CHANNEL_KEY, all)
  if (next.enabled && handle) {
    try {
      indexUser({
        id: vodChannelId(userId),
        handle,
        displayName: `${owner.displayName || owner.handle || 'Creator'} VODs`,
        email: '',
        bio: 'Past broadcasts from the main channel.',
        creatorStatus: 'approved',
        isCreator: true,
        parentUserId: userId,
      })
    } catch {}
  }
  return next
}

export function vodChannelId(userId) {
  return `vodch_${userId}`
}

export function listVods(userId) {
  if (!userId) return []
  return (lsGet(VODS_KEY, []) || []).filter((v) => v.userId === userId)
}

export function setVodVisibility(vodId, visibility) {
  const all = lsGet(VODS_KEY, []) || []
  const next = all.map((v) => (v.id === vodId ? { ...v, visibility } : v))
  lsSet(VODS_KEY, next)
  const row = next.find((v) => v.id === vodId)
  if (row?.contentId) {
    const imports = getImports()
    const rec = imports.find((i) => i.id === row.contentId)
    if (rec) {
      saveImport({
        ...rec,
        status: visibility === 'public' ? 'published' : 'draft',
      })
    }
  }
  if (row?.userId) {
    queueMicrotask(() => {
      import('./supabaseClient').then(async ({ getSupabase, isSupabaseConfigured }) => {
        if (!isSupabaseConfigured()) return
        const { getGraphActor } = await import('./graphSync')
        const actor = getGraphActor()
        if (!actor?.id || actor.id !== row.userId) return
        const sb = await getSupabase()
        if (!sb) return
        await sb.from('vods').update({ visibility }).eq('id', vodId).eq('user_id', row.userId)
      }).catch(() => {})
    })
  }
  return row
}

export function archiveEndedLive(user, liveState) {
  if (!user?.id || !liveState) return null
  const id = `vod_${user.id}_${Date.now()}`
  const started = liveState.startedAt ? new Date(liveState.startedAt).getTime() : Date.now()
  const durationSec = Math.max(0, Math.round((Date.now() - started) / 1000))
  const channel = getVodChannel(user.id)
  const visibility = channel.autoPublish && channel.enabled ? (channel.visibility || 'public') : 'private'
  const vod = {
    id,
    userId: user.id,
    handle: user.handle,
    title: liveState.title || 'Past broadcast',
    category: liveState.category || '',
    startedAt: liveState.startedAt || new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationSec,
    visibility,
    contentId: null,
    watchers: liveState.watchers || 0,
  }
  if (visibility === 'public' && channel.enabled && channel.handle) {
    const rec = {
      id: `livevod_${id}`,
      type: 'video',
      title: vod.title,
      description: `Past lobby from @${user.handle}. Live video ingest is not connected, so this is a record of the session — not a video file.`,
      origin: 'live-vod',
      creatorId: vodChannelId(user.id),
      userId: vodChannelId(user.id),
      handle: channel.handle,
      status: 'published',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      durationSec,
      mediaUrl: '',
      hosted: false,
      views: 0,
      tags: ['vod', 'live'],
    }
    saveImport(rec)
    vod.contentId = rec.id
  }
  const all = lsGet(VODS_KEY, []) || []
  all.unshift(vod)
  lsSet(VODS_KEY, all.slice(0, 400))
  queueMicrotask(() => {
    import('./supabaseClient').then(async ({ getSupabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured()) return
      const { getGraphActor } = await import('./graphSync')
      const actor = getGraphActor()
      if (!actor?.id || actor.id !== user.id) return
      const sb = await getSupabase()
      if (!sb) return
      await sb.from('vods').upsert({
        id: vod.id,
        user_id: user.id,
        title: vod.title,
        started_at: vod.startedAt,
        ended_at: vod.endedAt,
        duration_sec: vod.durationSec,
        visibility: vod.visibility,
        category: vod.category || null,
        meta: { watchers: vod.watchers || 0, contentId: vod.contentId || null },
        created_at: vod.endedAt,
      })
    }).catch(() => {})
  })
  return vod
}
