/**
 * Studio analytics helpers — channel + per-post stats from cloud-backed caches
 * (unique views, votes, creator_interactions, hour view pulses).
 */
import { getViews, getVotes, getSubscriberCount, getWatchHours } from './engagement'
import { listCreatorInteractions } from './creatorInteractions'
import { hourViewCount, hourViewsInCurrentLookback } from './hourViewEvents'
import { listComments } from './youtubeParity'

function rangeCutoff(range) {
  if (range === '24h') return Date.now() - 86400000
  if (range === '7d') return Date.now() - 7 * 86400000
  if (range === '30d') return Date.now() - 30 * 86400000
  return 0
}

function countTypes(events = []) {
  const byType = { view: 0, like: 0, subscribe: 0, share: 0, comment: 0, skip: 0 }
  for (const ev of events) {
    if (!ev?.type) continue
    byType[ev.type] = (byType[ev.type] || 0) + 1
  }
  return byType
}

/** Unique actors who did something (optionally on one post). */
function uniquePeople(events = []) {
  const ids = new Set()
  for (const ev of events) {
    if (ev?.actorId) ids.add(String(ev.actorId))
  }
  return ids.size
}

/**
 * Build N hourly buckets ending now (views from hour-view pulses + interaction events).
 */
export function activityBuckets({ creatorId, contentId = null, hours = 24, posts = [] } = {}) {
  const now = Date.now()
  const postIds = contentId
    ? [contentId]
    : (posts || []).map((p) => p.id).filter(Boolean)
  const events = listCreatorInteractions(creatorId, {
    contentId,
    range: hours <= 24 ? '24h' : hours <= 168 ? '7d' : '30d',
    limit: 2000,
  })
  const buckets = []
  for (let i = hours - 1; i >= 0; i -= 1) {
    const end = now - i * 3600000
    const start = end - 3600000
    let views = 0
    for (const id of postIds) views += hourViewCount(id, start, end)
    let actions = 0
    for (const ev of events) {
      const t = Date.parse(ev.at)
      if (Number.isFinite(t) && t >= start && t < end) actions += 1
    }
    buckets.push({
      start,
      end,
      views,
      actions,
      total: views + actions,
      label: new Date(start).toLocaleTimeString([], { hour: 'numeric' }),
    })
  }
  return buckets
}

export function channelAnalyticsSnapshot(creatorId, posts = [], { range = '7d' } = {}) {
  const list = Array.isArray(posts) ? posts : []
  let views = 0
  let likes = 0
  let comments = 0
  let lastHourViews = 0
  for (const p of list) {
    if (!p?.id) continue
    views += getViews(p.id)
    likes += getVotes(p.id)?.up || 0
    comments += (listComments(p.id) || []).filter((c) => !c.deleted).length
    lastHourViews += hourViewsInCurrentLookback(p.id)
  }
  const events = listCreatorInteractions(creatorId, { range, limit: 2000 })
  const byType = countTypes(events)
  return {
    posts: list.length,
    views,
    likes,
    comments,
    followers: getSubscriberCount(creatorId),
    watchHours: getWatchHours(creatorId),
    lastHourViews,
    people: uniquePeople(events),
    byType,
    shares: byType.share || 0,
    skips: byType.skip || 0,
    events: events.length,
  }
}

export function postAnalyticsSnapshot(creatorId, post, { range = '7d', untilMs = null, sinceMs = null } = {}) {
  if (!post?.id) return null
  const views = getViews(post.id)
  const votes = getVotes(post.id) || { up: 0, down: 0 }
  const commentRows = (listComments(post.id) || []).filter((c) => !c.deleted)
  const events = listCreatorInteractions(creatorId, {
    contentId: post.id,
    range,
    limit: 800,
    untilMs,
    sinceMs,
    includeSubscribe: false,
  })
  const byType = countTypes(events)
  const people = uniquePeople(events)
  const lastHourViews = hourViewsInCurrentLookback(post.id)
  const engagementActions = (votes.up || 0) + commentRows.length + (byType.share || 0)
  const engagementRate = views > 0 ? Math.round((engagementActions / views) * 1000) / 10 : 0
  // When scrubbing, prefer interaction-derived counts so the slider matches the map
  const scrubbing = untilMs != null
  return {
    id: post.id,
    title: post.title || 'Untitled',
    type: post.type || 'short',
    createdAt: post.createdAt || post.publishedAt || post.importedAt || '',
    views: scrubbing ? (byType.view || 0) : views,
    likes: scrubbing ? (byType.like || 0) : (votes.up || 0),
    dislikes: votes.down || 0,
    comments: scrubbing ? (byType.comment || 0) : commentRows.length,
    shares: byType.share || 0,
    skips: byType.skip || 0,
    follows: byType.subscribe || 0,
    people,
    lastHourViews,
    engagementRate,
    byType,
    recent: events.slice(0, 12),
  }
}

/** Ranked post rows for the channel table. */
export function listPostAnalyticsRows(creatorId, posts = [], { range = 'all' } = {}) {
  const cut = rangeCutoff(range)
  return (posts || [])
    .filter((p) => {
      if (!cut) return true
      const t = Date.parse(p.createdAt || p.publishedAt || p.importedAt || '')
      return Number.isFinite(t) && t >= cut
    })
    .map((p) => {
      const snap = postAnalyticsSnapshot(creatorId, p, { range: 'all' })
      return {
        id: p.id,
        title: snap.title,
        type: snap.type,
        createdAt: snap.createdAt,
        views: snap.views,
        likes: snap.likes,
        comments: snap.comments,
        lastHourViews: snap.lastHourViews,
        engagementRate: snap.engagementRate,
        people: snap.people,
      }
    })
    .sort((a, b) => b.views - a.views || b.likes - a.likes)
}
