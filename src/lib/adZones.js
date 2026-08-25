/**
 * ExoClick zones → where each one is allowed to render.
 *
 * Zones were created at fixed sizes with ExoClick. Putting a zone in the
 * wrong slot (or the wrong embed) earns nothing even when the tag answers.
 *
 * Verified against ExoClick's API (POST https://s.magsrv.com/v1/api.php):
 *   6010930 -> {"type":"banner"}          <ins> display (scroll + bars)
 *   6010926 -> {"type":"outstream_video"} no usable embed we ship
 *   6010924 -> "type not supported"       VAST only (watch / live viewers)
 *   6010934 -> "type not supported"       VAST only (live creator breaks)
 *
 * Placement rules:
 *   - Clips scroll + Pics scroll share the same display zone (both are feeds).
 *   - Clip-under-description banner uses that same display zone (bar layout).
 *   - Long-form videos and live viewers use the video VAST zone only.
 *   - Creator-triggered live breaks use the live-creator VAST zone only.
 * Never put a VAST zone in an <ins>, or a display zone in a <video>.
 */

export const AD_ZONES = {
  /**
   * Scroll feeds (clips grid, clip player between clips, pics mosaic) and the
   * small bar under a clip description. One zone on purpose — both scroll.
   */
  scroll: {
    id: '6010930',
    kind: 'display',
    insClass: 'eas6a97888e2',
    label: 'Scroll / banner',
    placements: ['clip-feed', 'pic-feed', 'clip-banner'],
  },
  /** In-stream on watch pages and live viewers (30s join, then schedule). */
  video: {
    id: '6010924',
    kind: 'vast',
    label: 'Video (VAST)',
    placements: ['video', 'live-viewer'],
  },
  /** Creator-triggered live breaks only. */
  liveCreator: {
    id: '6010934',
    kind: 'vast',
    label: 'Live creator (VAST)',
    placements: ['live-creator'],
  },
}

/** Alias kept so older call sites that said "banner" still resolve. */
AD_ZONES.banner = AD_ZONES.scroll

/**
 * Zones that answer but cannot be rendered by any embed we ship. Kept by id
 * so the health check can name them instead of failing silently.
 *
 * 6010926 was the old "display" slot (300×250-style) for scroll feeds. ExoClick
 * typed it as outstream_video, which has no renderer in ad-provider.js — recreate
 * it as a Banner zone in ExoClick if you want a second scroll size.
 */
export const UNRENDERABLE_ZONES = {
  6010926: 'outstream_video — created as a sized display slot, but ExoClick serves no <ins> renderer. Recreate as a Banner zone, then point AD_ZONES.scroll at it.',
}

export const VAST_BASE = 'https://s.magsrv.com/v1/vast.php?idz='
export const AD_PROVIDER_SCRIPT = 'https://a.magsrv.com/ad-provider.js'

export function vastUrlFor(zone) {
  const z = AD_ZONES[zone] || AD_ZONES.video
  return `${VAST_BASE}${z.id}`
}

export function isDisplayZone(zoneId) {
  return Object.values(AD_ZONES).some((z) => z && z.kind === 'display' && z.id === String(zoneId))
}

export function displayZone() {
  return AD_ZONES.scroll
}

/** Zone id for a site placement. Scroll placements always share one zone. */
export function zoneForPlacement(placement) {
  if (placement === 'clip-feed' || placement === 'pic-feed' || placement === 'clip-banner') {
    return AD_ZONES.scroll
  }
  if (placement === 'video' || placement === 'live-viewer') return AD_ZONES.video
  if (placement === 'live-creator') return AD_ZONES.liveCreator
  return null
}
