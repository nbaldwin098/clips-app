/**
 * Creator-facing interaction timeline for the studio bubble map.
 * Records when viewers click (open), like, follow, share, comment, or skip a post.
 * Local storage is the UI source; cloud rows sync so creators see other devices.
 */
import { lsGet, lsSet } from './storage'
import { getViews, getVotes, getSubscriberCount } from './engagement'
import { listComments } from './youtubeParity'
import { getImports } from './storage'

const KEY = 'clips_creator_interactions'
const MAX = 2500
const INTERACTION_EVENT = 'clips-creator-interactions'

/** Lightweight tick for studio map — does not refresh the whole catalog. */
export function notifyInteractionsChanged() {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(INTERACTION_EVENT))
  } catch {}
}

export function subscribeInteractionsChanged(fn) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => { try { fn?.() } catch {} }
  window.addEventListener(INTERACTION_EVENT, handler)
  return () => window.removeEventListener(INTERACTION_EVENT, handler)
}

export const INTERACTION_TYPES = [
  { id: 'view', label: 'Opened / viewed', color: '#60a5fa', short: 'View' },
  { id: 'like', label: 'Liked', color: '#f472b6', short: 'Like' },
  { id: 'subscribe', label: 'Followed', color: '#34d399', short: 'Fol' },
  { id: 'share', label: 'Shared', color: '#a78bfa', short: 'Share' },
  { id: 'comment', label: 'Commented', color: '#fbbf24', short: 'Comment' },
  { id: 'skip', label: 'Skipped', color: '#fb7185', short: 'Skip' },
]

export const SURFACE_LABELS = {
  watch: 'Watch page',
  clips: 'Clips feed',
  pics: 'Pics feed',
  home: 'Home / card',
  channel: 'Channel',
  unknown: 'App',
}

export const CONTENT_TYPE_LABELS = {
  video: 'Video',
  short: 'Clip',
  pic: 'Pic',
  channel: 'Channel',
}

const TYPE_ALIASES = {
  impression: 'view',
  view: 'view',
  upvote: 'like',
  like: 'like',
  subscribe: 'subscribe',
  share: 'share',
  comment: 'comment',
  early_skip: 'skip',
  skip: 'skip',
  kick: 'skip',
  complete: 'view',
  loop: 'view',
  save: 'like',
}

function all() {
  return lsGet(KEY, []) || []
}

function save(list) {
  lsSet(KEY, list.slice(0, MAX))
}

export function normalizeInteractionType(type) {
  return TYPE_ALIASES[String(type || '').toLowerCase()] || null
}

export function typeMeta(type) {
  const id = normalizeInteractionType(type) || type
  return INTERACTION_TYPES.find((t) => t.id === id) || {
    id: String(type || 'other'),
    label: String(type || 'Other'),
    color: '#a1a1aa',
    short: String(type || '?'),
  }
}

export function contentTypeForItem(item) {
  if (!item) return null
  if (item.type === 'pic') return 'pic'
  if (item.type === 'video') return 'video'
  if (item.type === 'short' || item.type === 'clip') return 'short'
  return null
}

/** Resolve creator + post meta from the local catalog. */
export function resolveContentMeta(contentId) {
  if (!contentId) return null
  const row = (getImports() || []).find((r) => r && r.id === contentId)
  if (!row) return null
  return {
    creatorId: row.creatorId || row.userId || null,
    title: row.title || '',
    contentType: contentTypeForItem(row),
  }
}

export function creatorIdForContent(contentId) {
  return resolveContentMeta(contentId)?.creatorId || null
}

/**
 * Log one interaction against a creator's post.
 * Safe to call often — duplicates within a short window for the same actor+post+type are coalesced.
 */
export function logCreatorInteraction({
  creatorId,
  contentId = null,
  type,
  actorId = null,
  title = '',
  at = null,
  weight = 1,
  source = 'live',
  surface = 'unknown',
  contentType = null,
} = {}) {
  const kind = normalizeInteractionType(type)
  if (!creatorId || !kind) return null
  // Follows are channel-level (no post). Other types need a post id.
  if (kind !== 'subscribe' && !contentId) return null

  const resolved = contentId ? resolveContentMeta(contentId) : null
  const cid = creatorId || resolved?.creatorId
  if (!cid) return null
  const postTitle = title || resolved?.title || (kind === 'subscribe' ? 'Channel' : 'Post')
  const cType = contentType || resolved?.contentType || (kind === 'subscribe' ? 'channel' : null)
  const surf = SURFACE_LABELS[surface] ? surface : 'unknown'

  const list = all()
  const now = at || new Date().toISOString()
  const recent = list.find(
    (r) =>
      r.creatorId === cid
      && r.contentId === (contentId || null)
      && r.type === kind
      && r.actorId === (actorId || null)
      && Math.abs(Date.parse(r.at) - Date.parse(now)) < 8000
  )
  if (recent) {
    recent.weight = Math.min(99, (Number(recent.weight) || 1) + (Number(weight) || 1))
    if (surf !== 'unknown') recent.surface = surf
    if (cType) recent.contentType = cType
    save(list)
    notifyInteractionsChanged()
    queueCloudPush(recent)
    return recent
  }
  const row = {
    id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    creatorId: cid,
    contentId: contentId || null,
    type: kind,
    actorId: actorId || null,
    title: String(postTitle || '').slice(0, 120),
    weight: Math.max(1, Number(weight) || 1),
    source,
    surface: surf,
    contentType: cType,
    at: now,
  }
  list.unshift(row)
  save(list)
  notifyInteractionsChanged()
  queueCloudPush(row)
  return row
}

function queueCloudPush(row) {
  queueMicrotask(() => {
    import('./graphSync').then(({ pushCreatorInteraction }) => {
      pushCreatorInteraction?.(row)
    }).catch(() => {})
  })
}

/** Merge remote rows into local (by id). Used after cloud pull. */
export function mergeCreatorInteractionsFromCloud(rows = []) {
  if (!rows?.length) return 0
  const list = all()
  const byId = new Map(list.map((r) => [r.id, r]))
  let n = 0
  for (const raw of rows) {
    if (!raw?.id || !raw.creator_id || !raw.type) continue
    const kind = normalizeInteractionType(raw.type)
    if (!kind) continue
    const row = {
      id: String(raw.id),
      creatorId: String(raw.creator_id),
      contentId: raw.content_id || null,
      type: kind,
      actorId: raw.actor_id || null,
      title: String(raw.title || '').slice(0, 120),
      weight: Math.max(1, Number(raw.weight) || 1),
      source: raw.source || 'live',
      surface: SURFACE_LABELS[raw.surface] ? raw.surface : 'unknown',
      contentType: raw.content_type || null,
      at: raw.at || new Date().toISOString(),
    }
    if (!byId.has(row.id)) {
      byId.set(row.id, row)
      n += 1
    }
  }
  const merged = [...byId.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MAX)
  save(merged)
  if (n) notifyInteractionsChanged()
  return n
}

export function listCreatorInteractions(creatorId, { contentId = null, range = 'all', limit = 800 } = {}) {
  if (!creatorId) return []
  const cut = rangeCutoff(range)
  return all()
    .filter((r) => r.creatorId === creatorId)
    .filter((r) => {
      if (!contentId) return true
      if (r.type === 'subscribe') return true
      return r.contentId === contentId
    })
    .filter((r) => !cut || Date.parse(r.at) >= cut)
    .slice(0, limit)
}

function rangeCutoff(range) {
  if (range === '24h') return Date.now() - 86400000
  if (range === '7d') return Date.now() - 7 * 86400000
  if (range === '30d') return Date.now() - 30 * 86400000
  return 0
}

/**
 * Build bubble nodes for the map. Prefers live event log; seeds from tallies
 * when the log is thin so the map is never empty for creators with real traffic.
 */
export function buildInteractionBubbles(creatorId, posts = [], { contentId = null, range = 'all' } = {}) {
  const live = listCreatorInteractions(creatorId, { contentId, range, limit: 1200 })
  const nodes = []
  const postById = new Map((posts || []).map((p) => [p.id, p]))

  for (const ev of live) {
    const meta = typeMeta(ev.type)
    const post = ev.contentId ? postById.get(ev.contentId) : null
    nodes.push({
      id: ev.id,
      contentId: ev.contentId,
      type: ev.type,
      label: meta.label,
      color: meta.color,
      short: meta.short,
      weight: Number(ev.weight) || 1,
      at: Date.parse(ev.at) || Date.now(),
      title: ev.title || post?.title || (ev.type === 'subscribe' ? 'Channel' : 'Post'),
      source: ev.source || 'live',
      surface: ev.surface || 'unknown',
      contentType: ev.contentType || contentTypeForItem(post) || null,
    })
  }

  if (nodes.length < 8) {
    const seed = seedBubblesFromTallies(creatorId, posts, contentId, range)
    for (const s of seed) {
      if (nodes.some((n) => n.contentId === s.contentId && n.type === s.type && n.source === 'tally')) continue
      nodes.push(s)
    }
  }

  return nodes
}

function seedBubblesFromTallies(creatorId, posts, contentId, range) {
  const cut = rangeCutoff(range)
  const list = (posts || []).filter((p) => p && (!contentId || p.id === contentId))
  const out = []
  for (const post of list.slice(0, 40)) {
    const created = Date.parse(post.createdAt || post.publishedAt || 0) || Date.now() - 86400000
    if (cut && created < cut && !(getViews(post.id) || post.views)) continue
    const views = getViews(post.id) || post.views || 0
    const likes = getVotes(post.id)?.up || 0
    const comments = listComments(post.id).length
    const span = Math.max(3600000, Date.now() - created)
    const place = (type, count, offsetFrac) => {
      if (!count) return
      const at = created + span * offsetFrac
      if (cut && at < cut) return
      const meta = typeMeta(type)
      out.push({
        id: `seed_${post.id}_${type}`,
        contentId: post.id,
        type,
        label: meta.label,
        color: meta.color,
        short: meta.short,
        weight: Math.max(1, Math.round(Math.log2(count + 1) * 2)),
        count,
        at,
        title: post.title || 'Post',
        source: 'tally',
        surface: post.type === 'pic' ? 'pics' : post.type === 'video' ? 'watch' : 'clips',
        contentType: contentTypeForItem(post),
      })
    }
    place('view', views, 0.35)
    place('like', likes, 0.55)
    place('comment', comments, 0.7)
  }
  const subs = getSubscriberCount(creatorId)
  if (subs && !contentId) {
    const meta = typeMeta('subscribe')
    out.push({
      id: `seed_subs_${creatorId}`,
      contentId: null,
      type: 'subscribe',
      label: meta.label,
      color: meta.color,
      short: meta.short,
      weight: Math.max(1, Math.round(Math.log2(subs + 1) * 3)),
      count: subs,
      at: Date.now() - 3 * 86400000,
      title: 'Channel',
      source: 'tally',
      surface: 'channel',
      contentType: 'channel',
    })
  }
  return out
}

export function summarizeBubbles(nodes) {
  const byType = {}
  const bySurface = {}
  let total = 0
  for (const n of nodes || []) {
    byType[n.type] = (byType[n.type] || 0) + (n.count || n.weight || 1)
    const surf = n.surface || 'unknown'
    bySurface[surf] = (bySurface[surf] || 0) + (n.count || n.weight || 1)
    total += n.count || n.weight || 1
  }
  return { byType, bySurface, total, nodes: (nodes || []).length }
}
