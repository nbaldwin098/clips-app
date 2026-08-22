/**
 * Clips Rank — Recommended + Clips discovery
 * TikTok: completion/rewatch/shares, seed expansion, no follower boost
 * YouTube: personalization, retention/satisfaction, separate search
 * Twitch/Kick: velocity + returning affinity without bury-by-size
 * Clips: adaptive per-user weights + exploration + freshness
 */
import { lsGet, lsSet } from './storage'

const PRIOR_WEIGHTS = {
  completion: 0.38,
  loops: 0.22,
  shares: 0.16,
  saves: 0.08,
  comments: 0.09,
  likes: 0.04,
  session: 0.03,
}

const EARLY_SKIP_THRESHOLD = 0.12
const LEARNING_RATE = 0.09
const EXPLORATION_RATE = 0.14
const FRESHNESS_HALF_LIFE_H = 36

export function createEmptyTaste() {
  return {
    signalAffinity: { ...PRIOR_WEIGHTS },
    tagAffinity: {},
    platformAffinity: {},
    creatorAffinity: {},
    recentPositiveIds: [],
    recentNegativeIds: [],
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

export function recordInteraction(userId, event) {
  if (!userId || !event?.contentId) return loadTaste(userId || 'anon')
  const taste = loadTaste(userId)
  taste.totalInteractions += 1
  const observed = { completion: 0, loops: 0, shares: 0, saves: 0, comments: 0, likes: 0, session: 0 }
  const positive = ['complete', 'loop', 'share', 'save', 'comment', 'like']
  const isPositive = positive.includes(event.type)
  switch (event.type) {
    case 'complete':
      observed.completion = (event.watchRatio ?? 1) * 1.25
      observed.session = 0.4
      break
    case 'loop':
      observed.loops = 1.6
      observed.completion = 0.85
      break
    case 'share':
      observed.shares = 2.1
      break
    case 'save':
      observed.saves = 1.5
      break
    case 'comment':
      observed.comments = 1.3
      break
    case 'like':
      observed.likes = 0.55
      break
    case 'early_skip':
      observed.completion = -1.6
      observed.loops = -0.5
      break
    case 'skip':
      observed.completion = -0.65
      break
    default:
      break
  }
  taste.signalAffinity = adaptSignalWeights(taste.signalAffinity, observed)
  const tagDelta = isPositive ? LEARNING_RATE * 1.25 : -LEARNING_RATE * 0.9
  for (const tag of event.tags || []) {
    taste.tagAffinity[tag] = (taste.tagAffinity[tag] || 0) + tagDelta
  }
  if (event.platform) {
    taste.platformAffinity[event.platform] =
      (taste.platformAffinity[event.platform] || 0) + (isPositive ? LEARNING_RATE : -LEARNING_RATE * 0.5)
  }
  if (event.creatorId) {
    taste.creatorAffinity[event.creatorId] =
      (taste.creatorAffinity[event.creatorId] || 0) + (isPositive ? LEARNING_RATE * 0.8 : -LEARNING_RATE * 0.4)
  }
  if (isPositive) {
    taste.recentPositiveIds = [event.contentId, ...taste.recentPositiveIds.filter((id) => id !== event.contentId)].slice(0, 50)
    taste.recentNegativeIds = taste.recentNegativeIds.filter((id) => id !== event.contentId)
  } else if (event.type === 'early_skip' || event.type === 'skip') {
    taste.recentNegativeIds = [event.contentId, ...taste.recentNegativeIds.filter((id) => id !== event.contentId)].slice(0, 50)
  }
  saveTaste(userId, taste)
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

export function computeContentQuality(engagement = {}, options = {}) {
  const {
    completionRate = 0, loops = 0, shares = 0, comments = 0, saves = 0, earlySkips = 0, likes = 0,
  } = engagement
  const isOriginal = options.isOriginal !== false
  let score =
    Math.min(completionRate, 1) * 44 +
    Math.min(loops, 6) * 8 +
    Math.min(shares / 400, 18) +
    Math.min((comments + saves) / 280, 12) +
    Math.min(likes / 5000, 6)
  if (isOriginal) score += 4
  if (earlySkips > EARLY_SKIP_THRESHOLD) score -= (earlySkips - EARLY_SKIP_THRESHOLD) * 85
  return Math.max(0, Math.round(score * 10) / 10)
}

export function getDistributionTier(quality, views = 0) {
  if (views < 300 || quality < 28) return { name: 'Seed', size: 200 }
  if (views < 3000 || quality < 42) return { name: 'Tier 1', size: 2000 }
  if (views < 30000 || quality < 55) return { name: 'Tier 2', size: 20000 }
  if (quality >= 65) return { name: 'Viral', size: 500000 }
  return { name: 'Global', size: 100000 }
}

export function computeVelocity(engagement = {}, ageHours = 24) {
  const { completionRate = 0, loops = 0, shares = 0, earlySkips = 0 } = engagement
  const safeAge = Math.max(ageHours, 0.5)
  let v = (completionRate * 42 + Math.min(loops, 4) * 14 + Math.min(shares / 80, 22)) / safeAge
  if (earlySkips > 0.2) v *= 0.28
  return Math.round(v * 100) / 100
}

export function shouldGraduate(quality, velocity, tierName) {
  if (tierName === 'Seed' && quality >= 35 && velocity >= 1.0) return true
  if (tierName === 'Tier 1' && quality >= 48 && velocity >= 0.8) return true
  if (tierName === 'Tier 2' && quality >= 58 && velocity >= 0.5) return true
  return false
}

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
  if (cid && taste.creatorAffinity[cid]) a += taste.creatorAffinity[cid] * 0.6
  if (taste.recentNegativeIds.includes(content.id)) a *= 0.25
  if (taste.recentPositiveIds.includes(content.id)) a *= 0.55
  return Math.max(0.05, a)
}

function freshnessBoost(content) {
  const ts = content.createdAt || content.importedAt || content.at
  if (!ts) return 1
  const ageH = Math.max(0.1, (Date.now() - new Date(ts).getTime()) / 3600000)
  return 0.55 + 0.45 * Math.exp(-ageH / FRESHNESS_HALF_LIFE_H)
}

export function rankForUser(shorts = [], userId = 'anon') {
  const taste = loadTaste(userId)
  const weights = taste.signalAffinity || PRIOR_WEIGHTS
  const scored = (shorts || []).map((item, index) => {
    const eng = item.engagement || {}
    const quality =
      item.qualityScore != null
        ? item.qualityScore
        : computeContentQuality(eng, { isOriginal: item.isOriginal !== false && !item.crossPostSuspect })
    const aff = affinityForContent(taste, item)
    const vel = computeVelocity(eng, item.ageHours || 12)
    const fresh = freshnessBoost(item)
    const sat =
      (weights.completion || 0.38) * Math.min(eng.completionRate || 0, 1) * 100 +
      (weights.loops || 0.22) * Math.min(eng.loops || 0, 5) * 12 +
      (weights.shares || 0.16) * Math.min((eng.shares || 0) / 50, 1) * 20 +
      (weights.comments || 0.09) * Math.min((eng.comments || 0) / 40, 1) * 12 +
      (weights.likes || 0.04) * Math.min((eng.likes || 0) / 200, 1) * 8
    let score = quality * 0.35 + sat * 0.25 + aff * 22 + vel * 8 + fresh * 15
    if (Math.random() < EXPLORATION_RATE) score += 8 + Math.random() * 12
    score += (index % 7) * 0.01
    return { item, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.item)
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
  if (ranked.length < 4) {
    for (const s of ['valorant', 'clips', 'live', 'tutorial', 'comedy', 'music', 'gaming', 'irl']) {
      if (!ranked.find((r) => r.query === s)) ranked.push({ query: s, count: 0 })
    }
  }
  return ranked.slice(0, limit)
}

export function suggestSearches(prefix = '', limit = 6) {
  const p = String(prefix || '').toLowerCase().trim()
  const trends = getTrendingSearches(30)
  if (!p) return trends.slice(0, limit)
  return trends.filter((t) => t.query.includes(p)).slice(0, limit)
}

export const ALGORITHM_NOTES = [
  'Completion & rewatch outweigh likes',
  'No follower-count ranking boost',
  'Per-user adaptive weights + exploration',
  'Freshness + velocity for new creators',
  'Search is user-led; trending assists',
]
