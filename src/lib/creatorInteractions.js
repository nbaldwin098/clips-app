/**
 * Creator-facing interaction timeline for the studio bubble map.
 * Records when viewers click (open), like, subscribe, share, comment, or skip/kick past a post.
 */
import { lsGet, lsSet } from './storage'
import { getViews, getVotes, getSubscriberCount } from './engagement'
import { listComments } from './youtubeParity'
import { getImports } from './storage'

const KEY = 'clips_creator_interactions'
const MAX = 2500

export const INTERACTION_TYPES = [
  { id: 'view', label: 'Clicked / viewed', color: '#60a5fa', short: 'View' },
  { id: 'like', label: 'Liked', color: '#f472b6', short: 'Like' },
  { id: 'subscribe', label: 'Subscribed', color: '#34d399', short: 'Sub' },
  { id: 'share', label: 'Shared', color: '#a78bfa', short: 'Share' },
  { id: 'comment', label: 'Commented', color: '#fbbf24', short: 'Comment' },
  { id: 'skip', label: 'Skipped / kicked', color: '#fb7185', short: 'Skip' },
]

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

/**
 * Log one interaction against a creator's post.
 * Safe to call often — duplicates within a short window for the same actor+post+type are coalesced.
 */
export function logCreatorInteraction({
  creatorId,
  contentId,
  type,
  actorId = null,
  title = '',
  at = null,
  weight = 1,
  source = 'live',
} = {}) {
  const kind = normalizeInteractionType(type)
  if (!creatorId || !contentId || !kind) return null
  const list = all()
  const now = at || new Date().toISOString()
  const recent = list.find(
    (r) =>
      r.creatorId === creatorId
      && r.contentId === contentId
      && r.type === kind
      && r.actorId === (actorId || null)
      && Math.abs(Date.parse(r.at) - Date.parse(now)) < 8000
  )
  if (recent) {
    recent.weight = Math.min(99, (Number(recent.weight) || 1) + (Number(weight) || 1))
    save(list)
    return recent
  }
  const row = {
    id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    creatorId,
    contentId,
    type: kind,
    actorId: actorId || null,
    title: String(title || '').slice(0, 120),
    weight: Math.max(1, Number(weight) || 1),
    source,
    at: now,
  }
  list.unshift(row)
  save(list)
  return row
}

export function listCreatorInteractions(creatorId, { contentId = null, range = 'all', limit = 800 } = {}) {
  if (!creatorId) return []
  const cut = rangeCutoff(range)
  return all()
    .filter((r) => r.creatorId === creatorId)
    .filter((r) => !contentId || r.contentId === contentId)
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

  for (const ev of live) {
    const meta = typeMeta(ev.type)
    nodes.push({
      id: ev.id,
      contentId: ev.contentId,
      type: ev.type,
      label: meta.label,
      color: meta.color,
      short: meta.short,
      weight: Number(ev.weight) || 1,
      at: Date.parse(ev.at) || Date.now(),
      title: ev.title || posts.find((p) => p.id === ev.contentId)?.title || 'Post',
      source: ev.source || 'live',
    })
  }

  if (nodes.length < 8) {
    const seed = seedBubblesFromTallies(creatorId, posts, contentId)
    for (const s of seed) {
      if (nodes.some((n) => n.contentId === s.contentId && n.type === s.type && n.source === 'tally')) continue
      nodes.push(s)
    }
  }

  return nodes
}

function seedBubblesFromTallies(creatorId, posts, contentId) {
  const list = (posts || []).filter((p) => p && (!contentId || p.id === contentId))
  const out = []
  for (const post of list.slice(0, 40)) {
    const created = Date.parse(post.createdAt || post.publishedAt || 0) || Date.now() - 86400000
    const views = getViews(post.id) || post.views || 0
    const likes = getVotes(post.id)?.up || 0
    const comments = listComments(post.id).length
    const span = Math.max(3600000, Date.now() - created)
    const place = (type, count, offsetFrac) => {
      if (!count) return
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
        at: created + span * offsetFrac,
        title: post.title || 'Post',
        source: 'tally',
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
    })
  }
  return out
}

export function summarizeBubbles(nodes) {
  const byType = {}
  let total = 0
  for (const n of nodes || []) {
    byType[n.type] = (byType[n.type] || 0) + (n.count || n.weight || 1)
    total += n.count || n.weight || 1
  }
  return { byType, total, nodes: (nodes || []).length }
}

/** Resolve creatorId for a content id from imports cache. */
export function creatorIdForContent(contentId) {
  if (!contentId) return null
  const row = (getImports() || []).find((r) => r.id === contentId)
  return row?.creatorId || row?.userId || null
}
