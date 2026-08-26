/**
 * Live video ingest + OBS connect helpers.
 * OBS Studio is free. Browser window-share works today.
 * Custom RTMP (Server + Stream Key) activates when VITE_LIVE_RTMP_URL is set.
 */
import { runtimeEnv } from './runtimeEnv'
import { ensureStreamKey } from './streamKeys'

function envFlag(key, fallback = false) {
  const v = runtimeEnv(key)
  if (v === '') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

export const LIVE_INGEST_CONNECTED = envFlag('VITE_LIVE_INGEST_CONNECTED', false)

/** Optional public RTMP base, e.g. rtmp://ingest.example.com/live — never invent one. */
export function liveRtmpServerUrl() {
  const raw = runtimeEnv('VITE_LIVE_RTMP_URL') || runtimeEnv('NEXT_PUBLIC_LIVE_RTMP_URL')
  const url = String(raw || '').trim()
  if (!url) return ''
  if (!/^rtmps?:\/\//i.test(url)) return ''
  return url.replace(/\/$/, '')
}

export function liveIngestConnected() {
  return LIVE_INGEST_CONNECTED || !!liveRtmpServerUrl()
}

export function liveListingBlockedReason() {
  if (liveIngestConnected()) return ''
  return 'Live RTMP ingest is not connected yet. You can still go live with a free OBS window share on this browser (Screen / OBS window).'
}

/**
 * Everything a creator needs to wire OBS (free).
 * @returns {{
 *   streamKey: string,
 *   serverUrl: string,
 *   rtmpReady: boolean,
 *   browserShareReady: boolean,
 *   obsDownloadUrl: string,
 *   steps: { title: string, body: string }[],
 * }}
 */
export function getObsConnectInfo(userId) {
  const streamKey = userId ? ensureStreamKey(userId) : ''
  const serverUrl = liveRtmpServerUrl()
  const rtmpReady = !!serverUrl
  return {
    streamKey,
    serverUrl,
    rtmpReady,
    browserShareReady: true,
    obsDownloadUrl: 'https://obsproject.com/download',
    steps: rtmpReady
      ? [
          { title: 'Install OBS Studio', body: 'OBS is free. Download it from obsproject.com for Windows, Mac, or Linux.' },
          { title: 'Open Settings → Stream', body: 'Service: Custom. Paste the Server URL and your Stream Key from this page.' },
          { title: 'Start Streaming', body: 'Click Start Streaming in OBS. Then list yourself Live on calabi when you are ready.' },
        ]
      : [
          { title: 'Install OBS Studio', body: 'OBS is free. Download it from obsproject.com for Windows, Mac, or Linux.' },
          { title: 'Build your scene', body: 'Add game capture, display capture, webcam, and mic like a normal OBS setup.' },
          { title: 'Share the OBS window', body: 'On Live → Screen / OBS window, pick your OBS preview (or turn on OBS → Start Virtual Camera and share that camera). Free — no paid RTMP needed.' },
        ],
  }
}
