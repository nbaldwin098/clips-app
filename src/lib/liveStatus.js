/**
 * Single source for lobby vs on-air badges.
 * Lobby = listed as live. On-air = lobby + ingest/share media actually connected.
 */

export function isLobbyLive(entry) {
  return !!(entry && entry.isLive)
}

export function isOnAir(entry) {
  if (!isLobbyLive(entry)) return false
  return !!(
    entry.ingestConnected
    || entry.sharing
    || entry.mediaUrl
    || entry.recordingUrl
    || entry.hlsUrl
  )
}

/** Public “Live” only when truly on-air; otherwise “Lobby”. */
export function liveBadgeLabel(entry) {
  if (!isLobbyLive(entry)) return 'Off'
  return isOnAir(entry) ? 'Live' : 'Lobby'
}

export function listLiveBoard(board = []) {
  return (Array.isArray(board) ? board : []).filter((b) => isLobbyLive(b))
}

export function listOnAirBoard(board = []) {
  return listLiveBoard(board).filter((b) => isOnAir(b))
}
