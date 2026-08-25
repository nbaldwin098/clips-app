/**
 * Clip/pic reel ads — full-screen scroll slides sized like content.
 * Recommended grids and mosaics stay ad-free; ads only appear in the open player.
 */
import { AD_ZONES } from './adZones.js'

export const CLIP_AD_GAPS = [4, 5, 6]
export const PIC_AD_GAPS = [6, 7, 8, 9, 10]
export const CLIP_BANNER_EVERY = 10

export const EXOCLICK_BANNER_ZONE = AD_ZONES.scroll.id
export const EXOCLICK_VIDEO_ZONE = AD_ZONES.video.id

/** Shared scroll creative for clips and pics. */
const scrollAd = (key) => ({
  id: key,
  provider: 'exoclick',
  zoneId: EXOCLICK_BANNER_ZONE,
  format: 'banner',
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

/** Content rows plus full-size ad slides every few clips. */
export function mixClipFeedRows(list, { banners = true } = {}) {
  const items = itemsOrEmpty(list)
  const bannerIdx = new Set()
  if (banners) {
    items.forEach((_, i) => {
      if ((i + 1) % CLIP_BANNER_EVERY === 0) bannerIdx.add(i)
    })
  }

  const out = []
  let sinceAd = 0
  let nextGap = randomGap(CLIP_AD_GAPS)

  items.forEach((item, i) => {
    out.push({
      kind: 'item',
      item,
      key: item?.id || `item-${i}`,
      banner: bannerIdx.has(i),
    })
    sinceAd += 1
    if (i >= items.length - 1) return

    const besideBanner = bannerIdx.has(i) || bannerIdx.has(i + 1)
    if (besideBanner) return
    if (sinceAd < nextGap) return

    out.push({ kind: 'ad', ad: scrollAd(`exo-clip-feed-${i}`), key: `exo-clip-feed-${i}` })
    sinceAd = 0
    nextGap = randomGap(CLIP_AD_GAPS)
  })

  if (!out.some((r) => r.kind === 'ad') && items.length >= 2) {
    out.splice(Math.min(2, out.length), 0, {
      kind: 'ad',
      ad: scrollAd('exo-clip-feed-fallback'),
      key: 'exo-clip-feed-fallback',
    })
  }
  return out
}

/** Pics reel — full-size ad slides between photos while scrolling. */
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

    out.push({ kind: 'ad', ad: scrollAd(`exo-pic-feed-${i}`), key: `exo-pic-feed-${i}` })
    sinceAd = 0
    nextGap = randomGap(PIC_AD_GAPS)
  })

  if (!out.some((r) => r.kind === 'ad') && items.length >= 2) {
    out.splice(Math.min(3, out.length), 0, {
      kind: 'ad',
      ad: scrollAd('exo-pic-feed-fallback'),
      key: 'exo-pic-feed-fallback',
    })
  }
  return out
}

/** @deprecated Under-description banners replaced by full-size scroll slides. */
export function clipBannerAllowedOnMixed(mixed, index, sinceBanner = 0) {
  const row = mixed?.[index]
  if (!row || row.kind === 'ad') return false
  if (mixed[index - 1]?.kind === 'ad' || mixed[index + 1]?.kind === 'ad') return false
  if (row.banner) return true
  if (sinceBanner >= CLIP_BANNER_EVERY) return true
  const n = mixed.slice(0, index + 1).filter((r) => r.kind === 'item').length
  return n > 0 && n % CLIP_BANNER_EVERY === 0
}
