/**
 * ExoClick zones — VAST video only. No banner / display slots.
 *
 *   6012450  video     — watch preroll + mid-rolls, live viewer join
 *   6012452  feed      — full-screen ads between clips and between pics
 *   6012454  liveCreator — creator auto/manual live breaks
 */
export const AD_ZONES = {
  video: {
    id: '6012450',
    kind: 'vast',
    label: 'Video (VAST)',
    placements: ['video', 'live-viewer'],
  },
  feed: {
    id: '6012452',
    kind: 'vast',
    label: 'Feed (VAST)',
    placements: ['clip-feed', 'pic-feed'],
  },
  liveCreator: {
    id: '6012454',
    kind: 'vast',
    label: 'Live creator (VAST)',
    placements: ['live-creator'],
  },
}

/** @deprecated removed — no display/banner zones */
export const UNRENDERABLE_ZONES = {}

export const VAST_BASE = 'https://s.magsrv.com/v1/vast.php?idz='
export const AD_PROVIDER_SCRIPT = 'https://a.magsrv.com/ad-provider.js'

export function vastUrlFor(zone) {
  const z = AD_ZONES[zone] || AD_ZONES.video
  return `${VAST_BASE}${z.id}`
}

export function isDisplayZone() {
  return false
}

/** @deprecated no display zones */
export function displayZone() {
  return null
}

/** Zone config for a site placement. */
export function zoneForPlacement(placement) {
  if (placement === 'clip-feed' || placement === 'pic-feed') return AD_ZONES.feed
  if (placement === 'video' || placement === 'live-viewer') return AD_ZONES.video
  if (placement === 'live-creator') return AD_ZONES.liveCreator
  return null
}
