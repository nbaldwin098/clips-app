/**
 * Every ExoClick zone this site uses, and the one renderer each zone type
 * actually supports.
 *
 * This file exists because of a silent, expensive bug: zone 6010926 is an
 * `outstream_video` zone that was being rendered as a display `<ins>`.
 * ExoClick answered every request and the slot stayed 0x0 forever, so pics,
 * clips, and the home grid earned nothing while looking "wired up".
 *
 * Verified against ExoClick's own API (POST https://s.magsrv.com/v1/api.php):
 *   6010930 -> {"type":"banner"}          renders in an <ins>
 *   6010926 -> {"type":"outstream_video"} their provider ships no renderer
 *   6010924 -> "type not supported"       VAST only, via vast.php
 *   6010934 -> "type not supported"       VAST only, via vast.php
 *
 * Rule: `display` zones go in an <ins>, `vast` zones go in a video element.
 * Never mix them. scripts/live-smoke.mjs enforces this.
 */

export const AD_ZONES = {
  /** Horizontal banner — the only display zone that renders today. */
  banner: {
    id: '6010930',
    kind: 'display',
    insClass: 'eas6a97888e2',
    label: 'Banner',
  },
  /** In-stream video for watch pages, feeds, and live viewers. */
  video: {
    id: '6010924',
    kind: 'vast',
    label: 'Video (VAST)',
  },
  /** Creator-triggered live breaks, kept separate so caps/reports stay clean. */
  liveCreator: {
    id: '6010934',
    kind: 'vast',
    label: 'Live creator (VAST)',
  },
}

/**
 * Zones that answer but cannot be rendered by any embed we ship. Kept by id
 * so the health check can name them instead of failing silently.
 */
export const UNRENDERABLE_ZONES = {
  6010926: 'outstream_video — ExoClick serves it but ships no renderer. Recreate it as a banner or video zone.',
}

export const VAST_BASE = 'https://s.magsrv.com/v1/vast.php?idz='
export const AD_PROVIDER_SCRIPT = 'https://a.magsrv.com/ad-provider.js'

export function vastUrlFor(zone) {
  const z = AD_ZONES[zone] || AD_ZONES.video
  return `${VAST_BASE}${z.id}`
}

export function isDisplayZone(zoneId) {
  return Object.values(AD_ZONES).some((z) => z.kind === 'display' && z.id === String(zoneId))
}

export function displayZone() {
  return AD_ZONES.banner
}
