/**
 * Meritocratic discovery engine.
 * Ranking is driven exclusively by real-time engagement velocity.
 * Creator follower count is never used as a ranking signal.
 */

const WEIGHTS = {
  completionRate: 0.35,
  loops: 0.25,
  shares: 0.15,
  commentsAndSaves: 0.12,
  likes: 0.08,
}

const EARLY_SKIP_PENALTY = -30

/**
 * Compute a live engagement score for a short.
 * Higher score = stronger signal of quality and retention.
 */
export function computeEngagementScore(engagement) {
  if (!engagement) return 0

  const {
    completionRate = 0,
    loops = 0,
    shares = 0,
    comments = 0,
    saves = 0,
    earlySkips = 0,
    likes = 0,
  } = engagement

  // Normalize roughly to 0-100 scale contributions
  const completionPts = completionRate * 100 * WEIGHTS.completionRate
  const loopPts = Math.min(loops, 5) * 20 * WEIGHTS.loops
  const sharePts = Math.min(shares / 1000, 50) * WEIGHTS.shares
  const commentSavePts = Math.min((comments + saves) / 500, 40) * WEIGHTS.commentsAndSaves
  const likePts = Math.min(likes / 5000, 30) * WEIGHTS.likes

  let score = completionPts + loopPts + sharePts + commentSavePts + likePts

  // Heavy penalty for early abandonment
  if (earlySkips > 0.15) {
    score += EARLY_SKIP_PENALTY * (earlySkips - 0.15) * 5
  }

  return Math.max(0, Math.round(score * 10) / 10)
}

/**
 * Determine current distribution tier based on score and view volume.
 * Seed -> Tier1 -> Tier2 -> Global
 */
export function getDistributionTier(score, views) {
  if (views < 500 && score < 40) return { name: 'Seed', size: 200 }
  if (views < 5000 && score < 55) return { name: 'Tier 1', size: 2000 }
  if (views < 50000 && score < 70) return { name: 'Tier 2', size: 20000 }
  return { name: 'Global', size: 500000 }
}

/**
 * Sort shorts purely by engagement score (descending).
 * Follower count is intentionally omitted.
 */
export function rankShorts(shorts) {
  return [...shorts]
    .map(s => ({
      ...s,
      score: computeEngagementScore(s.engagement),
      tier: getDistributionTier(computeEngagementScore(s.engagement), s.views),
    }))
    .sort((a, b) => b.score - a.score)
}
