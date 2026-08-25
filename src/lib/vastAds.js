/**
 * ExoClick VAST in-stream ads for long-form videos and live stages.
 * Empty or failed tags do not invent a placeholder ad.
 */
import { safeHttpUrl, safeMediaUrl } from './safeUrl.js'
import { vastUrlFor } from './adZones.js'

export const EXOCLICK_VAST_URL = vastUrlFor('video')
export const EXOCLICK_LIVE_CREATOR_VAST_URL = vastUrlFor('liveCreator')
export const YT_SKIP_AFTER_SEC = 5
/** First in-stream ad: 30 seconds into the video. Never a preroll at 0:00. */
export const VIDEO_FIRST_AD_SEC = 30
/** Second in-stream ad, and later breaks, only if the video is 8 minutes or longer. */
export const YT_MIDROLL_MIN_SEC = 8 * 60

export function videoVastAdsEnabled() {
  if (typeof localStorage === 'undefined') return true
  try {
    const stored = JSON.parse(localStorage.getItem('clips_ad_settings') || '{}') || {}
    return stored.videoInStream !== false && stored.videoPreroll !== false
  } catch {
    return true
  }
}

export function vastFetchUrl(kind = 'video') {
  const remote = kind === 'live-creator' ? EXOCLICK_LIVE_CREATOR_VAST_URL : EXOCLICK_VAST_URL
  if (typeof window === 'undefined') return remote
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return kind === 'live-creator' ? '/__vast/exo-live' : '/__vast/exo'
  }
  return remote
}

export function parseVastClock(raw) {
  const s = String(raw || '').trim()
  if (!s) return 0
  const parts = s.split(':')
  if (parts.length === 1) {
    const n = Number(parts[0])
    return Number.isFinite(n) ? n : 0
  }
  const h = Number(parts[0]) || 0
  const m = Number(parts[1]) || 0
  const sec = Number(parts[2]) || 0
  return h * 3600 + m * 60 + sec
}

function cdata(text) {
  return String(text || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
}

function tagText(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = String(xml || '').match(re)
  return m ? cdata(m[1]) : ''
}

function attr(xml, name) {
  const m = String(xml || '').match(new RegExp(`${name}="([^"]+)"`, 'i'))
  return m ? m[1] : ''
}

export function parseVastXml(xml) {
  const raw = String(xml || '')
  if (!/<VAST/i.test(raw)) return null
  const wrapperUri = tagText(raw, 'VASTAdTagURI')
  if (wrapperUri) {
    return { wrapper: true, wrapperUrl: safeHttpUrl(wrapperUri) }
  }
  const linear = raw.match(/<Linear\b[^>]*>[\s\S]*?<\/Linear>/i)?.[0] || ''
  if (!linear) return null
  const files = []
  const fileRe = /<MediaFile\b([^>]*)>([\s\S]*?)<\/MediaFile>/gi
  let fm
  while ((fm = fileRe.exec(linear))) {
    const url = safeMediaUrl(cdata(fm[2]))
    if (!url) continue
    files.push({
      url,
      type: attr(fm[1], 'type'),
      width: Number(attr(fm[1], 'width')) || 0,
      height: Number(attr(fm[1], 'height')) || 0,
      bitrate: Number(attr(fm[1], 'bitrate')) || 0,
    })
  }
  const mp4 = files.filter((f) => /mp4/i.test(f.type) || /\.mp4(\?|$)/i.test(f.url))
  const pool = mp4.length ? mp4 : files
  pool.sort((a, b) => (b.width - a.width) || (b.bitrate - a.bitrate))
  const media = pool[0]
  if (!media?.url) return null
  const durationSec = parseVastClock(tagText(linear, 'Duration'))
  const skipRaw = attr(linear.match(/<Linear\b[^>]*>/i)?.[0] || '', 'skipoffset')
  const skipAfterSec = skipRaw ? parseVastClock(skipRaw) : YT_SKIP_AFTER_SEC
  const clickThrough = safeHttpUrl(tagText(linear, 'ClickThrough'))
  const impression = safeHttpUrl(tagText(raw, 'Impression'))
  const errorUrl = tagText(raw, 'Error')
  const tracking = {}
  const tr = /<Tracking\b([^>]*)>([\s\S]*?)<\/Tracking>/gi
  let tm
  while ((tm = tr.exec(linear))) {
    const event = attr(tm[1], 'event')
    const url = safeHttpUrl(cdata(tm[2]))
    if (event && url) {
      tracking[event] = tracking[event] || []
      tracking[event].push(url)
    }
  }
  return {
    wrapper: false,
    mediaUrl: media.url,
    mime: media.type || 'video/mp4',
    durationSec: durationSec || 15,
    skipAfterSec: skipAfterSec > 0 ? skipAfterSec : YT_SKIP_AFTER_SEC,
    clickThrough,
    impression,
    errorUrl: safeHttpUrl(errorUrl.replace('[ERRORCODE]', '900')),
    tracking,
    title: tagText(raw, 'AdTitle') || 'Sponsored',
    advertiser: tagText(raw, 'Advertiser') || 'Ad',
  }
}

export function fireVastPixel(url) {
  const href = safeHttpUrl(url)
  if (!href || typeof Image === 'undefined') return
  try {
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.src = href
  } catch { /* tracking is best-effort */ }
}

async function fetchVastOnce(fetchKind) {
  let xml = ''
  try {
    // Bust ExoClick frequency-cap cookies that sometimes return an empty
    // ~157-byte VAST after a few hits in the same browser session.
    const base = vastFetchUrl(fetchKind)
    const sep = base.includes('?') ? '&' : '?'
    const res = await fetch(`${base}${sep}r=${Date.now()}${Math.random().toString(36).slice(2, 6)}`, {
      credentials: 'omit',
      cache: 'no-store',
    })
    if (!res.ok) return null
    xml = await res.text()
  } catch {
    return null
  }
  return parseVastXml(xml)
}

export async function loadExoClickVast({ depth = 0, kind = 'video', attempts = 2 } = {}) {
  if (depth > 3) return null
  if (kind === 'video' && !videoVastAdsEnabled()) return null
  const fetchKind = kind === 'live-creator' ? 'live-creator' : 'video'
  const tries = Math.max(1, Number(attempts) || 1)

  for (let i = 0; i < tries; i += 1) {
    const parsed = await fetchVastOnce(fetchKind)
    if (!parsed) continue
    if (parsed.wrapper) {
      if (!parsed.wrapperUrl) continue
      try {
        const res = await fetch(parsed.wrapperUrl, { credentials: 'omit', cache: 'no-store' })
        if (!res.ok) continue
        const inner = parseVastXml(await res.text())
        if (inner?.mediaUrl) return inner
      } catch {
        /* try again */
      }
      continue
    }
    if (parsed.mediaUrl) return parsed
  }
  return null
}

/**
 * Long-form videos: first ad 30 seconds in, then another at 8 minutes
 * if the video is that long, then every 8 minutes after that.
 * No preroll at 0:00. Videos shorter than 30 seconds get no in-stream ad.
 */
export function videoInStreamBreaks(durationSec) {
  const d = Number(durationSec)
  if (!Number.isFinite(d) || d <= VIDEO_FIRST_AD_SEC) return []
  const points = [VIDEO_FIRST_AD_SEC]
  if (d >= YT_MIDROLL_MIN_SEC) {
    let t = YT_MIDROLL_MIN_SEC
    while (t <= d) {
      points.push(t)
      t += YT_MIDROLL_MIN_SEC
    }
  }
  return points
}

