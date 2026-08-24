/** Clip in-feed ads every 4–6 items (random). Banners every 10. Pic ads every 6–10 (random). */

export const CLIP_AD_GAPS = [4, 5, 6]
export const PIC_AD_GAPS = [6, 7, 8, 9, 10]
export const CLIP_BANNER_EVERY = 10
export const EXOCLICK_FEED_ZONE = '6010926'

function randomGap(gaps) {
  const list = Array.isArray(gaps) ? gaps : []
  if (!list.length) return 6
  return list[Math.floor(Math.random() * list.length)]
}

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

    out.push({
      kind: 'ad',
      ad: { id: `exo-clip-feed-${i}`, provider: 'exoclick', zoneId: EXOCLICK_FEED_ZONE },
      key: `exo-clip-feed-${i}`,
    })
    sinceAd = 0
    nextGap = randomGap(CLIP_AD_GAPS)
  })
  return out
}

export function mixPicFeedRows(list) {
  const items = Array.isArray(list) ? list : []
  const out = []
  let sinceAd = 0
  let nextGap = randomGap(PIC_AD_GAPS)

  items.forEach((item, i) => {
    out.push({ kind: 'item', item, key: item?.id || `item-${i}` })
    sinceAd += 1
    if (i >= items.length - 1) return
    if (sinceAd < nextGap) return

    out.push({
      kind: 'ad',
      ad: { id: `exo-pic-feed-${i}`, provider: 'exoclick', zoneId: EXOCLICK_FEED_ZONE },
      key: `exo-pic-feed-${i}`,
    })
    sinceAd = 0
    nextGap = randomGap(PIC_AD_GAPS)
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
