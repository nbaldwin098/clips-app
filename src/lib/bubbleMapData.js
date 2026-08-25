/**
 * Audience bubble map — anonymous platform users + creator post interactions.
 * Never exposes handles, emails, or display names.
 */
import { lsGet } from './storage'
import { getVotes, getViews } from './engagement'
import { listIndexedUsers } from './moderation'
import { getCreatorContent } from './contentService'
import { listCreatorInteractions, typeMeta } from './creatorInteractions'

const VOTES_KEY = 'engagement_votes'
const SUBS_KEY = 'engagement_subs'
const TASTE_KEY = 'taste_profiles'
const INTERACTIONS_KEY = 'clips_creator_interactions'

/** Stable short anonymous label from a user id (no PII). */
export function anonymizeUserId(userId) {
  const raw = String(userId || 'anon')
  let h = 2166136261
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const code = (h >>> 0).toString(16).padStart(8, '0').slice(0, 4)
  return `Viewer ${code}`
}

/** Anonymous id for events without a signed-in actor (still distinct per event cluster). */
export function anonymizeActorKey(actorId, fallbackSeed) {
  if (actorId) return String(actorId)
  return `anon_${String(fallbackSeed || 'x')}`
}

function interactionWeight(kinds = []) {
  let w = 0
  for (const k of kinds) {
    if (k === 'like') w += 4
    else if (k === 'dislike') w += 1
    else if (k === 'subscribe') w += 6
    else if (k === 'premium') w += 8
    else if (k === 'view') w += 2
    else if (k === 'share') w += 5
    else if (k === 'comment') w += 4
    else if (k === 'skip') w += 1
    else if (k === 'affinity') w += 2
    else if (k === 'watch') w += 2
    else w += 1
  }
  return Math.max(1, w)
}

/**
 * Build holders-style bubble-map graph for a creator.
 * Outer bubbles = anonymous platform users; inner = your posts; links = interactions.
 */
export function buildAudienceBubbleMap(creatorId, handle = null, { contentId = null, range = 'all' } = {}) {
  const posts = (getCreatorContent(creatorId, handle) || [])
    .filter((p) => p?.id)
    .filter((p) => !contentId || p.id === contentId)
  const postIds = new Set(posts.map((p) => p.id))
  const postById = Object.fromEntries(posts.map((p) => [p.id, p]))

  const votesByUser = lsGet(VOTES_KEY, {}) || {}
  const subs = (lsGet(SUBS_KEY, {}) || {})[creatorId] || []
  const premium = lsGet(`premium_${creatorId}`, []) || []
  const tastes = lsGet(TASTE_KEY, {}) || {}
  const indexed = listIndexedUsers() || []
  const liveEvents = listCreatorInteractions(creatorId, { contentId, range, limit: 1500 })

  /** @type {Map<string, { id: string, label: string, kindsByPost: Map<string, Set<string>>, platform: boolean }>} */
  const userMap = new Map()

  const ensureUser = (uid, { platform = false } = {}) => {
    if (!uid || uid === creatorId) return null
    let row = userMap.get(uid)
    if (!row) {
      row = {
        id: uid,
        label: anonymizeUserId(uid),
        kindsByPost: new Map(),
        platform: false,
      }
      userMap.set(uid, row)
    }
    if (platform) row.platform = true
    return row
  }

  const addKind = (uid, contentIdKey, kind, { platform = false } = {}) => {
    const row = ensureUser(uid, { platform })
    if (!row || !kind) return
    const set = row.kindsByPost.get(contentIdKey) || new Set()
    set.add(kind)
    row.kindsByPost.set(contentIdKey, set)
  }

  // Everyone indexed on the platform appears (anonymously), even with zero engagement.
  for (const u of indexed) {
    ensureUser(u.id, { platform: true })
  }

  for (const [uid, mine] of Object.entries(votesByUser)) {
    if (!mine || typeof mine !== 'object') continue
    for (const [cid, dir] of Object.entries(mine)) {
      if (!postIds.has(cid)) continue
      addKind(uid, cid, dir === 'up' ? 'like' : 'dislike')
    }
  }

  for (const uid of subs) {
    addKind(uid, '__channel__', 'subscribe')
  }

  for (const uid of premium) {
    addKind(uid, '__channel__', 'premium')
  }

  for (const [uid, taste] of Object.entries(tastes)) {
    if (!taste || typeof taste !== 'object') continue
    const affinity = Number(taste.creatorAffinity?.[creatorId]) || 0
    const positives = Array.isArray(taste.recentPositiveIds) ? taste.recentPositiveIds : []
    const hitPosts = positives.filter((id) => postIds.has(id))
    if (affinity <= 0 && hitPosts.length === 0) continue
    if (affinity > 0) addKind(uid, '__channel__', 'affinity')
    for (const cid of hitPosts) addKind(uid, cid, 'watch')
  }

  for (const ev of liveEvents) {
    const cid = ev.contentId
    if (cid && cid !== creatorId && !postIds.has(cid) && contentId) continue
    const key = anonymizeActorKey(ev.actorId, ev.id)
    const postKey = cid && postIds.has(cid) ? cid : '__channel__'
    addKind(key, postKey, ev.type || 'view')
  }

  // Also scan raw interaction store for any actor ids tied to this creator
  // (covers events filtered out of listCreatorInteractions edge cases).
  const raw = lsGet(INTERACTIONS_KEY, []) || []
  for (const ev of raw) {
    if (ev?.creatorId !== creatorId) continue
    if (contentId && ev.contentId !== contentId) continue
    if (ev.actorId) ensureUser(String(ev.actorId))
  }

  const links = []
  const users = []

  for (const row of userMap.values()) {
    const allKinds = new Set()
    let engagedPosts = 0
    for (const [cid, kinds] of row.kindsByPost.entries()) {
      for (const k of kinds) allKinds.add(k)
      if (cid === '__channel__') continue
      engagedPosts += 1
      const kindList = [...kinds]
      links.push({
        userId: row.id,
        contentId: cid,
        kinds: kindList,
        strength: interactionWeight(kindList),
        color: typeMeta(kindList[0])?.color || '#94a3b8',
        postTitle: postById[cid]?.title || 'Post',
      })
    }
    const channelKinds = row.kindsByPost.get('__channel__')
    if (channelKinds?.size && posts.length) {
      const top = [...posts].sort((a, b) => (getViews(b.id) || 0) - (getViews(a.id) || 0))[0]
      if (top) {
        const kindList = [...channelKinds]
        links.push({
          userId: row.id,
          contentId: top.id,
          kinds: kindList,
          strength: interactionWeight(kindList) * 0.5,
          soft: true,
          color: typeMeta(kindList[0])?.color || '#94a3b8',
          postTitle: top.title || 'Post',
        })
      }
    }
    users.push({
      id: row.id,
      label: row.label,
      platform: row.platform,
      engaged: engagedPosts > 0 || (channelKinds?.size || 0) > 0,
      weight: interactionWeight([...allKinds]) + engagedPosts,
      interactionCount: allKinds.size + engagedPosts,
      postIds: [...row.kindsByPost.keys()].filter((id) => id !== '__channel__'),
      kinds: [...allKinds],
    })
  }

  users.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))

  const videos = posts.map((p) => {
    const votes = getVotes(p.id)
    const views = getViews(p.id) || p.views || 0
    const linkCount = links.filter((l) => l.contentId === p.id && !l.soft).length
    const weight = Math.max(1, views * 0.15 + (votes.up || 0) * 3 + linkCount * 2)
    return {
      id: p.id,
      title: p.title || 'Untitled',
      type: p.type || 'short',
      views,
      likes: votes.up || 0,
      weight,
      interactors: linkCount,
    }
  }).sort((a, b) => b.weight - a.weight)

  return {
    users,
    videos,
    links,
    totals: {
      platformUsers: users.length,
      engagedUsers: users.filter((u) => u.engaged).length,
      posts: videos.length,
      interactions: links.filter((l) => !l.soft).length,
    },
  }
}

/**
 * Pack nodes on a ring (holders-map style).
 */
export function layoutBubbleRing(nodes, { cx, cy, radius, minR = 10, maxR = 36 } = {}) {
  const list = Array.isArray(nodes) ? nodes : []
  if (!list.length) return []
  const maxW = Math.max(1, ...list.map((n) => Number(n.weight) || 1))
  const n = list.length
  const ring = Math.max(radius * 0.55, radius - Math.min(maxR, 28) * Math.min(1.4, n / 18))
  return list.map((node, i) => {
    const t = n === 1 ? 0 : i / n
    const angle = t * Math.PI * 2 - Math.PI / 2
    const w = Number(node.weight) || 1
    const r = minR + (maxR - minR) * Math.sqrt(w / maxW)
    return {
      ...node,
      x: cx + Math.cos(angle) * ring,
      y: cy + Math.sin(angle) * ring,
      r,
      angle,
    }
  })
}

export function layoutInnerVideos(videos, { cx, cy, radius = 72, minR = 14, maxR = 28 } = {}) {
  return layoutBubbleRing(videos, { cx, cy, radius, minR, maxR })
}
