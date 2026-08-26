/**
 * Clip/pic reel ads — full-screen VAST slides sized like content.
 * Recommended grids and mosaics stay ad-free; ads only appear in the open player.
 */
import { AD_ZONES } from './adZones.js'

export const CLIP_AD_GAPS = [4, 5, 6]
export const PIC_AD_GAPS = [6, 7, 8, 9, 10]

export const EXOCLICK_FEED_ZONE = AD_ZONES.feed.id
export const EXOCLICK_VIDEO_ZONE = AD_ZONES.video.id

/** Shared feed VAST creative for clips and pics. */
const feedAd = (key) => ({
  id: key,
  provider: 'exoclick',
  zoneId: EXOCLICK_FEED_ZONE,
  format: 'vast',
  placement: key.startsWith('exo-pic') ? 'pic-feed' : 'clip-feed',
})

function itemsOrEmpty(list) {
  return Array.isArray(list) ? list : []
}

function randomGap(gaps) {
  const list = Array.isArray(gaps) ? gaps : []
  if (!list.length) return 6
  return list[Math.floor(Math.random() * list.length)]
}

/** Content rows plus full-size VAST ad slides every few clips. */
export function mixClipFeedRows(list) {
  const items = itemsOrEmpty(list)
  const out = []
  let sinceAd = 0
  let nextGap = randomGap(CLIP_AD_GAPS)

  items.forEach((item, i) => {
    out.push({
      kind: 'item',
      item,
      key: item?.id || `item-${i}`,
    })
    sinceAd += 1
    if (i >= items.length - 1) return
    if (sinceAd < nextGap) return

    out.push({ kind: 'ad', ad: feedAd(`exo-clip-feed-${i}`), key: `exo-clip-feed-${i}` })
    sinceAd = 0
    nextGap = randomGap(CLIP_AD_GAPS)
  })

  if (!out.some((r) => r.kind === 'ad') && items.length >= 2) {
    out.splice(Math.min(2, out.length), 0, {
      kind: 'ad',
      ad: feedAd('exo-clip-feed-fallback'),
      key: 'exo-clip-feed-fallback',
    })
  }
  return out
}

/** Pics reel — full-size VAST ad slides between photos while scrolling. */
export function mixPicFeedRows(list) {
  const items = itemsOrEmpty(list)
  const out = []
  let sinceAd = 0
  let nextGap = randomGap(PIC_AD_GAPS)

  items.forEach((item, i) => {
    out.push({ kind: 'item', item, key: item?.id || `item-${i}` })
    sinceAd += 1
    if (i >= items.length - 1) return
    if (sinceAd < nextGap) return

    out.push({ kind: 'ad', ad: feedAd(`exo-pic-feed-${i}`), key: `exo-pic-feed-${i}` })
    sinceAd = 0
    nextGap = randomGap(PIC_AD_GAPS)
  })

  if (!out.some((r) => r.kind === 'ad') && items.length >= 2) {
    out.splice(Math.min(3, out.length), 0, {
      kind: 'ad',
      ad: feedAd('exo-pic-feed-fallback'),
      key: 'exo-pic-feed-fallback',
    })
  }
  return out
}

/** @deprecated banners removed */
export function clipBannerAllowedOnMixed() {
  return false
}
