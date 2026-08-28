/**
 * Start / end live lobby presence. Cloud live_lobby is SOT when configured.
 */
import { lsGet, lsSet } from './storage'
import { endLiveLobby } from './graphSync'
import { pushLiveBoardRow } from './liveBoardSync'
import { ensureStreamKey } from './streamKeys'
import {
  liveIngestConnected,
  liveListingBlockedReason,
  liveHlsPlayUrl,
} from './liveIngest'
import { provisionCloudflareLive } from './cloudflareLive'

export function getMyLiveState(userId) {
  if (!userId) return null
  const local = lsGet(`live_state_${userId}`, null)
  if (local?.isLive) return local
  return (lsGet('live_board', []) || []).find((b) => b.userId === userId && b.isLive) || null
}

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

  let provider = ''
  let streamKey = ''
  let hlsUrl = ''
  let rtmpsUrl = ''
  let connected = false

  const cf = await provisionCloudflareLive()
  if (cf.ok && cf.hlsUrl && cf.streamKey) {
    provider = 'cloudflare-stream'
    streamKey = cf.streamKey
    hlsUrl = cf.hlsUrl
    rtmpsUrl = cf.rtmpsUrl || ''
    connected = true
  } else if (liveIngestConnected()) {
    streamKey = ensureStreamKey(user.id)
    hlsUrl = streamKey ? liveHlsPlayUrl(streamKey) : ''
    connected = !!hlsUrl
    provider = connected ? 'mediamtx' : ''
  }

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
    provider,
    rtmpsUrl: rtmpsUrl || '',
    hlsUrl: hlsUrl || '',
    streamKey: streamKey || '',
    note: connected
      ? 'HLS published for viewers.'
      : (cf.message || liveListingBlockedReason() || 'Lobby listing only. Window share still works.'),
  }
  lsSet(`live_state_${user.id}`, payload)
  const board = (lsGet('live_board', []) || []).filter((b) => b.userId !== user.id)
  board.unshift(payload)
  lsSet('live_board', board.slice(0, 200))
  try {
    await pushLiveBoardRow(payload)
  } catch {}
  return { ok: true, live: payload }
}

export async function stopLiveLobby(user) {
  if (!user?.id) return { ok: false, error: 'Sign in required.' }
  const ended = await endLiveLobby(user.id)
  clearLivePresence(user.id)
  return { ok: !!ended, archived: true }
}
