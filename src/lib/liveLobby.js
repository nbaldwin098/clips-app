/**
 * Start / end live lobby presence. Cloud live_lobby is SOT when configured.
 * Ending always archives a VOD row (session record; mediaUrl only when ingest recorded one).
 */
import { lsGet, lsSet } from './storage'
import { pushLiveLobby, endLiveLobby } from './graphSync'
import { liveIngestConnected, liveListingBlockedReason } from './liveIngest'

export function getMyLiveState(userId) {
  if (!userId) return null
  const local = lsGet(`live_state_${userId}`, null)
  if (local?.isLive) return local
  return (lsGet('live_board', []) || []).find((b) => b.userId === userId && b.isLive) || null
}

export async function startLiveLobby(user, { title = '', category = '' } = {}) {
  if (!user?.id) return { ok: false, error: 'Sign in required.' }
  const startedAt = new Date().toISOString()
  const payload = {
    userId: user.id,
    handle: user.handle || '',
    displayName: user.displayName || user.handle || 'Creator',
    avatarUrl: user.avatarUrl || '',
    title: String(title || `${user.handle || 'Creator'} live`).slice(0, 120),
    category: String(category || '').slice(0, 64),
    isLive: true,
    startedAt,
    watchers: 0,
    watcherIds: [],
    ingestConnected: liveIngestConnected(),
    note: liveIngestConnected()
      ? ''
      : liveListingBlockedReason() || 'Lobby listing only until RTMP ingest or browser share is connected.',
  }
  lsSet(`live_state_${user.id}`, payload)
  const board = (lsGet('live_board', []) || []).filter((b) => b.userId !== user.id)
  board.unshift(payload)
  lsSet('live_board', board.slice(0, 200))
  try {
    await pushLiveLobby(payload)
  } catch {}
  return { ok: true, live: payload }
}

export async function stopLiveLobby(user) {
  if (!user?.id) return { ok: false, error: 'Sign in required.' }
  const ended = await endLiveLobby(user.id)
  return { ok: !!ended, archived: true }
}
