/** Clip in-feed ads every 4–6 items. Banners every 10. Never adjacent, never two ads in a row. */

export const CLIP_AD_GAPS = [4, 5, 6]
export const CLIP_BANNER_EVERY = 10
export const EXOCLICK_FEED_ZONE = '6010926'

export function mixClipFeedRows(list, { banners = true } = {}) {
  const items = Array.isArray(list) ? list : []
  const bannerIdx = new Set()
  if (banners) {
    items.forEach((_, i) => {
      if ((i + 1) % CLIP_BANNER_EVERY === 0) bannerIdx.add(i)
    })
  }

  const out = []
  let sinceAd = 0
  let gapI = 0
  let nextGap = CLIP_AD_GAPS[0]

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

    out.push({
      kind: 'ad',
      ad: { id: `exo-clip-feed-${i}`, provider: 'exoclick', zoneId: EXOCLICK_FEED_ZONE },
      key: `exo-clip-feed-${i}`,
    })
    sinceAd = 0
    gapI = (gapI + 1) % CLIP_AD_GAPS.length
    nextGap = CLIP_AD_GAPS[gapI]
  })
  return out
}

export function clipBannerAllowedOnMixed(mixed, index) {
  const row = mixed?.[index]
  if (!row || row.kind === 'ad') return false
  if (mixed[index - 1]?.kind === 'ad' || mixed[index + 1]?.kind === 'ad') return false
  if (row.banner) return true
  const n = mixed.slice(0, index + 1).filter((r) => r.kind === 'item').length
  return n > 0 && n % CLIP_BANNER_EVERY === 0
}
