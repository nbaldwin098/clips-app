/**
 * Early-TikTok style meritocratic discovery engine.
 *
 * Design goals (pre-corporate TikTok era):
 * - Rank purely on real-time engagement velocity.
 * - Zero weight for follower count or account age.
 * - Heavy emphasis on completion, rewatches, and shares (what people actually watch and pass on).
 * - Immediate suppression of content people abandon in the first 1–2 seconds.
 * - Seed micro-tests → automatic tier graduation on velocity.
 * - Originality bonus when cross-post detectors find no external source fingerprint.
 * - Keep the feed fun: reward hypnotic loops and social proof, not vanity metrics.
 */

const WEIGHTS = {
  completionRate: 0.38,   // strongest signal of quality
  loops: 0.27,            // rewatches = hypnotic / viral value
  shares: 0.16,           // social value
  commentsAndSaves: 0.11, // medium signal
  likes: 0.05,            // weak / easy signal
  originality: 0.03,      // small boost for non-cross-posted content
}

const EARLY_SKIP_PENALTY = -35
const EARLY_SKIP_THRESHOLD = 0.12 // 12%+ early abandon starts heavy docking

/**
 * Compute live engagement score.
 * Higher = stronger retention and social value.
 */
export function computeEngagementScore(engagement = {}, options = {}) {
  const {
    completionRate = 0,
    loops = 0,
    shares = 0,
    comments = 0,
    saves = 0,
    earlySkips = 0,
    likes = 0,
  } = engagement

  const isOriginal = options.isOriginal !== false // default true unless detector flags cross-post

  // Normalize contributions to a practical 0–100+ scale
  const completionPts = Math.min(completionRate, 1) * 100 * WEIGHTS.completionRate
  const loopPts = Math.min(loops, 6) * 18 * WEIGHTS.loops
  const sharePts = Math.min(shares / 800, 55) * WEIGHTS.shares
  const commentSavePts = Math.min((comments + saves) / 400, 45) * WEIGHTS.commentsAndSaves
  const likePts = Math.min(likes / 6000, 25) * WEIGHTS.likes
  const originalityPts = isOriginal ? 100 * WEIGHTS.originality : 0

  let score = completionPts + loopPts + sharePts + commentSavePts + likePts + originalityPts

  // Heavy, immediate penalty for early abandonment (dead content dies fast)
  if (earlySkips > EARLY_SKIP_THRESHOLD) {
    const excess = earlySkips - EARLY_SKIP_THRESHOLD
    score += EARLY_SKIP_PENALTY * excess * 6
  }

  return Math.max(0, Math.round(score * 10) / 10)
}

/**
 * Distribution tier ladder.
 * New content starts in a small seed pool; strong velocity graduates it.
 * Follower count is never consulted.
 */
export function getDistributionTier(score, views = 0) {
  if (views < 300 || score < 35) {
    return { name: 'Seed', size: 200, description: 'Micro-test cohort' }
  }
  if (views < 3000 || score < 50) {
    return { name: 'Tier 1', size: 2000, description: 'Expanded test' }
  }
  if (views < 30000 || score < 65) {
    return { name: 'Tier 2', size: 20000, description: 'Regional / interest pool' }
  }
  if (score >= 75) {
    return { name: 'Viral', size: 500000, description: 'Global discovery' }
  }
  return { name: 'Global', size: 100000, description: 'Broad feed' }
}

/**
 * Velocity score used for real-time promotion decisions.
 * Emphasizes recent completion and loop rate over lifetime totals.
 */
export function computeVelocity(engagement = {}, ageHours = 24) {
  const {
    completionRate = 0,
    loops = 0,
    shares = 0,
    earlySkips = 0,
  } = engagement

  const safeAge = Math.max(ageHours, 0.5)
  const velocity =
    (completionRate * 40 + Math.min(loops, 4) * 15 + Math.min(shares / 100, 20)) /
    safeAge

  // Early skip kills velocity hard
  if (earlySkips > 0.2) return Math.max(0, velocity * 0.3)

  return Math.round(velocity * 100) / 100
}

/**
 * Rank shorts purely by engagement score (descending).
 * Optionally attach tier and velocity for HUD / debugging.
 */
export function rankShorts(shorts = []) {
  return [...shorts]
    .map((s) => {
      const isOriginal = s.crossPost?.isCrossPost !== true
      const score = computeEngagementScore(s.engagement, { isOriginal })
      const tier = getDistributionTier(score, s.views || 0)
      const ageHours = s.publishedAt
        ? (Date.now() - new Date(s.publishedAt).getTime()) / 3600000
        : 24
      const velocity = computeVelocity(s.engagement, ageHours)
      return { ...s, score, tier, velocity, isOriginal }
    })
    .sort((a, b) => b.score - a.score || b.velocity - a.velocity)
}

/**
 * Decide whether a piece of content should graduate to the next tier
 * based on current score and velocity inside its seed cohort.
 */
export function shouldGraduate(score, velocity, currentTierName) {
  if (currentTierName === 'Seed' && score >= 42 && velocity >= 1.2) return true
  if (currentTierName === 'Tier 1' && score >= 55 && velocity >= 0.9) return true
  if (currentTierName === 'Tier 2' && score >= 68 && velocity >= 0.6) return true
  return false
}

export const ALGORITHM_META = {
  name: 'Clips Discovery (early-TikTok style)',
  principles: [
    'Follower count is never a ranking signal',
    'Completion and rewatches dominate',
    'Early skips suppress content immediately',
    'Seed pools → automatic tier graduation on velocity',
    'Originality receives a small boost; cross-posts are not banned but do not receive the bonus',
  ],
  weights: WEIGHTS,
}
