/**
 * Single source for lobby vs on-air badges.
 * Lobby = listed as live and still inside the session TTL.
 * On-air = lobby + real ingest/share media — not a provisioned HLS URL.
 */

/** Streams older than this must not look live (covers 41h lobby ghosts). */
export const MAX_LIVE_SESSION_MS = 12 * 60 * 60 * 1000

export function liveSessionAgeMs(entry, now = Date.now()) {
  if (!entry?.startedAt) return Number.POSITIVE_INFINITY
  const t = new Date(entry.startedAt).getTime()
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY
  return now - t
}

export function isFreshLive(entry, now = Date.now()) {
  const age = liveSessionAgeMs(entry, now)
  return age >= 0 && age < MAX_LIVE_SESSION_MS
}

export function isLobbyLive(entry, now = Date.now()) {
  if (!entry || entry.demo) return false
  return !!(entry.isLive && isFreshLive(entry, now))
}

export function isOnAir(entry, now = Date.now()) {
  if (!isLobbyLive(entry, now)) return false
  // HLS/RTMP URLs alone are not proof of a live encoder.
  return !!(
    entry.ingestConnected
    || entry.sharing
    || entry.mediaUrl
    || entry.recordingUrl
  )
}

/** Public “Live” only when truly on-air; otherwise “Lobby”. */
export function liveBadgeLabel(entry, now = Date.now()) {
  if (!isLobbyLive(entry, now)) return 'Off'
  return isOnAir(entry, now) ? 'Live' : 'Lobby'
}

export function listLiveBoard(board = [], now = Date.now()) {
  return (Array.isArray(board) ? board : []).filter((b) => isLobbyLive(b, now))
}

export function listOnAirBoard(board = [], now = Date.now()) {
  return listLiveBoard(board, now).filter((b) => isOnAir(b, now))
}

export function listLobbyOnlyBoard(board = [], now = Date.now()) {
  return listLiveBoard(board, now).filter((b) => !isOnAir(b, now))
}
