/**
 * Live video ingest — flip to true when RTMP/HLS ingest is wired on the deploy.
 */
import { runtimeEnv } from './runtimeEnv'

function envFlag(key, fallback = false) {
  const v = runtimeEnv(key)
  if (v === '') return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

export const LIVE_INGEST_CONNECTED = envFlag('VITE_LIVE_INGEST_CONNECTED', false)

export function liveIngestConnected() {
  return LIVE_INGEST_CONNECTED
}

export function liveListingBlockedReason() {
  if (liveIngestConnected()) return ''
  return 'Live video ingest is not connected yet. You can preview on this browser with Share screen, but you cannot list as live until ingest is wired.'
}
