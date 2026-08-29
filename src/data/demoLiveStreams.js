/** Live lobby is ingest-only. Never invent watchers or demo streamers. */
export const DEMO_LIVE_STREAMS = []

export function mergeDemoLiveBoard(board = []) {
  const real = Array.isArray(board) ? board.filter((b) => b && !b.demo) : []
  return real
}
