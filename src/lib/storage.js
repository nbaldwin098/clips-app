/**
 * Zero-cost storage architecture helpers.
 * - Zero-Storage Smart Reference: store only metadata + external stream URL.
 * - Backblaze B2 S3-compatible target for scale ($0.005/GB).
 * - Cloudflare edge caching assumed for delivery.
 */

export const STORAGE_TARGETS = {
  ZERO_REF: 'zero-storage-reference',
  B2: 'backblaze-b2',
  SUPABASE: 'supabase-free',
}

/**
 * Cost model for Backblaze B2.
 * Average short ≈ 30 MB.
 */
export function estimateB2Cost(videoCount, avgMb = 30) {
  const gb = (videoCount * avgMb) / 1024
  const monthly = gb * 0.005
  return {
    videoCount,
    totalGb: Math.round(gb * 100) / 100,
    monthlyUsd: Math.round(monthly * 100) / 100,
  }
}

/**
 * AWS S3 comparison (standard storage + internet egress estimate).
 */
export function estimateS3Cost(videoCount, avgMb = 30) {
  const gb = (videoCount * avgMb) / 1024
  const storage = gb * 0.023
  const egress = gb * 0.09 * 0.3
  return {
    videoCount,
    totalGb: Math.round(gb * 100) / 100,
    monthlyUsd: Math.round((storage + egress) * 100) / 100,
  }
}

/**
 * Parse a public short URL into a lightweight metadata record.
 * Does not download or store binary video data.
 */
export function parseExternalShort(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')
    let platform = 'unknown'
    if (host.includes('tiktok')) platform = 'tiktok'
    else if (host.includes('youtube') || host.includes('youtu.be')) platform = 'youtube'
    else if (host.includes('instagram')) platform = 'instagram'
    else if (host.includes('twitch')) platform = 'twitch'
    else if (host.includes('kick')) platform = 'kick'

    return {
      id: `ref_${Date.now()}`,
      platform,
      sourceUrl: url,
      title: `Imported from ${platform}`,
      description: 'Zero-storage reference. Binary remains at origin.',
      storedBytes: 0,
      createdAt: new Date().toISOString(),
      type: 'short',
    }
  } catch {
    return null
  }
}
