/**
 * Live ad checks, run from the browser on demand (Admin -> Ads -> Check now).
 *
 * The reason this exists: a zone can answer every request and still render
 * nothing if its type does not match the embed. That is invisible in the UI
 * and costs every impression, so it has to be checkable in one click instead
 * of guessed at.
 */
import { AD_ZONES, UNRENDERABLE_ZONES, AD_PROVIDER_SCRIPT, vastUrlFor } from './adZones.js'
import { parseVastXml } from './vastAds.js'
import { getAdSettings } from './adEngine.js'

const API = 'https://s.magsrv.com/v1/api.php'

async function checkVastZone(key) {
  const zone = AD_ZONES[key]
  try {
    const res = await fetch(vastUrlFor(key), { credentials: 'omit' })
    if (!res.ok) return { ok: false, detail: `tag returned HTTP ${res.status}` }
    const xml = await res.text()
    const parsed = parseVastXml(xml)
    if (parsed?.wrapper) return { ok: true, detail: 'wrapper tag — resolves to a third-party creative' }
    if (!parsed?.mediaUrl) {
      return { ok: false, detail: `no fill right now (${xml.length} bytes). Zone ${zone.id} must be a video/VAST zone.` }
    }
    return { ok: true, detail: `playable creative, ${Math.round(parsed.durationSec)}s, skip after ${parsed.skipAfterSec}s` }
  } catch (err) {
    return { ok: false, detail: `could not reach the tag (${String(err?.message || err).slice(0, 60)}). An ad blocker will do this.` }
  }
}

async function checkDisplayZone(key) {
  const zone = AD_ZONES[key]
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      credentials: 'include',
      body: JSON.stringify({
        user: {
          ua: navigator.userAgent,
          language: navigator.language || 'en-US',
          referer: window.location.href,
          consumer: 'ad-provider',
          gdpr: { gdpr: 0 },
          screen_resolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
          cookies: [],
        },
        zones: [{ id: Number(zone.id), extra_params: { first_request: true } }],
      }),
    })
    if (!res.ok) return { ok: false, detail: `ad API returned HTTP ${res.status}` }
    const json = await res.json()
    const row = json?.zones?.[0]
    const errors = json?.errors?.flat?.() || []
    if (!row) {
      return { ok: false, detail: errors[0] || 'zone did not answer — check the zone id in ExoClick' }
    }
    if (row.type !== 'banner' && row.type !== 'native') {
      return {
        ok: false,
        detail: `zone type is "${row.type}", which cannot render in a banner slot. Recreate it as a banner zone.`,
      }
    }
    return { ok: true, detail: `type "${row.type}", ad returned` }
  } catch (err) {
    return { ok: false, detail: `could not reach the ad API (${String(err?.message || err).slice(0, 60)}). An ad blocker will do this.` }
  }
}

async function checkProviderScript() {
  try {
    const res = await fetch(AD_PROVIDER_SCRIPT, { credentials: 'omit', mode: 'no-cors' })
    // no-cors gives an opaque response; reaching here at all means it loaded.
    return { ok: true, detail: res.type === 'opaque' ? 'reachable' : `reachable (${res.status})` }
  } catch {
    return { ok: false, detail: 'blocked — an ad blocker or DNS filter is stopping ad-provider.js' }
  }
}

/** Runs every check and returns one row per thing that can break. */
export async function runAdHealthChecks() {
  const settings = getAdSettings()
  const [script, video, liveCreator, banner] = await Promise.all([
    checkProviderScript(),
    checkVastZone('video'),
    checkVastZone('liveCreator'),
    checkDisplayZone('banner'),
  ])

  const rows = [
    { name: 'Ad script (ad-provider.js)', ...script },
    { name: `Video zone ${AD_ZONES.video.id} — watch, clips, live viewers`, ...video },
    { name: `Live creator zone ${AD_ZONES.liveCreator.id} — creator breaks`, ...liveCreator },
    { name: `Banner zone ${AD_ZONES.banner.id} — pic tiles, clip banner`, ...banner },
  ]

  for (const [id, why] of Object.entries(UNRENDERABLE_ZONES)) {
    rows.push({ name: `Zone ${id} is not in use`, ok: true, detail: why })
  }

  const off = Object.entries({
    'Videos': settings.videoInStream,
    'Clips banner': settings.clipBanner,
    'Clips in-feed': settings.clipInFeed,
    'Pics in-feed': settings.picInFeed,
  }).filter(([, on]) => on === false).map(([name]) => name)

  rows.push({
    name: 'Placement switches',
    ok: off.length === 0,
    detail: off.length ? `turned off on this device: ${off.join(', ')}` : 'all four placements are on',
  })

  return rows
}
