/**
 * Clips Discovery Engine — learning machine (early-TikTok style)
 *
 * Research basis:
 * - TikTok optimizes for retention + time spent, not likes.
 * - Strongest signals are implicit: watch completion, rewatches, early skips.
 * - Every interaction updates a user taste fingerprint.
 * - Content is seed-tested then expanded by engagement velocity.
 * - Follower count is never a ranking factor.
 * - Weights are not fixed globally; they adapt to what each user responds to.
 *
 * Architecture (MVP, client-side):
 * 1. UserTasteProfile  — learns from local interactions, persisted in localStorage
 * 2. Content velocity  — global seed → tier graduation (meritocratic)
 * 3. Personalized rank — content quality × user affinity (adaptive weights)
 * 4. Feedback loop     — recordInteraction() updates taste after every signal
 */

import { lsGet, lsSet } from './storage'

const PRIOR_WEIGHTS = {
  completion: 0.40,
  loops: 0.25,
  shares: 0.15,
  saves: 0.08,
  comments: 0.07,
  likes: 0.05,
}

const EARLY_SKIP_THRESHOLD = 0.12
const LEARNING_RATE = 0.08
const EXPLORATION_RATE = 0.12

export function createEmptyTaste() {
  return {
    signalAffinity: { ...PRIOR_WEIGHTS },
    tagAffinity: {},
    platformAffinity: {},
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
    next[key] = Math.max(0.02, next[key] + LEARNING_RATE * strength)
  }
  return normalizeWeights(next)
}

/**
 * Record a single interaction and update the user's taste profile.
 * Call after every watch / skip / share / like — this is the learning step.
 */
export function recordInteraction(userId, event) {
  const taste = loadTaste(userId)
  taste.totalInteractions += 1

  const observed = {
    completion: 0,
    loops: 0,
    shares: 0,
    saves: 0,
    comments: 0,
    likes: 0,
  }

  const positive = ['complete', 'loop', 'share', 'save', 'comment', 'like']
  const isPositive = positive.includes(event.type)

  switch (event.type) {
    case 'complete':
      observed.completion = (event.watchRatio ?? 1) * 1.2
      break
    case 'loop':
      observed.loops = 1.5
      observed.completion = 0.8
      break
    case 'share':
      observed.shares = 2.0
      break
    case 'save':
      observed.saves = 1.5
      break
    case 'comment':
      observed.comments = 1.2
      break
    case 'like':
      observed.likes = 0.6
      break
    case 'early_skip':
      observed.completion = -1.5
      observed.loops = -0.5
      break
    case 'skip':
      observed.completion = -0.6
      break
    default:
      break
  }

  taste.signalAffinity = adaptSignalWeights(taste.signalAffinity, observed)

  const tagDelta = isPositive ? LEARNING_RATE * 1.2 : -LEARNING_RATE * 0.8
  for (const tag of event.tags || []) {
    taste.tagAffinity[tag] = (taste.tagAffinity[tag] || 0) + tagDelta
  }
  if (event.platform) {
    const pDelta = isPositive ? LEARNING_RATE : -LEARNING_RATE * 0.5
    taste.platformAffinity[event.platform] =
      (taste.platformAffinity[event.platform] || 0) + pDelta
  }

  if (isPositive) {
    taste.recentPositiveIds = [event.contentId, ...taste.recentPositiveIds.filter((id) => id !== event.contentId)].slice(0, 40)
    taste.recentNegativeIds = taste.recentNegativeIds.filter((id) => id !== event.contentId)
  } else if (event.type === 'early_skip' || event.type === 'skip') {
    taste.recentNegativeIds = [event.contentId, ...taste.recentNegativeIds.filter((id) => id !== event.contentId)].slice(0, 40)
  }

  saveTaste(userId, taste)
  return taste
}

export function startSession(userId) {
  const taste = loadTaste(userId)
  taste.sessions += 1
  saveTaste(userId, taste)
  return taste
}

export function computeContentQuality(engagement = {}, options = {}) {
  const {
    completionRate = 0,
    loops = 0,
    shares = 0,
    comments = 0,
    saves = 0,
    earlySkips = 0,
    likes = 0,
  } = engagement

  const isOriginal = options.isOriginal !== false

  let score =
    Math.min(completionRate, 1) * 42 +
    Math.min(loops, 6) * 8 +
    Math.min(shares / 500, 20) +
    Math.min((comments + saves) / 300, 12) +
    Math.min(likes / 4000, 8)

  if (isOriginal) score += 3

  if (earlySkips > EARLY_SKIP_THRESHOLD) {
    score -= (earlySkips - EARLY_SKIP_THRESHOLD) * 80
  }

  return Math.max(0, Math.round(score * 10) / 10)
}

export function getDistributionTier(quality, views = 0) {
  if (views < 300 || quality < 28) {
    return { name: 'Seed', size: 200, description: 'Micro-test cohort' }
  }
  if (views < 3000 || quality < 42) {
    return { name: 'Tier 1', size: 2000, description: 'Expanded test' }
  }
  if (views < 30000 || quality < 55) {
    return { name: 'Tier 2', size: 20000, description: 'Interest pool' }
  }
  if (quality >= 65) {
    return { name: 'Viral', size: 500000, description: 'Global discovery' }
  }
  return { name: 'Global', size: 100000, description: 'Broad feed' }
}

export function computeVelocity(engagement = {}, ageHours = 24) {
  const { completionRate = 0, loops = 0, shares = 0, earlySkips = 0 } = engagement
  const safeAge = Math.max(ageHours, 0.5)
  let v =
    (completionRate * 40 + Math.min(loops, 4) * 15 + Math.min(shares / 100, 20)) / safeAge
  if (earlySkips > 0.2) v *= 0.3
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
  if (content.platform || content.crossPost?.platform) {
    const p = content.platform || content.crossPost.platform
    a += (taste.platformAffinity[p] || 0) * 0.5
  }
  if (taste.recentNegativeIds.includes(content.id)) a *= 0.4
  if (taste.recentPositiveIds.length && tags[0]) a += 0.15
  return Math.max(0.15, a)
}

export function scoreForUser(content, taste) {
  const isOriginal = content.crossPost?.isCrossPost !== true
  const quality = computeContentQuality(content.engagement, { isOriginal })
  const w = taste.signalAffinity || PRIOR_WEIGHTS
  const e = content.engagement || {}
  const personalizedEngagement =
    (e.completionRate || 0) * (w.completion || 0.4) * 100 +
    Math.min(e.loops || 0, 6) * 15 * (w.loops || 0.25) +
    Math.min((e.shares || 0) / 400, 25) * (w.shares || 0.15) +
    Math.min(((e.saves || 0) + (e.comments || 0)) / 200, 20) * ((w.saves || 0.08) + (w.comments || 0.07)) +
    Math.min((e.likes || 0) / 3000, 15) * (w.likes || 0.05)

  const affinity = affinityForContent(taste, content)
  const score = (quality * 0.55 + personalizedEngagement * 0.45) * affinity
  const exploreBoost =
    Math.random() < EXPLORATION_RATE && affinity < 1.1 ? 1 + Math.random() * 0.25 : 1
  return Math.round(score * exploreBoost * 10) / 10
}

export function rankForUser(shorts = [], userId = 'anon') {
  const taste = loadTaste(userId)
  return [...shorts]
    .map((s) => {
      const isOriginal = s.crossPost?.isCrossPost !== true
      const quality = computeContentQuality(s.engagement, { isOriginal })
      const tier = getDistributionTier(quality, s.views || 0)
      const ageHours = s.publishedAt
        ? (Date.now() - new Date(s.publishedAt).getTime()) / 3600000
        : 24
      const velocity = computeVelocity(s.engagement, ageHours)
      const score = scoreForUser(s, taste)
      return { ...s, score, quality, tier, velocity, isOriginal }
    })
    .sort((a, b) => b.score - a.score || b.velocity - a.velocity)
}

export function rankShorts(shorts = []) {
  return rankForUser(shorts, 'anon')
}

export function computeEngagementScore(engagement, options) {
  return computeContentQuality(engagement, options)
}

export const ALGORITHM_META = {
  name: 'Clips Discovery (learning machine)',
  style: 'early-TikTok',
  principles: [
    'Every swipe trains a personal taste profile (completion, loops, skips, shares)',
    'Signal weights adapt per user — not a fixed global formula',
    'Implicit behavior (watch & rewatch) outweighs explicit likes',
    'Follower count is never a ranking signal',
    'New content is seed-tested then graduated by engagement velocity',
    'Exploration keeps the feed fun; pure exploitation is avoided',
    'Cross-posts are allowed but do not receive an originality boost',
  ],
}
