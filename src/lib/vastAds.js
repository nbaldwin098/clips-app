/**
 * ExoClick VAST in-stream ads for long-form videos and live stages.
 * Empty or failed tags do not invent a placeholder ad.
 */
import { safeHttpUrl, safeMediaUrl } from './safeUrl.js'
import { vastUrlFor } from './adZones.js'

export const EXOCLICK_VAST_URL = vastUrlFor('video')
export const EXOCLICK_LIVE_CREATOR_VAST_URL = vastUrlFor('liveCreator')
export const YT_SKIP_AFTER_SEC = 5
export const VIDEO_PREROLL_BREAK = 0
export const VIDEO_FIRST_AD_SEC = 30
export const YT_MIDROLL_MIN_SEC = 8 * 60

let viewerShowAds = true

/** Called from AuthContext when the signed-in viewer changes ad preference. */
export function setVastViewerShowAds(show) {
  viewerShowAds = show !== false
}

export function videoVastAdsEnabled() {
  if (!viewerShowAds) return false
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
  return String(text || '').replace('<![CDATA[', '').replace(']]>', '').trim()
}

function tagText(xml, tag) {
  const open = '<' + tag
  const close = '</' + tag + '>'
  const raw = String(xml || '')
  const start = raw.toLowerCase().indexOf(open.toLowerCase())
  if (start < 0) return ''
  const after = raw.indexOf('>', start)
  if (after < 0) return ''
  const end = raw.toLowerCase().indexOf(close.toLowerCase(), after)
  if (end < 0) return ''
  return cdata(raw.slice(after + 1, end))
}

function attr(xml, name) {
  const raw = String(xml || '')
  const key = name + '="'
  const i = raw.indexOf(key)
  if (i < 0) return ''
  const start = i + key.length
  const end = raw.indexOf('"', start)
  return end < 0 ? '' : raw.slice(start, end)
}

function extractBlock(xml, tag) {
  const raw = String(xml || '')
  const needle = '<' + tag
  const lower = raw.toLowerCase()
  const start = lower.indexOf(needle.toLowerCase())
  if (start < 0) return ''
  const close = '</' + tag + '>'
  const end = lower.indexOf(close.toLowerCase(), start)
  if (end < 0) return raw.slice(start)
  return raw.slice(start, end + close.length)
}

export function parseVastXml(xml) {
  const raw = String(xml || '')
  if (raw.toUpperCase().indexOf('<VAST') < 0) return null
  const wrapperUri = tagText(raw, 'VASTAdTagURI')
  if (wrapperUri) {
    return { wrapper: true, wrapperUrl: safeHttpUrl(wrapperUri) }
  }
  const linear = extractBlock(raw, 'Linear')
  if (!linear) return null
  const files = []
  let searchFrom = 0
  const lower = linear.toLowerCase()
  while (true) {
    const idx = lower.indexOf('<mediafile', searchFrom)
    if (idx < 0) break
    const tagEnd = linear.indexOf('>', idx)
    if (tagEnd < 0) break
    const openTag = linear.slice(idx, tagEnd + 1)
    const closeIdx = lower.indexOf('</mediafile>', tagEnd)
    if (closeIdx < 0) break
    const body = linear.slice(tagEnd + 1, closeIdx)
    const url = safeMediaUrl(cdata(body))
    searchFrom = closeIdx + 12
    if (!url) continue
    files.push({
      url,
      type: attr(openTag, 'type'),
      width: Number(attr(openTag, 'width')) || 0,
      height: Number(attr(openTag, 'height')) || 0,
      bitrate: Number(attr(openTag, 'bitrate')) || 0,
    })
  }
  const mp4 = files.filter((f) => /mp4/i.test(f.type) || f.url.indexOf('.mp4') >= 0)
  const pool = mp4.length ? mp4 : files
  pool.sort((a, b) => (b.width - a.width) || (b.bitrate - a.bitrate))
  const media = pool[0]
  if (!media || !media.url) return null
  const durationSec = parseVastClock(tagText(linear, 'Duration'))
  const openEnd = linear.indexOf('>')
  const linearOpen = openEnd >= 0 ? linear.slice(0, openEnd + 1) : ''
  const skipRaw = attr(linearOpen, 'skipoffset')
  const skipAfterSec = skipRaw ? parseVastClock(skipRaw) : YT_SKIP_AFTER_SEC
  const clickThrough = safeHttpUrl(tagText(linear, 'ClickThrough'))
  const impression = safeHttpUrl(tagText(raw, 'Impression'))
  const errorUrl = tagText(raw, 'Error')
  const tracking = {}
  let tFrom = 0
  const tLower = linear.toLowerCase()
  while (true) {
    const idx = tLower.indexOf('<tracking', tFrom)
    if (idx < 0) break
    const tagEnd = linear.indexOf('>', idx)
    if (tagEnd < 0) break
    const openTag = linear.slice(idx, tagEnd + 1)
    const closeIdx = tLower.indexOf('</tracking>', tagEnd)
    if (closeIdx < 0) break
    const body = linear.slice(tagEnd + 1, closeIdx)
    const event = attr(openTag, 'event')
    const url = safeHttpUrl(cdata(body))
    tFrom = closeIdx + 11
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
    errorUrl: safeHttpUrl(String(errorUrl || '').replace('[ERRORCODE]', '900')),
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
    const base = vastFetchUrl(fetchKind)
    const sep = base.includes('?') ? '&' : '?'
    const res = await fetch(base + sep + 'r=' + Date.now() + Math.random().toString(36).slice(2, 6), {
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
    if (!parsed) {
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 350 + i * 250))
      continue
    }
    if (parsed.wrapper) {
      if (!parsed.wrapperUrl) {
        if (i < tries - 1) await new Promise((r) => setTimeout(r, 350 + i * 250))
        continue
      }
      try {
        const res = await fetch(parsed.wrapperUrl, { credentials: 'omit', cache: 'no-store' })
        if (!res.ok) {
          if (i < tries - 1) await new Promise((r) => setTimeout(r, 350 + i * 250))
          continue
        }
        const inner = parseVastXml(await res.text())
        if (inner && inner.mediaUrl) return inner
      } catch {
        /* try again */
      }
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 350 + i * 250))
      continue
    }
    if (parsed.mediaUrl) return parsed
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 350 + i * 250))
  }
  return null
}

/**
 * Long-form videos:
 * - Preroll at 0:00 (handled by useVideoVastAds on mount).
 * - If longer than 8 minutes, exactly one additional mid-roll at a random
 *   time after the 8-minute mark (sticky per video; never fixed, never repeating).
 * Videos <= 8 minutes only get the preroll.
 */
export function videoInStreamBreaks(durationSec) {
  const d = Number(durationSec)
  if (!Number.isFinite(d) || d <= YT_MIDROLL_MIN_SEC) return []
  const earliest = YT_MIDROLL_MIN_SEC
  const latest = Math.max(earliest, d - 15)
  const span = latest - earliest
  const t = earliest + (span > 0 ? Math.random() * span : 0)
  return [Math.floor(t)]
}
