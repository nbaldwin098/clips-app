/**
 * Start / end live lobby presence. Cloud live_lobby is SOT when configured.
 * Ending clears presence; VOD archive only when a recording / ingest existed.
 */
import { lsGet, lsSet } from './storage'
import { pushLiveLobby, endLiveLobby } from './graphSync'
import { ensureStreamKey } from './streamKeys'
import {
  liveIngestConnected,
  liveListingBlockedReason,
  liveHlsPlayUrl,
} from './liveIngest'

export function getMyLiveState(userId) {
  if (!userId) return null
  const local = lsGet(`live_state_${userId}`, null)
  if (local?.isLive) return local
  return (lsGet('live_board', []) || []).find((b) => b.userId === userId && b.isLive) || null
}

/** Drop local lobby presence for a user (board + live_state). */
export function clearLivePresence(userId) {
  if (!userId) return
  try {
    lsSet(`live_state_${userId}`, null)
  } catch {}
  try {
    const board = (lsGet('live_board', []) || []).filter((b) => b.userId !== userId)
    lsSet('live_board', board)
  } catch {}
}

export async function startLiveLobby(user, { title = '', category = '' } = {}) {
  if (!user?.id) return { ok: false, error: 'Sign in required.' }
  const startedAt = new Date().toISOString()
  const connected = liveIngestConnected()
  const streamKey = connected ? ensureStreamKey(user.id) : ''
  const hlsUrl = connected && streamKey ? liveHlsPlayUrl(streamKey) : ''
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
    ingestConnected: connected,
    // Only publish HLS when ingest is marked connected — never invent a play URL.
    hlsUrl: hlsUrl || '',
    streamKey: streamKey || '',
    note: connected
      ? (hlsUrl ? 'HLS playback URL published for viewers.' : 'Ingest marked connected; set VITE_LIVE_HLS_BASE for viewer HLS.')
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
  clearLivePresence(user.id)
  return { ok: !!ended, archived: true }
}
