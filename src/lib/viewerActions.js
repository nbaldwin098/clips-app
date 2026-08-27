/**
 * Interactive viewer controls — spend Coins on live actions
 * (SFX, lighting cue, media queue). Host sees a queue; delivery is local until ingest.
 */

import { lsGet, lsSet } from './storage'
import { spendCalabiCash } from './calabiCash'
import { postLiveChat } from './engagement'

export const VIEWER_ACTIONS = [
  { id: 'sfx_airhorn', label: 'Airhorn', cost: 50, kind: 'sfx' },
  { id: 'sfx_applause', label: 'Applause', cost: 40, kind: 'sfx' },
  { id: 'light_strobe', label: 'Strobe lights', cost: 80, kind: 'lighting' },
  { id: 'light_party', label: 'Party lights', cost: 60, kind: 'lighting' },
  { id: 'media_queue', label: 'Queue media', cost: 100, kind: 'media' },
]

const KEY = 'viewer_action_queue'

export function listViewerActions(hostId, limit = 30) {
  if (!hostId) return []
  return ((lsGet(KEY, {}) || {})[hostId] || []).slice(0, limit)
}

export function triggerViewerAction(hostId, donor, actionId, mediaUrl = '') {
  if (!hostId || !donor?.id) return { ok: false, error: 'Sign in.' }
  const action = VIEWER_ACTIONS.find((a) => a.id === actionId)
  if (!action) return { ok: false, error: 'Unknown action.' }
  const spent = spendCalabiCash(donor.id, action.cost, {
    kind: 'viewer_action',
    note: action.label,
    targetId: hostId,
  })
  if (!spent.ok) return spent
  const row = {
    id: `act_${Date.now().toString(36)}`,
    actionId: action.id,
    label: action.label,
    kind: action.kind,
    cost: action.cost,
    mediaUrl: String(mediaUrl || '').slice(0, 300),
    fromId: donor.id,
    fromHandle: donor.handle || '',
    at: new Date().toISOString(),
    status: 'queued',
  }
  const all = lsGet(KEY, {}) || {}
  const list = all[hostId] || []
  list.unshift(row)
  all[hostId] = list.slice(0, 80)
  lsSet(KEY, all)
  postLiveChat(hostId, {
    userId: donor.id,
    handle: donor.handle,
    kind: 'system',
    text: `triggered ${action.label} (${action.cost} Cash)`,
  })
  return { ok: true, row }
}

export function clearViewerAction(hostId, actionRowId) {
  const all = lsGet(KEY, {}) || {}
  all[hostId] = (all[hostId] || []).filter((r) => r.id !== actionRowId)
  lsSet(KEY, all)
  return { ok: true }
}
