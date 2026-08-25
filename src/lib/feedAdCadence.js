/**
 * Clip/pic reel ads — banners on clips only, never full-screen scroll stops.
 *
 * Full-page ad slides in a snap reel freeze vertical scroll (users get stuck
 * on a black "Sponsored" page). Clips get a banner under the description
 * every N clips; pics scroll content only.
 */
import { AD_ZONES } from './adZones.js'

export const CLIP_BANNER_EVERY = 10

export const EXOCLICK_BANNER_ZONE = AD_ZONES.scroll.id
export const EXOCLICK_VIDEO_ZONE = AD_ZONES.video.id

function itemsOrEmpty(list) {
  return Array.isArray(list) ? list : []
}

/** Content rows only — optional banner flag every CLIP_BANNER_EVERY clips. */
export function mixClipFeedRows(list, { banners = true } = {}) {
  const items = itemsOrEmpty(list)
  return items.map((item, i) => ({
    kind: 'item',
    item,
    key: item?.id || `item-${i}`,
    banner: banners && (i + 1) % CLIP_BANNER_EVERY === 0,
  }))
}

/** Pics reel is content-only so scroll never stops on an ad slide. */
export function mixPicFeedRows(list) {
  return itemsOrEmpty(list).map((item, i) => ({
    kind: 'item',
    item,
    key: item?.id || `item-${i}`,
  }))
}

/**
 * `sinceBanner` is how many clips the viewer has scrolled since the last banner,
 * so a short catalog on an endless reel still reaches a banner every 10 clips.
 */
export function clipBannerAllowedOnMixed(mixed, index, sinceBanner = 0) {
  const row = mixed?.[index]
  if (!row || row.kind !== 'item') return false
  if (row.banner) return true
  if (sinceBanner >= CLIP_BANNER_EVERY) return true
  const n = mixed.slice(0, index + 1).filter((r) => r.kind === 'item').length
  return n > 0 && n % CLIP_BANNER_EVERY === 0
}
