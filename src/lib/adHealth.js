/**
 * Live ad checks, run from the browser on demand (Admin -> Ads -> Check now).
 * VAST-only stack: video, feed, live-creator.
 */
import { AD_ZONES, vastUrlFor } from './adZones.js'
import { parseVastXml } from './vastAds.js'
import { getAdSettings } from './adEngine.js'

async function checkVastZone(key) {
  const zone = AD_ZONES[key]
  if (!zone) return { ok: false, detail: 'unknown zone' }
  try {
    const res = await fetch(vastUrlFor(key), { credentials: 'omit' })
    if (!res.ok) return { ok: false, detail: `tag returned HTTP ${res.status}` }
    const xml = await res.text()
    const parsed = parseVastXml(xml)
    if (parsed?.wrapper) return { ok: true, detail: 'wrapper tag — resolves to a third-party creative' }
    if (!parsed?.mediaUrl) {
      return { ok: false, detail: `no fill right now (${xml.length} bytes). Zone ${zone.id} must be a video/VAST zone with inventory.` }
    }
    return { ok: true, detail: `playable creative, ${Math.round(parsed.durationSec)}s, skip after ${parsed.skipAfterSec}s` }
  } catch (err) {
    return { ok: false, detail: `could not reach the tag (${String(err?.message || err).slice(0, 60)}). An ad blocker will do this.` }
  }
}

/** Runs every check and returns one row per thing that can break. */
export async function runAdHealthChecks() {
  const settings = getAdSettings()
  const [video, feed, liveCreator] = await Promise.all([
    checkVastZone('video'),
    checkVastZone('feed'),
    checkVastZone('liveCreator'),
  ])

  const rows = [
    { name: `Video VAST ${AD_ZONES.video.id} — watch + live viewers`, ...video },
    { name: `Feed VAST ${AD_ZONES.feed.id} — clips + pics between items`, ...feed },
    { name: `Live creator VAST ${AD_ZONES.liveCreator.id} — auto/manual breaks`, ...liveCreator },
  ]

  const off = Object.entries({
    Videos: settings.videoInStream,
    'Clips in-feed': settings.clipInFeed,
    'Pics in-feed': settings.picInFeed,
  }).filter(([, on]) => on === false).map(([name]) => name)

  rows.push({
    name: 'Placement switches',
    ok: off.length === 0,
    detail: off.length ? `turned off on this device: ${off.join(', ')}` : 'all three placements are on',
  })

  return rows
}
