/**
 * Clips Rank — High-Precision Recommended Feed Algorithm
 * Inspired by classic TikTok For You Page architecture:
 *
 * 1. Seed Multi-Tier Testing Loop:
 *    Every new video enters an initial testing pool (Seed tier: 200-300 impressions).
 *    Graduation through expanding cohorts (Seed -> Tier 1 -> Tier 2 -> Viral/Global)
 *    strictly based on real engagement performance, never follower size.
 *
 * 2. High-Intent Positive Signal Hierarchy:
 *    - Full Watch Completion (Weight: 0.40)
 *    - Rewatch / Loop Multiplier (Weight: 0.22)
 *    - External Share Rate (Weight: 0.16)
 *    - Save / Bookmark Rate (Weight: 0.10)
 *    - Active Comments (Weight: 0.08)
 *    - Upvotes / Likes (Weight: 0.04)
 *
 * 3. Aggressive Negative Early-Skip Suppression:
 *    Swiping/skipping in < 2 seconds or < 15% watch ratio triggers a heavy
 *    penalty decay that stops low-retention videos from polluting the feed.
 *
 * 4. Multi-Armed Bandit Exploration + Anti-Echo Fatigue:
 *    - Exploration slots (12-18% epsilon-greedy) discover emerging niches.
 *    - Creator and tag repetition fatigue prevents spamming the same author or topic.
 *    - Freshness decay half-life ensures continuous stream of lively content.
 *
 * 5. Per-User Real-Time Adaptive Taste Profile:
 *    Weights and affinities dynamically update on every swipe, complete, like, share, and skip.
 */
import { lsGet, lsSet } from './storage'
import { getVotes, getViews } from './engagement'

export const PRIOR_WEIGHTS = {
  completion: 0.40,
  loops: 0.22,
  shares: 0.16,
  saves: 0.10,
  comments: 0.08,
  likes: 0.04,
  session: 0.05,
}

export const EARLY_SKIP_THRESHOLD = 0.15
export const LEARNING_RATE = 0.09
export const EXPLORATION_RATE = 0.15
export const FRESHNESS_HALF_LIFE_H = 36

export function createEmptyTaste() {
  return {
    signalAffinity: { ...PRIOR_WEIGHTS },
    tagAffinity: {},
    platformAffinity: {},
    creatorAffinity: {},
    recentPositiveIds: [],
    recentNegativeIds: [],
    recentViewedCreatorIds: [],
    sessions: 0,
    totalInteractions: 0,
  }
}

export function loadTaste(userId = 'anon') {
  const all = lsGet('taste_profiles', {})
  return all[userId] || createEmptyTaste()
}

export function saveTaste(userId, taste) {
  const all = lsGet('taste_profiles', {})
  all[userId] = taste
  lsSet('taste_profiles', all)
}

function normalizeWeights(w) {
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1
  const out = {}
  for (const k of Object.keys(w)) out[k] = w[k] / sum
  return out
}

function adaptSignalWeights(affinity, observed) {
  const next = { ...affinity }
  for (const [key, strength] of Object.entries(observed)) {
    if (next[key] == null) continue
    next[key] = Math.max(0.015, next[key] + LEARNING_RATE * strength)
  }
  return normalizeWeights(next)
}

/**
 * Record real-time user action on a video/clip
 */
export function recordInteraction(userId, event) {
  if (!userId || !event?.contentId) return loadTaste(userId || 'anon')
  const taste = loadTaste(userId)
  taste.totalInteractions += 1

  const observed = { completion: 0, loops: 0, shares: 0, saves: 0, comments: 0, likes: 0, session: 0 }
  const positive = ['complete', 'loop', 'share', 'save', 'comment', 'like', 'upvote']
  const isPositive = positive.includes(event.type)

  switch (event.type) {
    case 'complete':
      observed.completion = (event.watchRatio ?? 1) * 1.35
      observed.session = 0.45
      break
    case 'loop':
      observed.loops = 1.8
      observed.completion = 1.0
      break
    case 'share':
      observed.shares = 2.2
      break
    case 'save':
      observed.saves = 1.6
      break
    case 'comment':
      observed.comments = 1.4
      break
    case 'like':
    case 'upvote':
      observed.likes = 0.65
      break
    case 'downvote':
      observed.completion = -1.2
      break
    case 'early_skip':
      observed.completion = -1.8
      observed.loops = -0.6
      break
    case 'skip':
      observed.completion = -0.7
      break
    default:
      break
  }

  taste.signalAffinity = adaptSignalWeights(taste.signalAffinity, observed)

  const tagDelta = isPositive ? LEARNING_RATE * 1.3 : -LEARNING_RATE * 1.0
  for (const tag of event.tags || []) {
    taste.tagAffinity[tag] = (taste.tagAffinity[tag] || 0) + tagDelta
  }

  if (event.platform) {
    taste.platformAffinity[event.platform] =
      (taste.platformAffinity[event.platform] || 0) + (isPositive ? LEARNING_RATE : -LEARNING_RATE * 0.6)
  }

  if (event.creatorId) {
    taste.creatorAffinity[event.creatorId] =
      (taste.creatorAffinity[event.creatorId] || 0) + (isPositive ? LEARNING_RATE * 0.9 : -LEARNING_RATE * 0.5)
    taste.recentViewedCreatorIds = [
      event.creatorId,
      ...(taste.recentViewedCreatorIds || []).filter((id) => id !== event.creatorId),
    ].slice(0, 15)
  }

  if (isPositive) {
    taste.recentPositiveIds = [
      event.contentId,
      ...taste.recentPositiveIds.filter((id) => id !== event.contentId),
    ].slice(0, 60)
    taste.recentNegativeIds = taste.recentNegativeIds.filter((id) => id !== event.contentId)
  } else if (event.type === 'early_skip' || event.type === 'skip' || event.type === 'downvote') {
    taste.recentNegativeIds = [
      event.contentId,
      ...taste.recentNegativeIds.filter((id) => id !== event.contentId),
    ].slice(0, 60)
  }

  saveTaste(userId, taste)
  bumpCatalogEngagement(event.contentId, event.type)

  appendWatchHistory(userId, {
    contentId: event.contentId,
    type: event.type,
    watchRatio: event.watchRatio,
    title: event.title,
    at: new Date().toISOString(),
  })

  return taste
}

export function startSession(userId) {
  const taste = loadTaste(userId)
  taste.sessions += 1
  saveTaste(userId, taste)
  return taste
}

const HIST_KEY = 'clips_watch_history'
const HIST_PREF_KEY = 'clips_watch_history_enabled'

export function isWatchHistoryEnabled() {
  return lsGet(HIST_PREF_KEY, true) !== false
}

export function setWatchHistoryEnabled(on) {
  lsSet(HIST_PREF_KEY, !!on)
}

export function appendWatchHistory(userId, row) {
  if (!isWatchHistoryEnabled() || !userId) return
  const all = lsGet(HIST_KEY, {})
  const list = all[userId] || []
  all[userId] = [{ id: `wh_${Date.now()}`, ...row }, ...list.filter((x) => x.contentId !== row.contentId)].slice(0, 200)
  lsSet(HIST_KEY, all)
}

export function getWatchHistory(userId) {
  if (!userId) return []
  return (lsGet(HIST_KEY, {})[userId] || [])
}

export function clearWatchHistory(userId) {
  if (!userId) return
  const all = lsGet(HIST_KEY, {})
  all[userId] = []
  lsSet(HIST_KEY, all)
}

/**
 * Quality Score calculation based on genuine completion rate, loop ratios, shares, and early skips.
 * Follower counts are NEVER a factor.
 */
export function computeContentQuality(engagement = {}, options = {}) {
  const {
    completionRate = 0, loops = 0, shares = 0, comments = 0, saves = 0, earlySkips = 0, likes = 0, upvotes = 0, downvotes = 0,
  } = engagement
  const isOriginal = options.isOriginal !== false

  const effectiveLikes = (likes || 0) + (upvotes || 0) - (downvotes || 0) * 1.5

  let score =
    Math.min(completionRate, 1) * 46 +
    Math.min(loops, 6) * 9 +
    Math.min(shares / 300, 20) +
    Math.min((comments + saves) / 250, 14) +
    Math.max(0, Math.min(effectiveLikes / 3000, 6))

  if (isOriginal) score += 4

  if (earlySkips > EARLY_SKIP_THRESHOLD) {
    score -= (earlySkips - EARLY_SKIP_THRESHOLD) * 95
  }

  return Math.max(0, Math.round(score * 10) / 10)
}

/**
 * TikTok Multi-Tier Testing Cohorts
 * Every video starts in Seed tier regardless of who posted it.
 */
export function getDistributionTier(quality, views = 0) {
  if (views < 300 || quality < 28) return { name: 'Seed', size: 300, minQuality: 0 }
  if (views < 3000 || quality < 45) return { name: 'Tier 1', size: 3000, minQuality: 35 }
  if (views < 30000 || quality < 58) return { name: 'Tier 2', size: 30000, minQuality: 48 }
  if (quality >= 68) return { name: 'Viral', size: 500000, minQuality: 68 }
  return { name: 'Global', size: 100000, minQuality: 58 }
}

export function computeVelocity(engagement = {}, ageHours = 24) {
  const { completionRate = 0, loops = 0, shares = 0, earlySkips = 0 } = engagement
  const safeAge = Math.max(ageHours, 0.5)
  let v = (completionRate * 45 + Math.min(loops, 4) * 15 + Math.min(shares / 60, 24)) / safeAge
  if (earlySkips > 0.2) v *= 0.22
  return Math.round(v * 100) / 100
}

export function shouldGraduate(quality, velocity, tierName) {
  if (tierName === 'Seed' && quality >= 35 && velocity >= 1.0) return true
  if (tierName === 'Tier 1' && quality >= 48 && velocity >= 0.8) return true
  if (tierName === 'Tier 2' && quality >= 60 && velocity >= 0.5) return true
  return false
}

/**
 * Calculate user affinity with topic tags, platform, and creator
 */
function affinityForContent(taste, content) {
  let a = 1
  const tags = content.tags || []
  if (tags.length) {
    let tagSum = 0
    for (const t of tags) tagSum += taste.tagAffinity[t] || 0
    a += tagSum / tags.length
  }
  if (content.platform && taste.platformAffinity[content.platform]) {
    a += taste.platformAffinity[content.platform] * 0.5
  }
  const cid = content.creatorId || content.userId
  if (cid && taste.creatorAffinity[cid]) {
    a += taste.creatorAffinity[cid] * 0.7
  }
  if (taste.recentNegativeIds.includes(content.id)) a *= 0.20
  if (taste.recentPositiveIds.includes(content.id)) a *= 0.50

  // Creator repetition fatigue
  if (cid && (taste.recentViewedCreatorIds || []).includes(cid)) {
    const idx = taste.recentViewedCreatorIds.indexOf(cid)
    if (idx === 0) a *= 0.45 // Just saw this creator
    else if (idx < 3) a *= 0.75
  }

  return Math.max(0.05, a)
}

function freshnessBoost(content) {
  const ts = content.createdAt || content.importedAt || content.at
  if (!ts) return 1
  const ageH = Math.max(0.1, (Date.now() - new Date(ts).getTime()) / 3600000)
  return 0.50 + 0.50 * Math.exp(-ageH / FRESHNESS_HALF_LIFE_H)
}

/**
 * Full TikTok For You Ranker
 * Combines Quality (40%), Satisfaction (25%), Affinity (20%), Velocity (10%), Freshness (5%)
 * with Multi-Armed Bandit Exploration and Topic Diversity.
 */
export function rankForUser(shorts = [], userId = 'anon') {
  const taste = loadTaste(userId)
  const weights = taste.signalAffinity || PRIOR_WEIGHTS

  const scored = (shorts || []).map((item, index) => {
    const eng = { ...item.engagement }

    // Overlay real engagement votes and views if present
    const itemVotes = getVotes(item.id)
    const itemViews = getViews(item.id)
    if (itemVotes) {
      eng.upvotes = itemVotes.up
      eng.downvotes = itemVotes.down
      eng.likes = Math.max(eng.likes || 0, itemVotes.up)
    }
    if (itemViews) {
      eng.views = Math.max(eng.views || 0, itemViews)
    }

    const quality =
      item.qualityScore != null
        ? item.qualityScore
        : computeContentQuality(eng, { isOriginal: item.isOriginal !== false && !item.crossPostSuspect })

    const aff = affinityForContent(taste, item)
    const vel = computeVelocity(eng, item.ageHours || 12)
    const fresh = freshnessBoost(item)

    const sat =
      (weights.completion || 0.40) * Math.min(eng.completionRate || 0, 1) * 100 +
      (weights.loops || 0.22) * Math.min(eng.loops || 0, 5) * 12 +
      (weights.shares || 0.16) * Math.min((eng.shares || 0) / 40, 1) * 22 +
      (weights.comments || 0.08) * Math.min((eng.comments || 0) / 30, 1) * 12 +
      (weights.saves || 0.10) * Math.min((eng.saves || 0) / 25, 1) * 15 +
      (weights.likes || 0.04) * Math.min((eng.likes || 0) / 150, 1) * 8

    let score = quality * 0.40 + sat * 0.25 + aff * 24 + vel * 9 + fresh * 12

    const views = Number(eng.views || itemViews || 0)
    const ageH = Math.max(0.1, (Date.now() - new Date(item.createdAt || item.publishedAt || 0).getTime()) / 3600000)
    if (views < 40 && ageH < 168) {
      score += 16 * fresh
    }

    const samples = (eng.completes || 0) + (eng.skips || 0) + (eng.earlySkips || 0)
    if (samples >= 6) {
      score -= ((eng.earlySkips || 0) / samples) * 36
    }

    // Session-stable exploration — does not reshuffle on every render
    const explore = explorationRoll(userId, item.id)
    if (explore < EXPLORATION_RATE) score += 12 + explore * 8

    score += (index % 7) * 0.01

    return { item, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Anti-Clustering Diversity Pass:
  // Ensure no more than 2 consecutive videos from the same creator in recommended feed
  const diversified = []
  const deferred = []

  for (const { item } of scored) {
    const cid = item.creatorId || item.userId || item.handle
    const lastTwo = diversified.slice(-2).map((x) => x.creatorId || x.userId || x.handle)
    if (cid && lastTwo.length === 2 && lastTwo[0] === cid && lastTwo[1] === cid) {
      deferred.push(item)
    } else {
      diversified.push(item)
    }
  }

  return [...diversified, ...deferred]
}

export function rankAnonymous(shorts = []) {
  return rankForUser(shorts, 'anon')
}

const TREND_KEY = 'clips_search_trends'

export function recordSearchQuery(q) {
  const query = String(q || '').trim().toLowerCase().slice(0, 64)
  if (query.length < 2) return
  const trends = lsGet(TREND_KEY, {})
  trends[query] = (trends[query] || 0) + 1
  lsSet(TREND_KEY, trends)
}

export function getTrendingSearches(limit = 8) {
  const trends = lsGet(TREND_KEY, {})
  const ranked = Object.entries(trends)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([q, count]) => ({ query: q, count }))
  return ranked.slice(0, limit)
}

function explorationRoll(userId, contentId) {
  const salt = typeof window !== 'undefined'
    ? (window.__clipsExploreSalt || (window.__clipsExploreSalt = Date.now()))
    : 1
  const s = `${userId}|${contentId}|${salt}`
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

function bumpCatalogEngagement(contentId, type) {
  if (!contentId || !type) return
  const list = lsGet('imports', []) || []
  const row = list.find((x) => x?.id === contentId)
  if (!row) return
  const eng = { ...(row.engagement || {}) }
  if (type === 'complete') eng.completes = (eng.completes || 0) + 1
  else if (type === 'loop') eng.loops = (eng.loops || 0) + 1
  else if (type === 'share') eng.shares = (eng.shares || 0) + 1
  else if (type === 'save') eng.saves = (eng.saves || 0) + 1
  else if (type === 'comment') eng.comments = (eng.comments || 0) + 1
  else if (type === 'like' || type === 'upvote') eng.likes = (eng.likes || 0) + 1
  else if (type === 'early_skip') eng.earlySkips = (eng.earlySkips || 0) + 1
  else if (type === 'skip') eng.skips = (eng.skips || 0) + 1
  else return
  const watches = (eng.completes || 0) + (eng.skips || 0) + (eng.earlySkips || 0)
  if (watches) eng.completionRate = (eng.completes || 0) / watches
  row.engagement = eng
  lsSet('imports', list)
}

export function suggestSearches(prefix = '', limit = 6) {
  const p = String(prefix || '').toLowerCase().trim()
  const trends = getTrendingSearches(30)
  if (!p) return trends.slice(0, limit)
  return trends.filter((t) => t.query.includes(p)).slice(0, limit)
}

export const ALGORITHM_NOTES = [
  'Completion rate (40%) & rewatch loops (22%) outweigh likes',
  'No follower-count ranking boost — seed cohort testing for all',
  'Aggressive early-skip suppression (< 2s or < 15% watch)',
  'Anti-clustering creator diversity + exploration slots',
  'Real-time adaptive taste profile on every interaction',
]
