/**
 * Creator-facing interaction timeline for the studio bubble map.
 * Cloud is source of truth. Local storage is a display cache only — wiped/replaced on sync.
 */
import { lsGet, lsSet, getImports } from './storage'

const KEY = 'clips_creator_interactions'
const CLEAR_FLAG = 'clips_interactions_cloud_sot_v2'
const MAX = 2500
const INTERACTION_EVENT = 'clips-creator-interactions'

/** One-shot: drop poisoned local tallies (rewatch/loop weight spam). Cloud pull rebuilds. */
export function clearPoisonedInteractionCache() {
  try {
    if (lsGet(CLEAR_FLAG, false)) return false
    lsSet(KEY, [])
    lsSet(CLEAR_FLAG, true)
    return true
  } catch {
    return false
  }
}
clearPoisonedInteractionCache()

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

export const VIEW_ONLY_COLOR = '#92400e' // brown — visited, no like/follow/share/etc.

export const INTERACTION_TYPES = [
  { id: 'view', label: 'Viewed only', color: VIEW_ONLY_COLOR, short: 'View' },
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
  stats: 'Site bubble / stats',
  unknown: 'App',
}

export const CONTENT_TYPE_LABELS = {
  video: 'Video',
  short: 'Clip',
  pic: 'Pic',
  channel: 'Channel',
}

/** Types that belong on the bubble map. Loop/complete/impression are NOT mapped (they inflated counts). */
const TYPE_ALIASES = {
  upvote: 'like',
  like: 'like',
  save: 'like',
  subscribe: 'subscribe',
  share: 'share',
  comment: 'comment',
  early_skip: 'skip',
  skip: 'skip',
  kick: 'skip',
  view: 'view',
}

/** Taste-engine noise — never becomes a map event. */
const IGNORE_TYPES = new Set([
  'impression', 'loop', 'complete', 'watch', 'progress', 'downvote', 'hover',
])

function all() {
  return lsGet(KEY, []) || []
}

function save(list) {
  lsSet(KEY, list.slice(0, MAX))
}

export function normalizeInteractionType(type) {
  const raw = String(type || '').toLowerCase()
  if (IGNORE_TYPES.has(raw)) return null
  return TYPE_ALIASES[raw] || null
}

/** Stable cloud/local id — one row per actor × post × action (no rewatch spam). */
export function stableInteractionId(kind, contentId, actorId) {
  const k = String(kind || 'x')
  const c = String(contentId || 'ch')
  const a = String(actorId || 'guest')
  return `ci_${k}_${c}_${a}`.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 180)
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
 * One row per actor+post+type (stable id). Weight stays 1 — never inflates from rewatches.
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
  if (kind !== 'subscribe' && !contentId) return null

  const resolved = contentId ? resolveContentMeta(contentId) : null
  const cid = creatorId || resolved?.creatorId
  if (!cid) return null

  const postTitle = title || resolved?.title || (kind === 'subscribe' ? 'Channel' : 'Post')
  const cType = contentType || resolved?.contentType || (kind === 'subscribe' ? 'channel' : null)
  const surf = SURFACE_LABELS[surface] ? surface : 'unknown'
  const now = at || new Date().toISOString()
  const actor = actorId || null
  const id = stableInteractionId(kind, contentId || 'ch', actor || 'guest')

  const list = all()
  const existing = list.find((r) => r.id === id)
  if (existing) {
    existing.at = now
    if (surf !== 'unknown') existing.surface = surf
    if (cType) existing.contentType = cType
    if (postTitle) existing.title = String(postTitle).slice(0, 120)
    existing.weight = 1
    existing.source = source === 'tally' ? existing.source : source
    save(list)
    notifyInteractionsChanged()
    if (source !== 'tally' && source !== 'cloud') queueCloudPush(existing)
    return existing
  }

  const row = {
    id,
    creatorId: cid,
    contentId: contentId || null,
    type: kind,
    actorId: actor,
    title: String(postTitle || '').slice(0, 120),
    weight: 1,
    source,
    surface: surf,
    contentType: cType,
    at: now,
  }
  void weight
  list.unshift(row)
  save(list)
  notifyInteractionsChanged()
  if (source !== 'tally' && source !== 'cloud') queueCloudPush(row)
  return row
}

function queueCloudPush(row) {
  queueMicrotask(() => {
    import('./graphSync').then(({ pushCreatorInteraction }) => {
      pushCreatorInteraction?.(row)
    }).catch(() => {})
  })
}

function normalizeCloudRow(raw) {
  if (!raw?.id || !raw.creator_id || !raw.type) return null
  const kind = normalizeInteractionType(raw.type)
  if (!kind) return null
  const actorId = raw.actor_id || null
  const contentId = raw.content_id || null
  const id = actorId
    ? stableInteractionId(kind, contentId || 'ch', actorId)
    : String(raw.id)
  return {
    id,
    creatorId: String(raw.creator_id),
    contentId,
    type: kind,
    actorId,
    title: String(raw.title || '').slice(0, 120),
    weight: 1,
    source: raw.source === 'tally' ? 'live' : (raw.source || 'live'),
    surface: SURFACE_LABELS[raw.surface] ? raw.surface : 'unknown',
    contentType: raw.content_type || null,
    at: raw.at || new Date().toISOString(),
  }
}

/** Merge remote rows into local (by stable id). */
export function mergeCreatorInteractionsFromCloud(rows = []) {
  if (!rows?.length) return 0
  const list = all()
  const byId = new Map(list.map((r) => [r.id, r]))
  let n = 0
  for (const raw of rows) {
    const row = normalizeCloudRow(raw)
    if (!row) continue
    if (!byId.has(row.id)) {
      byId.set(row.id, row)
      n += 1
    } else {
      const prev = byId.get(row.id)
      if (Date.parse(row.at) > Date.parse(prev.at || 0)) {
        byId.set(row.id, { ...prev, ...row, weight: 1 })
        n += 1
      }
    }
  }
  const merged = [...byId.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MAX)
  save(merged)
  if (n) notifyInteractionsChanged()
  return n
}

/**
 * Replace all local rows for one creator with cloud-built rows (cloud SOT).
 * Drops inflated local junk for that creator.
 */
export function replaceCreatorInteractionsForCreator(creatorId, rows = []) {
  if (!creatorId) return 0
  const others = all().filter((r) => r.creatorId !== creatorId)
  const byId = new Map()
  for (const raw of rows) {
    let row = null
    if (raw?.creator_id) {
      row = normalizeCloudRow(raw)
    } else if (raw?.creatorId && raw?.type) {
      const kind = normalizeInteractionType(raw.type) || (
        INTERACTION_TYPES.some((t) => t.id === raw.type) ? raw.type : null
      )
      if (!kind) continue
      row = {
        id: raw.id || stableInteractionId(kind, raw.contentId || 'ch', raw.actorId || 'guest'),
        creatorId: String(raw.creatorId),
        contentId: raw.contentId || null,
        type: kind,
        actorId: raw.actorId || null,
        title: String(raw.title || '').slice(0, 120),
        weight: 1,
        source: raw.source || 'live',
        surface: SURFACE_LABELS[raw.surface] ? raw.surface : 'unknown',
        contentType: raw.contentType || null,
        at: raw.at || new Date().toISOString(),
      }
    }
    if (!row || row.creatorId !== creatorId) continue
    row.weight = 1
    byId.set(row.id, row)
  }
  const next = [...others, ...byId.values()]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MAX)
  save(next)
  notifyInteractionsChanged()
  return byId.size
}

export function listCreatorInteractions(creatorId, {
  contentId = null,
  range = 'all',
  limit = 800,
  untilMs = null,
  sinceMs = null,
  includeSubscribe = null,
} = {}) {
  if (!creatorId) return []
  const cut = rangeCutoff(range)
  const allowSubscribe = includeSubscribe == null ? !contentId : !!includeSubscribe
  return all()
    .filter((r) => r.creatorId === creatorId)
    .filter((r) => {
      if (!contentId) return true
      if (r.type === 'subscribe') return allowSubscribe
      return r.contentId === contentId
    })
    .filter((r) => {
      const t = Date.parse(r.at)
      if (!Number.isFinite(t)) return false
      if (cut && t < cut) return false
      if (sinceMs != null && t < sinceMs) return false
      if (untilMs != null && t > untilMs) return false
      return true
    })
    .slice(0, limit)
}

/**
 * Site bubble: one row per contentId that has logged interactions (weight = event count).
 */
export function aggregateInteractionsByContent(limit = 400) {
  const by = new Map()
  for (const r of all()) {
    if (!r?.contentId) continue
    const cur = by.get(r.contentId) || {
      id: r.contentId,
      contentId: r.contentId,
      contentType: r.contentType || null,
      title: r.title || 'Post',
      handle: '',
      thumbUrl: null,
      weight: 0,
      creatorId: r.creatorId || null,
    }
    cur.weight += 1
    if (r.title) cur.title = r.title
    if (r.contentType) cur.contentType = r.contentType
    if (r.creatorId) cur.creatorId = r.creatorId
    by.set(r.contentId, cur)
  }
  const catalog = new Map()
  try {
    for (const raw of getImports()) {
      if (raw?.id) catalog.set(raw.id, raw)
    }
  } catch { /* ok */ }
  const rows = [...by.values()].map((row) => {
    const item = catalog.get(row.contentId)
    return {
      ...row,
      title: item?.title || row.title,
      handle: item?.handle || row.handle || '',
      thumbUrl: item?.thumbUrl || item?.mediaUrl || null,
      contentType: item?.type || row.contentType,
      weight: Math.max(1, row.weight),
    }
  })
  rows.sort((a, b) => b.weight - a.weight)
  return rows.slice(0, limit)
}

function rangeCutoff(range) {
  if (range === '24h') return Date.now() - 86400000
  if (range === '7d') return Date.now() - 7 * 86400000
  if (range === '30d') return Date.now() - 30 * 86400000
  return 0
}

/**
 * Build bubble nodes for the map.
 * @deprecated Prefer buildInteractionNetwork for the studio map (real users).
 */
export function buildInteractionBubbles(creatorId, posts = [], { contentId = null, range = 'all' } = {}) {
  const net = buildInteractionNetwork(creatorId, posts, { contentId, range })
  return (net.people || []).map((p) => ({
    id: p.id,
    contentId: p.topContentId || null,
    type: p.primaryType,
    label: p.primaryLabel,
    color: p.color,
    short: p.short,
    weight: p.weight,
    count: p.eventCount,
    at: p.lastAt,
    title: p.topTitle || (p.primaryType === 'subscribe' ? 'Channel' : 'Post'),
    source: 'live',
    surface: p.primarySurface,
    contentType: p.primaryContentType,
    actorId: p.actorId,
    handle: p.handle,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
  }))
}

/**
 * One node per real actor around a post hub (or creator hub if no post).
 * Tallies are never invented as people.
 */
export function buildInteractionNetwork(creatorId, posts = [], {
  contentId = null,
  range = 'all',
  untilMs = null,
  sinceMs = null,
} = {}) {
  const live = listCreatorInteractions(creatorId, {
    contentId,
    range,
    limit: 1500,
    untilMs,
    sinceMs,
    includeSubscribe: !contentId,
  }).filter((ev) => ev && ev.source !== 'tally')
  const postById = new Map((posts || []).map((p) => [p.id, p]))
  const selectedPost = contentId ? postById.get(contentId) : null
  const byActor = new Map()
  let guestEvents = 0

  for (const ev of live) {
    if (!ev.actorId) {
      guestEvents += 1
      continue
    }
    const key = String(ev.actorId)
    let bucket = byActor.get(key)
    if (!bucket) {
      bucket = {
        actorId: key,
        events: [],
        byType: {},
        contentIds: new Set(),
        weight: 0,
        firstAt: Infinity,
        lastAt: 0,
      }
      byActor.set(key, bucket)
    }
    bucket.events.push(ev)
    bucket.byType[ev.type] = (bucket.byType[ev.type] || 0) + 1
    if (ev.contentId) bucket.contentIds.add(ev.contentId)
    bucket.weight += 1
    const t = Date.parse(ev.at) || Date.now()
    if (t < bucket.firstAt) bucket.firstAt = t
    if (t > bucket.lastAt) bucket.lastAt = t
  }

  const people = []
  for (const bucket of byActor.values()) {
    const types = Object.entries(bucket.byType).sort((a, b) => b[1] - a[1])
    const actionTypes = types.filter(([id]) => id !== 'view')
    const primaryType = actionTypes[0]?.[0] || types[0]?.[0] || 'view'
    const meta = typeMeta(primaryType)
    const viewOnly = actionTypes.length === 0
    const topEv = [...bucket.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]
    const post = topEv?.contentId ? postById.get(topEv.contentId) : selectedPost
    people.push({
      id: `actor_${bucket.actorId}`,
      kind: 'person',
      actorId: bucket.actorId,
      handle: null,
      displayName: null,
      avatarUrl: null,
      weight: bucket.weight,
      eventCount: bucket.events.length,
      byType: { ...bucket.byType },
      types: types.map(([id]) => id),
      primaryType,
      primaryLabel: viewOnly ? 'Viewed only' : meta.label,
      color: viewOnly ? '#92400e' : meta.color,
      short: viewOnly ? 'View' : meta.short,
      primarySurface: topEv?.surface || 'unknown',
      primaryContentType: topEv?.contentType || contentTypeForItem(post) || null,
      contentIds: [...bucket.contentIds],
      topContentId: topEv?.contentId || contentId || null,
      topTitle: topEv?.title || post?.title || (primaryType === 'subscribe' ? 'Channel' : 'Post'),
      firstAt: Number.isFinite(bucket.firstAt) ? bucket.firstAt : Date.now(),
      lastAt: bucket.lastAt || Date.now(),
      events: bucket.events.slice(0, 40),
    })
  }

  people.sort((a, b) => b.weight - a.weight || b.lastAt - a.lastAt)

  if (guestEvents > 0) {
    const meta = typeMeta('view')
    people.push({
      id: 'actor_guests',
      kind: 'guests',
      actorId: null,
      handle: 'guests',
      displayName: 'Unsigned viewers',
      avatarUrl: null,
      weight: guestEvents,
      eventCount: guestEvents,
      byType: { view: guestEvents },
      types: ['view'],
      primaryType: 'view',
      primaryLabel: 'Unsigned activity',
      color: meta.color,
      short: 'Guest',
      primarySurface: 'unknown',
      primaryContentType: null,
      contentIds: contentId ? [contentId] : [],
      topContentId: contentId || null,
      topTitle: 'Signed-out sessions',
      firstAt: Date.now(),
      lastAt: Date.now(),
      events: [],
    })
  }

  const hub = contentId
    ? {
        id: `hub_post_${contentId}`,
        kind: 'post',
        contentId,
        actorId: null,
        label: selectedPost?.title || 'Post',
        postType: selectedPost?.type || null,
        thumbUrl: selectedPost?.thumbUrl || selectedPost?.thumbnailUrl || selectedPost?.coverUrl || null,
      }
    : {
        id: `hub_${creatorId || 'creator'}`,
        kind: 'hub',
        actorId: creatorId || null,
        label: 'You',
      }

  const edges = []
  for (const person of people) {
    edges.push({
      id: `e_hub_${person.id}`,
      from: hub.id,
      to: person.id,
      kind: 'hub',
      weight: person.weight,
      types: person.types,
    })
  }

  const byContent = new Map()
  for (const person of people) {
    if (person.kind !== 'person') continue
    for (const cid of person.contentIds) {
      if (!byContent.has(cid)) byContent.set(cid, [])
      byContent.get(cid).push(person.id)
    }
  }
  const seenPair = new Set()
  let coEdgeCount = 0
  for (const [, ids] of byContent) {
    if (ids.length < 2 || coEdgeCount > 120) continue
    const capped = ids.slice(0, 12)
    for (let i = 0; i < capped.length; i += 1) {
      for (let j = i + 1; j < capped.length; j += 1) {
        const a = capped[i]
        const b = capped[j]
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        if (seenPair.has(key)) continue
        seenPair.add(key)
        edges.push({
          id: `e_co_${key}`,
          from: a,
          to: b,
          kind: 'co',
          weight: 1,
          types: [],
        })
        coEdgeCount += 1
        if (coEdgeCount > 120) break
      }
      if (coEdgeCount > 120) break
    }
  }

  const summary = summarizeNetwork(people, live)
  return { hub, people, edges, events: live, summary }
}


export function summarizeNetwork(people = [], events = []) {
  const byType = {}
  const bySurface = {}
  let total = 0
  for (const ev of events || []) {
    // Count unique action rows — never use inflated weight
    byType[ev.type] = (byType[ev.type] || 0) + 1
    const surf = ev.surface || 'unknown'
    bySurface[surf] = (bySurface[surf] || 0) + 1
    total += 1
  }
  return {
    byType,
    bySurface,
    total,
    people: (people || []).filter((p) => p.kind === 'person').length,
    guests: (people || []).some((p) => p.kind === 'guests'),
    nodes: (people || []).length,
  }
}

export function summarizeBubbles(nodes) {
  const byType = {}
  const bySurface = {}
  let total = 0
  for (const n of nodes || []) {
    byType[n.type] = (byType[n.type] || 0) + 1
    const surf = n.surface || 'unknown'
    bySurface[surf] = (bySurface[surf] || 0) + 1
    total += 1
  }
  return { byType, bySurface, total, nodes: (nodes || []).length }
}

/** Resolve local + cloud identity for actor ids (handles / avatars). */
export function resolveActorIdentities(actorIds = [], cloudProfiles = {}) {
  const index = lsGet('users_index', {}) || {}
  const out = {}
  for (const id of actorIds || []) {
    if (!id) continue
    const local = index[id] || null
    const cloud = cloudProfiles[id] || null
    out[id] = {
      id,
      handle: cloud?.handle || local?.handle || null,
      displayName: cloud?.displayName || local?.displayName || null,
      avatarUrl: cloud?.avatarUrl || local?.avatarUrl || null,
    }
  }
  return out
}
