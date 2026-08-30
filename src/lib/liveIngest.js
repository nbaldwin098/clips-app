/**
 * Live video ingest + OBS connect helpers.
 */
import { runtimeEnv } from './runtimeEnv'
import { ensureStreamKey } from './streamKeys'

function envFlag(key, fallback = false) {
  const v = runtimeEnv(key)
  if (v === '') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

export function liveRtmpServerUrl() {
  const raw = runtimeEnv('VITE_LIVE_RTMP_URL') || runtimeEnv('NEXT_PUBLIC_LIVE_RTMP_URL')
  const url = String(raw || '').trim()
  if (!url) return ''
  if (!/^rtmps?:\/\//i.test(url)) return ''
  return url.replace(/\/$/, '')
}

export function liveHlsBaseUrl() {
  const raw = runtimeEnv('VITE_LIVE_HLS_BASE') || runtimeEnv('NEXT_PUBLIC_LIVE_HLS_BASE')
  const url = String(raw || '').trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) return ''
  return url.replace(/\/$/, '')
}

export function liveIngestConnected() {
  // URLs alone must never invent a connected ingest. Flip the flag only
  // after a second device can actually play HLS.
  return envFlag('VITE_LIVE_INGEST_CONNECTED', false)
    || envFlag('NEXT_PUBLIC_LIVE_INGEST_CONNECTED', false)
}

export const LIVE_INGEST_CONNECTED = liveIngestConnected()

export function liveIngestUrlsConfigured() {
  return !!(liveRtmpServerUrl() || liveHlsBaseUrl())
}

export function liveHlsPlayUrl(streamKey) {
  const base = liveHlsBaseUrl()
  const key = String(streamKey || '').trim()
  if (!base || !key) return ''
  const safe = encodeURIComponent(key).replace(/%2F/gi, '/')
  return `${base}/${safe}/index.m3u8`
}

export function liveListingBlockedReason() {
  if (liveIngestConnected()) return ''
  return 'Live ingest is not connected. Share a window or camera from this page — OBS/RTMP stays off until a second device can play HLS.'
}

export function getObsConnectInfo(userId) {
  const streamKey = userId ? ensureStreamKey(userId) : ''
  const serverUrl = liveRtmpServerUrl()
  const hlsBase = liveHlsBaseUrl()
  const ingestConnected = liveIngestConnected()
  let statusNote = 'Set VITE_LIVE_RTMP_URL and VITE_LIVE_HLS_BASE on Render.'
  if (ingestConnected) statusNote = 'OBS Custom RTMP and in-site Go live from here use the same server.'
  return {
    streamKey,
    serverUrl,
    hlsBase,
    rtmpReady: !!serverUrl,
    hlsReady: !!hlsBase,
    ingestConnected,
    browserShareReady: true,
    obsDownloadUrl: 'https://obsproject.com/download',
    statusNote,
    steps: [],
  }
}

export function getLiveWhipBase() {
  const raw = String(runtimeEnv('VITE_LIVE_WHIP_URL') || runtimeEnv('NEXT_PUBLIC_LIVE_WHIP_URL') || '').trim()
  if (raw) return raw.replace(/\/$/, '')
  const hls = liveHlsBaseUrl()
  try {
    if (!hls) return ''
    const u = new URL(hls)
    u.port = '8889'
    u.pathname = '/live'
    return u.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

export function liveWhipUrl(streamKey) {
  const base = getLiveWhipBase()
  const key = String(streamKey || '').trim()
  if (!base || !key) return ''
  return `${base}/${encodeURIComponent(key)}/whip`
}
