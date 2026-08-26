/**
 * Live pool challenges — creator sets a Cash target; when hit they fulfill the promise.
 */

import { lsGet, lsSet } from './storage'
import { postLiveChat } from './engagement'
import { spendCalabiCash, creditCalabiCash, creatorCashShare } from './calabiCash'
import { CREATOR_REV_SHARE } from './revenueSplit'
import { pushLiveFeatureState } from './liveFeatureSync'

const KEY = 'live_pools'

function all() {
  return lsGet(KEY, {}) || {}
}

function save(map) {
  lsSet(KEY, map)
  pushLiveFeatureState().catch(() => {})
}

export function getActivePool(hostId) {
  if (!hostId) return null
  const p = all()[hostId]
  if (!p || p.status !== 'open') return null
  return p
}

export function listPools(hostId) {
  const p = all()[hostId]
  return p ? [p] : []
}

export function startPool(hostId, { title, targetUnits, promise } = {}) {
  if (!hostId) return { ok: false, error: 'Host required.' }
  const target = Math.floor(Number(targetUnits) || 0)
  if (target < 50) return { ok: false, error: 'Target at least 50 Cash.' }
  const map = all()
  if (map[hostId]?.status === 'open') return { ok: false, error: 'A pool is already open.' }
  const pool = {
    id: `pool_${Date.now().toString(36)}`,
    hostId,
    title: String(title || 'Pool challenge').slice(0, 80),
    promise: String(promise || '').slice(0, 200),
    targetUnits: target,
    raisedUnits: 0,
    status: 'open',
    contributors: [],
    startedAt: new Date().toISOString(),
  }
  map[hostId] = pool
  save(map)
  postLiveChat(hostId, {
    userId: `system:${hostId}`,
    handle: 'calabi',
    kind: 'system',
    text: `Pool started: ${pool.title} — ${target} Cash. ${pool.promise || ''}`.trim(),
  })
  return { ok: true, pool }
}

export function contributeToPool(hostId, donor, units) {
  if (!hostId || !donor?.id) return { ok: false, error: 'Sign in to contribute.' }
  const map = all()
  const pool = map[hostId]
  if (!pool || pool.status !== 'open') return { ok: false, error: 'No open pool.' }
  const n = Math.floor(Number(units) || 0)
  if (n < 1) return { ok: false, error: 'Enter Cash amount.' }
  const spent = spendCalabiCash(donor.id, n, {
    kind: 'pool_contribute',
    note: pool.title,
    targetId: hostId,
  })
  if (!spent.ok) return spent
  const share = creatorCashShare(n, CREATOR_REV_SHARE)
  creditCalabiCash(hostId, share.creator, {
    kind: 'pool_earn',
    note: `Pool from @${donor.handle || 'viewer'}`,
  })
  pool.raisedUnits += n
  pool.contributors.unshift({
    userId: donor.id,
    handle: donor.handle || 'viewer',
    units: n,
    at: new Date().toISOString(),
  })
  pool.contributors = pool.contributors.slice(0, 100)
  postLiveChat(hostId, {
    userId: donor.id,
    handle: donor.handle,
    kind: 'donation',
    amount: n / 100,
    text: `added ${n} Cash to pool (${pool.raisedUnits}/${pool.targetUnits})`,
  })
  if (pool.raisedUnits >= pool.targetUnits) {
    pool.status = 'hit'
    pool.hitAt = new Date().toISOString()
    postLiveChat(hostId, {
      userId: `system:${hostId}`,
      handle: 'calabi',
      kind: 'system',
      text: `Pool hit! Host should fulfill: ${pool.promise || pool.title}`,
    })
  }
  map[hostId] = pool
  save(map)
  return { ok: true, pool }
}

export function closePool(hostId) {
  const map = all()
  if (!map[hostId]) return { ok: false }
  map[hostId] = { ...map[hostId], status: 'closed', closedAt: new Date().toISOString() }
  save(map)
  return { ok: true }
}
