/**
 * Product feature flags. Keep defaults honest for what ships today.
 */
import { runtimeEnv } from './runtimeEnv'

/** Site ads / advertiser portal are not offered. Monetization = tips, premium, Coins. */
export const FEATURE_ADS = false

/**
 * Optional browser ffmpeg.wasm compress — off by default.
 * Enable with FEATURE_CLIENT_TRANSCODE=true in code or VITE_CLIENT_TRANSCODE=1.
 * Keep original-file upload as default for iOS playability.
 */
export const FEATURE_CLIENT_TRANSCODE = false

/** Web Push subscribe UI — needs NEXT_PUBLIC_VAPID_PUBLIC_KEY to actually subscribe. */
export const FEATURE_WEB_PUSH = true

export function adsEnabled() {
  return FEATURE_ADS === true
}

export function clientTranscodeEnabled() {
  if (FEATURE_CLIENT_TRANSCODE === true) return true
  const v = String(runtimeEnv('VITE_CLIENT_TRANSCODE') || runtimeEnv('NEXT_PUBLIC_CLIENT_TRANSCODE') || '')
  return v === '1' || v.toLowerCase() === 'true'
}

export function webPushEnabled() {
  if (FEATURE_WEB_PUSH !== true) return false
  return !!String(runtimeEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY') || runtimeEnv('VITE_VAPID_PUBLIC_KEY') || '').trim()
}

/** RTMP base for OBS (MediaMTX / Mux / etc). Empty = window share only. */
export function getLiveRtmpUrl() {
  return String(runtimeEnv('VITE_LIVE_RTMP_URL') || runtimeEnv('NEXT_PUBLIC_LIVE_RTMP_URL') || '').trim()
}

/** HLS play base (e.g. https://host/live). Empty until ingest is real. */
export function getLiveHlsBase() {
  return String(runtimeEnv('VITE_LIVE_HLS_BASE') || runtimeEnv('NEXT_PUBLIC_LIVE_HLS_BASE') || '').trim()
}

/**
 * Env URLs present (RTMP and/or HLS). Does NOT mean ingest is live —
 * use liveIngestConnected() from liveIngest.js for that gate.
 */
export function liveIngestConfigured() {
  return !!(getLiveRtmpUrl() || getLiveHlsBase())
}
