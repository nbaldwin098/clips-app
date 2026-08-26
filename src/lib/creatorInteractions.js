/**
 * Creator-facing interaction timeline for the studio bubble map.
 * Cloud (creator_interactions) is source of truth; local cache is display-only after pull/push.
 */
import { lsGet, lsSet, getImports } from './storage'

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
 * Meme/solana-style network: one node per real actor, white edges to the creator
 * hub and between people who touched the same post. Tallies are never invented as people.
 */
export function buildInteractionNetwork(creatorId, posts = [], { contentId = null, range = 'all' } = {}) {
  const live = listCreatorInteractions(creatorId, { contentId, range, limit: 1500 })
    .filter((ev) => ev && ev.source !== 'tally')
  const postById = new Map((posts || []).map((p) => [p.id, p]))
  const byActor = new Map()
  let guestEvents = 0
  let guestWeight = 0

  for (const ev of live) {
    if (!ev.actorId) {
      guestEvents += 1
      guestWeight += Number(ev.weight) || 1
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
    const w = Number(ev.weight) || 1
    bucket.events.push(ev)
    bucket.byType[ev.type] = (bucket.byType[ev.type] || 0) + w
    if (ev.contentId) bucket.contentIds.add(ev.contentId)
    bucket.weight += w
    const t = Date.parse(ev.at) || Date.now()
    if (t < bucket.firstAt) bucket.firstAt = t
    if (t > bucket.lastAt) bucket.lastAt = t
  }

  const people = []
  for (const bucket of byActor.values()) {
    const types = Object.entries(bucket.byType).sort((a, b) => b[1] - a[1])
    const primaryType = types[0]?.[0] || 'view'
    const meta = typeMeta(primaryType)
    const topEv = [...bucket.events].sort((a, b) => (Number(b.weight) || 1) - (Number(a.weight) || 1))[0]
    const post = topEv?.contentId ? postById.get(topEv.contentId) : null
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
      primaryLabel: meta.label,
      color: meta.color,
      short: meta.short,
      primarySurface: topEv?.surface || 'unknown',
      primaryContentType: topEv?.contentType || contentTypeForItem(post) || null,
      contentIds: [...bucket.contentIds],
      topContentId: topEv?.contentId || null,
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
      weight: guestWeight || guestEvents,
      eventCount: guestEvents,
      byType: { view: guestWeight || guestEvents },
      types: ['view'],
      primaryType: 'view',
      primaryLabel: 'Unsigned activity',
      color: meta.color,
      short: 'Guest',
      primarySurface: 'unknown',
      primaryContentType: null,
      contentIds: [],
      topContentId: null,
      topTitle: 'Signed-out sessions',
      firstAt: Date.now(),
      lastAt: Date.now(),
      events: [],
    })
  }

  const hub = {
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

  // Co-interaction edges: people who touched the same post (meme-coin style clusters).
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
    const w = Number(ev.weight) || 1
    byType[ev.type] = (byType[ev.type] || 0) + w
    const surf = ev.surface || 'unknown'
    bySurface[surf] = (bySurface[surf] || 0) + w
    total += w
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
    byType[n.type] = (byType[n.type] || 0) + (n.count || n.weight || 1)
    const surf = n.surface || 'unknown'
    bySurface[surf] = (bySurface[surf] || 0) + (n.count || n.weight || 1)
    total += n.count || n.weight || 1
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
