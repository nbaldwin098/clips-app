/**
 * Live video ingest — flip to true when RTMP/HLS ingest is wired on the deploy.
 */
function envFlag(key, fallback = false) {
  try {
    const v = import.meta.env?.[key]
    if (v == null || String(v).trim() === '') return fallback
    return String(v).trim() === '1' || String(v).toLowerCase() === 'true'
  } catch {
    return fallback
  }
}

export const LIVE_INGEST_CONNECTED = envFlag('VITE_LIVE_INGEST_CONNECTED', false)

export function liveIngestConnected() {
  return LIVE_INGEST_CONNECTED
}

export function liveListingBlockedReason() {
  if (liveIngestConnected()) return ''
  return 'Live video ingest is not connected yet. You can preview on this browser with Share screen, but you cannot list as live until ingest is wired.'
}
