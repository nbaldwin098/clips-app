/**
 * Cloud social graph. Supabase is source of truth for follows, votes,
 * comments, playlists, notifications, and creator interactions.
 * Local storage is a display cache filled by pull — never invent cloud rows.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { notifyContentChanged } from './contentSync'

const LIKES = 'engagement_likes'
const USER_VOTES = 'engagement_votes'
const SUBS = 'engagement_subs'
const NOTIF_KEY = 'clips_notifications'
const COMMENTS = 'yt_comments'
const PLAYLISTS = 'yt_playlists'

let actor = null

export function setGraphActor(user) {
  actor = user?.provider === 'supabase' && isUuid(user.id) ? user : null
}

export function getGraphActor() {
  return actor
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))
}

function canSync() {
  return !!(isSupabaseConfigured() && actor?.id)
}

function emit() {
  notifyContentChanged()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clips-notifications'))
  }
}

async function client() {
  if (!canSync()) return null
  try {
    return await getSupabase()
  } catch {
    return null
  }
}

export function pushFollow(followerId, creatorId, following) {
  if (!canSync() || followerId !== actor.id) return
  ;(async () => {
    const sb = await client()
    if (!sb) return
    try {
      if (following) {
        await sb.from('follows').upsert({ follower_id: followerId, creator_id: creatorId })
      } else {
        await sb.from('follows').delete().eq('follower_id', followerId).eq('creator_id', creatorId)
      }
    } catch {}
  })()
}

export function pushVote(userId, contentId, direction) {
  if (!canSync() || userId !== actor.id) return
  ;(async () => {
    const sb = await client()
    if (!sb) return
    try {
      if (!direction) {
        await sb.from('votes').delete().eq('user_id', userId).eq('content_id', contentId)
      } else {
        await sb.from('votes').upsert({ user_id: userId, content_id: contentId, direction })
      }
    } catch {}
  })()
}

/** Push one creator-facing interaction (bubble map). Actor must be signed in. */
export function pushCreatorInteraction(row) {
  if (!canSync() || !row?.id || !row.creatorId || !row.type) return
  if (row.actorId && row.actorId !== actor.id) return
  ;(async () => {
    const sb = await client()
    if (!sb) return
    try {
      await sb.from('creator_interactions').upsert({
        id: row.id,
        creator_id: row.creatorId,
        content_id: row.contentId || null,
        type: row.type,
        actor_id: row.actorId || actor.id,
        title: row.title || '',
        weight: Math.max(1, Number(row.weight) || 1),
        surface: row.surface || 'unknown',
        content_type: row.contentType || null,
        source: row.source || 'live',
        at: row.at || new Date().toISOString(),
      })
    } catch {}
  })()
}

/** Pull interactions aimed at the signed-in creator into local storage. */
export async function syncCreatorInteractionsFromCloud() {
  if (!canSync()) return false
  const sb = await client()
  if (!sb) return false
  try {
    const { mergeCreatorInteractionsFromCloud } = await import('./creatorInteractions')

    // Interactions table may be missing/empty — still pull content_views so every viewer shows.
    try {
      const { data, error } = await sb
        .from('creator_interactions')
        .select('*')
        .eq('creator_id', actor.id)
        .order('at', { ascending: false })
        .limit(1500)
      if (!error && Array.isArray(data) && data.length) {
        mergeCreatorInteractionsFromCloud(data)
      }
    } catch {}

    // Every signed-in viewer of the creator's posts must appear on the bubble map (incl. the creator).
    try {
      const { pullContentViewsForCreator } = await import('./economySync')
      const views = await pullContentViewsForCreator(actor.id)
      if (views?.length) {
        const asInteractions = views
          .filter((v) => v.actor_id)
          .map((v) => ({
            id: `civ_${v.content_id}_${v.actor_id}_view`.slice(0, 180),
            creator_id: v.creator_id,
            content_id: v.content_id,
            type: 'view',
            actor_id: v.actor_id,
            title: '',
            weight: 1,
            surface: v.surface || 'unknown',
            content_type: v.content_type || null,
            source: 'live',
            at: v.created_at,
          }))
        mergeCreatorInteractionsFromCloud(asInteractions)
      }
    } catch {}

    return true
  } catch {
    return false
  }
}

export function pushComment(contentId, row) {
  if (!canSync() || !row?.id || row.userId !== actor.id) return
  ;(async () => {
    const sb = await client()
    if (!sb) return
    try {
      await sb.from('comments').upsert({
        id: row.id,
        content_id: contentId,
        user_id: row.userId,
        handle: row.handle || null,
        body: row.text || '',
        parent_id: row.parentId || null,
        likes: row.likes || 0,
        liked_by: row.likedBy || [],
        pinned: !!row.pinned,
        hearted: !!row.hearted,
        held: !!row.held,
        deleted: !!row.deleted,
        created_at: row.createdAt || new Date().toISOString(),
      })
    } catch {}
  })()
}

export function pushPlaylist(row) {
  if (!canSync() || !row?.id || row.userId !== actor.id) return
  ;(async () => {
    const sb = await client()
    if (!sb) return
    try {
      await sb.from('playlists').upsert({
        id: row.id,
        user_id: row.userId,
        title: row.title || 'Playlist',
        visibility: row.visibility || 'public',
        items: row.items || [],
        created_at: row.createdAt || new Date().toISOString(),
      })
    } catch {}
  })()
}

export function pushNotification(row) {
  if (!canSync() || !row?.id) return
  ;(async () => {
    const sb = await client()
    if (!sb) return
    try {
      await sb.from('notifications').upsert({
        id: row.id,
        user_id: row.userId,
        type: row.type,
        title: row.title,
        body: row.body || '',
        actor_id: row.actorId || null,
        content_id: row.contentId || null,
        view: row.view || 'notifications',
        meta: row.meta || {},
        read: !!row.read,
        at: row.at || new Date().toISOString(),
      })
    } catch {}
  })()
}

function applyFollows(rows) {
  const map = {}
  for (const r of rows || []) {
    if (!r.creator_id || !r.follower_id) continue
    map[r.creator_id] = map[r.creator_id] || []
    if (!map[r.creator_id].includes(r.follower_id)) map[r.creator_id].push(r.follower_id)
  }
  const local = lsGet(SUBS, {}) || {}
  for (const [creatorId, list] of Object.entries(local)) {
    for (const fid of list || []) {
      if (isUuid(fid)) continue
      map[creatorId] = map[creatorId] || []
      if (!map[creatorId].includes(fid)) map[creatorId].push(fid)
    }
  }
  lsSet(SUBS, map)
}

function applyVotes(rows) {
  const byUser = lsGet(USER_VOTES, {}) || {}
  for (const r of rows || []) {
    if (!r.user_id || !r.content_id) continue
    byUser[r.user_id] = byUser[r.user_id] || {}
    byUser[r.user_id][r.content_id] = r.direction
  }
  const tally = {}
  for (const userVotes of Object.values(byUser)) {
    for (const [contentId, dir] of Object.entries(userVotes || {})) {
      tally[contentId] = tally[contentId] || { up: 0, down: 0 }
      if (dir === 'up') tally[contentId].up += 1
      if (dir === 'down') tally[contentId].down += 1
    }
  }
  lsSet(USER_VOTES, byUser)
  lsSet(LIKES, tally)
}

function applyComments(rows) {
  const all = lsGet(COMMENTS, {}) || {}
  for (const r of rows || []) {
    if (!r.id || !r.content_id) continue
    const list = all[r.content_id] || []
    const next = {
      id: r.id,
      userId: r.user_id,
      handle: r.handle,
      text: r.body || '',
      parentId: r.parent_id || null,
      likes: r.likes || 0,
      likedBy: Array.isArray(r.liked_by) ? r.liked_by : [],
      pinned: !!r.pinned,
      hearted: !!r.hearted,
      held: !!r.held,
      deleted: !!r.deleted,
      createdAt: r.created_at,
    }
    const i = list.findIndex((c) => c.id === r.id)
    if (i >= 0) list[i] = { ...list[i], ...next }
    else list.push(next)
    all[r.content_id] = list
  }
  lsSet(COMMENTS, all)
}

function applyPlaylists(rows) {
  const list = lsGet(PLAYLISTS, []) || []
  for (const r of rows || []) {
    if (!r.id) continue
    const next = {
      id: r.id,
      userId: r.user_id,
      title: r.title || 'Playlist',
      visibility: r.visibility || 'public',
      items: Array.isArray(r.items) ? r.items : [],
      createdAt: r.created_at,
    }
    const i = list.findIndex((p) => p.id === r.id)
    if (i >= 0) list[i] = { ...list[i], ...next }
    else list.unshift(next)
  }
  lsSet(PLAYLISTS, list)
}

function applyNotifications(rows) {
  if (!actor?.id) return
  const all = lsGet(NOTIF_KEY, {}) || {}
  const mine = Array.isArray(all[actor.id]) ? all[actor.id] : []
  for (const r of rows || []) {
    const next = {
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      body: r.body || '',
      actorId: r.actor_id,
      contentId: r.content_id,
      view: r.view || 'notifications',
      meta: r.meta || {},
      read: !!r.read,
      at: r.at,
    }
    const i = mine.findIndex((n) => n.id === r.id)
    if (i >= 0) mine[i] = { ...mine[i], ...next, read: mine[i].read || next.read }
    else mine.push(next)
  }
  mine.sort((a, b) => new Date(b.at) - new Date(a.at))
  all[actor.id] = mine.slice(0, 100)
  lsSet(NOTIF_KEY, all)
}

async function pushMine() {
  if (!canSync()) return
  const sb = await client()
  if (!sb) return
  const uid = actor.id
  const subs = lsGet(SUBS, {}) || {}
  for (const [creatorId, list] of Object.entries(subs)) {
    if (Array.isArray(list) && list.includes(uid)) {
      try { await sb.from('follows').upsert({ follower_id: uid, creator_id: creatorId }) } catch {}
    }
  }
  const mineVotes = (lsGet(USER_VOTES, {}) || {})[uid] || {}
  for (const [contentId, direction] of Object.entries(mineVotes)) {
    if (direction === 'up' || direction === 'down') {
      try { await sb.from('votes').upsert({ user_id: uid, content_id: contentId, direction }) } catch {}
    }
  }
  const comments = lsGet(COMMENTS, {}) || {}
  for (const [contentId, list] of Object.entries(comments)) {
    for (const row of list || []) {
      if (row?.userId === uid) pushComment(contentId, row)
    }
  }
  for (const row of lsGet(PLAYLISTS, []) || []) {
    if (row?.userId === uid) pushPlaylist(row)
  }
  for (const row of (lsGet(NOTIF_KEY, {}) || {})[uid] || []) {
    pushNotification(row)
  }
}

export async function syncPublicEngagementFromCloud() {
  if (!isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const [tallies, lobby] = await Promise.all([
      sb.from('vote_tallies').select('content_id, up, down').limit(4000),
      sb.from('live_lobby').select('*').eq('is_live', true).limit(200),
    ])
    if (!tallies.error && Array.isArray(tallies.data)) {
      const likes = lsGet(LIKES, {}) || {}
      for (const r of tallies.data) {
        if (!r?.content_id) continue
        likes[r.content_id] = { up: Number(r.up) || 0, down: Number(r.down) || 0 }
      }
      lsSet(LIKES, likes)
    }
    if (!lobby.error && Array.isArray(lobby.data)) {
      const board = lobby.data.map((r) => ({
        userId: r.user_id,
        isLive: r.is_live !== false,
        title: r.title || 'Live on Clips',
        handle: r.handle,
        displayName: r.display_name,
        category: r.category,
        startedAt: r.started_at,
        watcherIds: Array.isArray(r.watcher_ids) ? r.watcher_ids : [],
        watchers: Array.isArray(r.watcher_ids) ? r.watcher_ids.length : 0,
      }))
      lsSet('live_board', board)
    }
    emit()
    return true
  } catch {
    return false
  }
}

export async function pushLiveLobby(payload) {
  if (!payload?.userId || !isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error } = await sb.from('live_lobby').upsert({
      user_id: payload.userId,
      is_live: true,
      title: payload.title || 'Live on Clips',
      handle: payload.handle || null,
      display_name: payload.displayName || null,
      category: payload.category || null,
      started_at: payload.startedAt || new Date().toISOString(),
      watcher_ids: payload.watcherIds || [],
    })
    return !error
  } catch {
    return false
  }
}

export async function endLiveLobby(userId) {
  if (!userId || !isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error } = await sb.from('live_lobby').delete().eq('user_id', userId)
    return !error
  } catch {
    return false
  }
}

export async function syncGraphFromCloud() {
  if (!canSync()) return false
  const sb = await client()
  if (!sb) return false
  try {
    const [follows, votes, comments, playlists, notifs] = await Promise.all([
      sb.from('follows').select('*').limit(2000),
      sb.from('votes').select('*').limit(4000),
      sb.from('comments').select('*').limit(4000),
      sb.from('playlists').select('*').limit(400),
      sb.from('notifications').select('*').eq('user_id', actor.id).order('at', { ascending: false }).limit(100),
    ])
    if (!follows.error && follows.data) applyFollows(follows.data)
    if (!votes.error && votes.data) applyVotes(votes.data)
    if (!comments.error && comments.data) applyComments(comments.data)
    if (!playlists.error && playlists.data) applyPlaylists(playlists.data)
    if (!notifs.error && notifs.data) applyNotifications(notifs.data)
    try { await syncCreatorInteractionsFromCloud() } catch {}
    try {
      const { pullPremiumSubs, pullWallet, pullEarnings } = await import('./economySync')
      await pullPremiumSubs()
      if (actor?.id) {
        await pullWallet(actor.id)
        await pullEarnings(actor.id)
      }
    } catch {}
    emit()
    pushMine()
    return true
  } catch {
    return false
  }
}
