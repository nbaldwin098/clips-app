/**
 * Live video ingest + OBS connect helpers.
 * Production path: set VITE_LIVE_RTMP_URL + VITE_LIVE_HLS_BASE on Render.
 * Both URLs = ingest is on. No second “connected” flag.
 * Cloudflare Stream per-creator keys still come from live-ingest when that function is deployed.
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

/** True when both ingest + playback URLs are set, or ops forced the old flag. */
export function liveIngestConnected() {
  if (liveRtmpServerUrl() && liveHlsBaseUrl()) return true
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
  return 'Live ingest URLs are not on Render yet. Window share still works.'
}

export function getObsConnectInfo(userId) {
  const streamKey = userId ? ensureStreamKey(userId) : ''
  const serverUrl = liveRtmpServerUrl()
  const hlsBase = liveHlsBaseUrl()
  const rtmpReady = !!serverUrl
  const hlsReady = !!hlsBase
  const ingestConnected = liveIngestConnected()
  let statusNote = 'Set VITE_LIVE_RTMP_URL and VITE_LIVE_HLS_BASE on Render to the GCP VM. Window share works until then.'
  if (ingestConnected) {
    statusNote = 'OBS Custom RTMP is live. Viewers get HLS from the play base.'
  } else if (rtmpReady || hlsReady) {
    statusNote = 'Need both RTMP and HLS URLs on Render for live ingest.'
  }

  return {
    streamKey,
    serverUrl,
    hlsBase,
    rtmpReady,
    hlsReady,
    ingestConnected,
    browserShareReady: true,
    obsDownloadUrl: 'https://obsproject.com/download',
    statusNote,
    steps: rtmpReady
      ? [
          { title: 'Install OBS Studio', body: 'Free from obsproject.com.' },
          { title: 'Settings → Stream → Custom', body: 'Paste Server and Stream Key from this page.' },
          { title: 'Start Streaming', body: 'Then Go Live on Calabi so the lobby lists you.' },
        ]
      : [
          { title: 'Install OBS Studio', body: 'Free from obsproject.com.' },
          { title: 'GCP VM', body: 'Run docker/mediamtx on the Google VM. Put rtmp://IP:1935/live and http://IP:8888/live on Render.' },
          { title: 'Share a window until then', body: 'Live → window share still works with no VM.' },
        ],
  }
}
