/**
 * Live video ingest + OBS connect helpers.
 * OBS Studio is free. Browser window-share works today.
 * Custom RTMP (Server + Stream Key) activates when VITE_LIVE_RTMP_URL is set.
 * “Connected” is only true when VITE_LIVE_INGEST_CONNECTED is explicitly set
 * (after RTMP ingest + HLS playback are verified) — never invent from URL alone.
 */
import { runtimeEnv } from './runtimeEnv'
import { ensureStreamKey } from './streamKeys'

function envFlag(key, fallback = false) {
  const v = runtimeEnv(key)
  if (v === '') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

export const LIVE_INGEST_CONNECTED = envFlag('VITE_LIVE_INGEST_CONNECTED', false)
  || envFlag('NEXT_PUBLIC_LIVE_INGEST_CONNECTED', false)

/** Optional public RTMP base, e.g. rtmp://ingest.example.com/live — never invent one. */
export function liveRtmpServerUrl() {
  const raw = runtimeEnv('VITE_LIVE_RTMP_URL') || runtimeEnv('NEXT_PUBLIC_LIVE_RTMP_URL')
  const url = String(raw || '').trim()
  if (!url) return ''
  if (!/^rtmps?:\/\//i.test(url)) return ''
  return url.replace(/\/$/, '')
}

/** Optional HLS play base, e.g. https://host/live — never invent one. */
export function liveHlsBaseUrl() {
  const raw = runtimeEnv('VITE_LIVE_HLS_BASE') || runtimeEnv('NEXT_PUBLIC_LIVE_HLS_BASE')
  const url = String(raw || '').trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) return ''
  return url.replace(/\/$/, '')
}

/**
 * True only when ops set the connected flag after verifying RTMP→HLS.
 * Having RTMP/HLS env URLs alone does NOT mean ingest is live.
 */
export function liveIngestConnected() {
  return !!LIVE_INGEST_CONNECTED
}

/** Env has RTMP and/or HLS URLs wired (still may not be connected). */
export function liveIngestUrlsConfigured() {
  return !!(liveRtmpServerUrl() || liveHlsBaseUrl())
}

/**
 * Build HLS playlist URL for a known stream key (host publishes key/url on lobby).
 * Returns '' when HLS base is unset — never invent a host.
 */
export function liveHlsPlayUrl(streamKey) {
  const base = liveHlsBaseUrl()
  const key = String(streamKey || '').trim()
  if (!base || !key) return ''
  const safe = encodeURIComponent(key).replace(/%2F/gi, '/')
  return `${base}/${safe}/index.m3u8`
}

export function liveListingBlockedReason() {
  if (liveIngestConnected()) return ''
  if (liveRtmpServerUrl() && !LIVE_INGEST_CONNECTED) {
    return 'RTMP URL is set, but ingest is not marked connected yet (set VITE_LIVE_INGEST_CONNECTED after HLS plays). Window share still works.'
  }
  return 'Live RTMP ingest is not connected yet. You can still go live with a free OBS window share on this browser (Screen / OBS window).'
}

/**
 * Everything a creator needs to wire OBS (free).
 * @returns {{
 *   streamKey: string,
 *   serverUrl: string,
 *   hlsBase: string,
 *   rtmpReady: boolean,
 *   hlsReady: boolean,
 *   ingestConnected: boolean,
 *   browserShareReady: boolean,
 *   obsDownloadUrl: string,
 *   statusNote: string,
 *   steps: { title: string, body: string }[],
 * }}
 */
export function getObsConnectInfo(userId) {
  const streamKey = userId ? ensureStreamKey(userId) : ''
  const serverUrl = liveRtmpServerUrl()
  const hlsBase = liveHlsBaseUrl()
  const rtmpReady = !!serverUrl
  const hlsReady = !!hlsBase
  const ingestConnected = liveIngestConnected()
  let statusNote = 'Window share works now. Custom RTMP appears when VITE_LIVE_RTMP_URL is set.'
  if (ingestConnected) {
    statusNote = 'Ingest marked connected. Use Custom RTMP in OBS; viewers get HLS when the play base is set.'
  } else if (rtmpReady && hlsReady) {
    statusNote = 'RTMP + HLS URLs are configured, but VITE_LIVE_INGEST_CONNECTED is not set yet — do not treat this as live ingest.'
  } else if (rtmpReady) {
    statusNote = 'RTMP server URL is set. Set VITE_LIVE_HLS_BASE and flip VITE_LIVE_INGEST_CONNECTED only after HLS plays on a second device.'
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
          { title: 'Install OBS Studio', body: 'OBS is free. Download it from obsproject.com for Windows, Mac, or Linux.' },
          { title: 'Open Settings → Stream', body: 'Service: Custom. Paste the Server URL and your Stream Key from this page.' },
          { title: 'Start Streaming', body: ingestConnected
            ? 'Click Start Streaming in OBS. Then list yourself Live on calabi when you are ready.'
            : 'Click Start Streaming in OBS. Until ingest is marked connected, also share the OBS window on Live so viewers can see you.' },
        ]
      : [
          { title: 'Install OBS Studio', body: 'OBS is free. Download it from obsproject.com for Windows, Mac, or Linux.' },
          { title: 'Build your scene', body: 'Add game capture, display capture, webcam, and mic like a normal OBS setup.' },
          { title: 'Share the OBS window', body: 'On Live → Screen / OBS window, pick your OBS preview (or turn on OBS → Start Virtual Camera and share that camera). Free — no paid RTMP needed.' },
        ],
  }
}
