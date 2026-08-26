/**
 * YouTube-style raids — send your viewers to another live channel.
 */

import { lsGet, lsSet } from './storage'
import { postLiveChat } from './engagement'
import { endLiveLobby, pushLiveLobby } from './graphSync'

const KEY = 'live_raids'

export function listRecentRaids(limit = 20) {
  return (lsGet(KEY, []) || []).slice(0, limit)
}

export function raidToStream({ from, to, watchers = 0 }) {
  if (!from?.userId || !to?.userId) return { ok: false, error: 'Pick a live destination.' }
  if (from.userId === to.userId) return { ok: false, error: 'Cannot raid yourself.' }
  const row = {
    id: `raid_${Date.now().toString(36)}`,
    fromId: from.userId,
    fromHandle: from.handle || '',
    toId: to.userId,
    toHandle: to.handle || '',
    watchers: Number(watchers) || 0,
    at: new Date().toISOString(),
  }
  const all = lsGet(KEY, []) || []
  all.unshift(row)
  lsSet(KEY, all.slice(0, 100))

  postLiveChat(from.userId, {
    userId: 'system:raid',
    handle: 'calabi',
    kind: 'system',
    text: `Raiding @${row.toHandle} with ${row.watchers} viewers…`,
  })
  postLiveChat(to.userId, {
    userId: 'system:raid',
    handle: 'calabi',
    kind: 'system',
    text: `Incoming raid from @${row.fromHandle} (${row.watchers} viewers)!`,
  })

  // End source lobby and bump destination watcher count locally.
  try {
    endLiveLobby(from.userId)
    const board = (lsGet('live_board', []) || []).map((b) => {
      if (b.userId !== to.userId) return b
      return { ...b, watchers: (Number(b.watchers) || 0) + (Number(watchers) || 0) }
    })
    lsSet('live_board', board)
    const dest = board.find((b) => b.userId === to.userId)
    if (dest) pushLiveLobby(dest).catch(() => {})
  } catch {}

  return { ok: true, raid: row }
}
