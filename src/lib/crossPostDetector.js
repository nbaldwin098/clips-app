/**
 * Cross-posting detector (client-side heuristics).
 *
 * Goal: identify content that originated on TikTok, Instagram Reels,
 * YouTube Shorts, or similar, so the discovery engine can:
 * - withhold the small originality bonus
 * - optionally surface a "sourced from …" label
 * - never ban cross-posts (creators are free to import), only score fairly
 *
 * This is intentionally lightweight and runs in the browser.
 * No server-side fingerprinting or Content ID.
 */

const PLATFORM_PATTERNS = [
  {
    id: 'tiktok',
    label: 'TikTok',
    hostMatchers: [/tiktok\.com/i, /vm\.tiktok\.com/i, /vt\.tiktok\.com/i],
    pathMatchers: [/\/@[\w.-]+\/video\//i, /\/t\//i],
    watermarkHints: ['tiktok', 'musical.ly'],
  },
  {
    id: 'instagram',
    label: 'Instagram Reels',
    hostMatchers: [/instagram\.com/i, /instagr\.am/i],
    pathMatchers: [/\/reel\//i, /\/reels\//i, /\/p\//i],
    watermarkHints: ['instagram', 'reels'],
  },
  {
    id: 'youtube',
    label: 'YouTube Shorts',
    hostMatchers: [/youtube\.com/i, /youtu\.be/i],
    pathMatchers: [/\/shorts\//i],
    watermarkHints: ['youtube'],
  },
  {
    id: 'twitch',
    label: 'Twitch',
    hostMatchers: [/twitch\.tv/i, /clips\.twitch\.tv/i],
    pathMatchers: [/\/clip\//i, /\/clips\//i],
    watermarkHints: ['twitch'],
  },
  {
    id: 'kick',
    label: 'Kick',
    hostMatchers: [/kick\.com/i],
    pathMatchers: [/\/clip\//i, /\/clips\//i],
    watermarkHints: ['kick'],
  },
]

/**
 * Detect platform from a source URL (used by the importer and upload metadata).
 */
export function detectPlatformFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname + u.search

    for (const p of PLATFORM_PATTERNS) {
      const hostHit = p.hostMatchers.some((re) => re.test(host))
      const pathHit = p.pathMatchers.length === 0 || p.pathMatchers.some((re) => re.test(path))
      if (hostHit && pathHit) {
        return { id: p.id, label: p.label, sourceUrl: url }
      }
      // Host alone is enough for most cases
      if (hostHit) {
        return { id: p.id, label: p.label, sourceUrl: url }
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Lightweight title / description fingerprint for common watermark phrases.
 * Returns confidence 0–1.
 */
export function detectWatermarkHints(text = '') {
  const lower = String(text).toLowerCase()
  const hits = []
  for (const p of PLATFORM_PATTERNS) {
    for (const hint of p.watermarkHints) {
      if (lower.includes(hint)) {
        hits.push(p.id)
        break
      }
    }
  }
  return {
    hits: [...new Set(hits)],
    confidence: hits.length ? Math.min(1, 0.4 + hits.length * 0.2) : 0,
  }
}

/**
 * Full cross-post assessment for a content record.
 */
export function assessCrossPost(input = {}) {
  const { sourceUrl, title = '', description = '', claimedOriginal = false } = input

  const fromUrl = detectPlatformFromUrl(sourceUrl)
  const watermark = detectWatermarkHints(`${title} ${description}`)

  const isCrossPost = Boolean(fromUrl) || watermark.confidence >= 0.6

  let confidence = 0
  if (fromUrl) confidence = 0.95
  else if (watermark.confidence) confidence = watermark.confidence
  if (claimedOriginal && !fromUrl) confidence = Math.max(0, confidence - 0.3)

  return {
    isCrossPost,
    confidence: Math.round(confidence * 100) / 100,
    platform: fromUrl ? fromUrl.id : watermark.hits[0] || null,
    platformLabel: fromUrl ? fromUrl.label : null,
    sourceUrl: fromUrl?.sourceUrl || sourceUrl || null,
    reasons: [
      fromUrl ? `Source URL matches ${fromUrl.label}` : null,
      watermark.hits.length ? `Text hints: ${watermark.hits.join(', ')}` : null,
    ].filter(Boolean),
  }
}

/**
 * Helper for the importer: attach cross-post metadata to a reference record.
 */
export function attachCrossPostMeta(record) {
  const assessment = assessCrossPost({
    sourceUrl: record.sourceUrl || record.referenceUrl,
    title: record.title,
    description: record.description,
  })
  return {
    ...record,
    crossPost: assessment,
  }
}
