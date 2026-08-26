/**
 * Donation requests — tip with a request; funds held until streamer fulfills
 * and admin releases escrow.
 */

import { lsGet, lsSet } from './storage'
import { spendCalabiCash, creditCalabiCash, creatorCashShare } from './calabiCash'
import { CREATOR_REV_SHARE } from './revenueSplit'
import { postLiveChat } from './engagement'
import { createNotification } from './notifications'

const KEY = 'donation_escrow'

function all() {
  return lsGet(KEY, []) || []
}

function save(rows) {
  lsSet(KEY, rows.slice(0, 400))
}

export function listEscrow({ status, creatorId, limit = 50 } = {}) {
  let rows = all()
  if (status) rows = rows.filter((r) => r.status === status)
  if (creatorId) rows = rows.filter((r) => r.creatorId === creatorId)
  return rows.slice(0, limit)
}

export function createDonationRequest({ donor, creatorId, units, requestText, contentId = '', kind = 'live_request' }) {
  if (!donor?.id || !creatorId) return { ok: false, error: 'Missing parties.' }
  const n = Math.floor(Number(units) || 0)
  if (n < 10) return { ok: false, error: 'Request tips need at least 10 Cash.' }
  const text = String(requestText || '').trim().slice(0, 240)
  if (!text) return { ok: false, error: 'Describe the request.' }
  const spent = spendCalabiCash(donor.id, n, {
    kind: 'escrow_hold',
    note: text,
    targetId: creatorId,
  })
  if (!spent.ok) return spent
  const row = {
    id: `esc_${Date.now().toString(36)}`,
    donorId: donor.id,
    donorHandle: donor.handle || '',
    creatorId,
    contentId,
    kind,
    units: n,
    requestText: text,
    status: 'held', // held → fulfilled_pending_admin → released | refunded
    createdAt: new Date().toISOString(),
  }
  const rows = all()
  rows.unshift(row)
  save(rows)
  if (kind === 'live_request') {
    postLiveChat(creatorId, {
      userId: donor.id,
      handle: donor.handle,
      kind: 'donation',
      amount: n / 100,
      text: `request (${n} Cash held): ${text}`,
    })
  }
  createNotification({
    userId: creatorId,
    type: 'premium',
    title: `Request tip from @${donor.handle || 'viewer'}`,
    body: `${n} Cash held — ${text}`,
    view: 'live',
  })
  return { ok: true, row }
}

/** Streamer marks request done; still needs admin to release Cash. */
export function markRequestFulfilled(id, creatorId) {
  const rows = all()
  const row = rows.find((r) => r.id === id)
  if (!row || row.creatorId !== creatorId) return { ok: false, error: 'Not found.' }
  if (row.status !== 'held') return { ok: false, error: 'Not held.' }
  row.status = 'fulfilled_pending_admin'
  row.fulfilledAt = new Date().toISOString()
  save(rows)
  return { ok: true, row }
}

export function adminReleaseEscrow(id, adminNote = '') {
  const rows = all()
  const row = rows.find((r) => r.id === id)
  if (!row) return { ok: false, error: 'Not found.' }
  if (row.status !== 'fulfilled_pending_admin' && row.status !== 'held') {
    return { ok: false, error: 'Cannot release.' }
  }
  const share = creatorCashShare(row.units, CREATOR_REV_SHARE)
  creditCalabiCash(row.creatorId, share.creator, {
    kind: 'escrow_release',
    note: row.requestText,
  })
  row.status = 'released'
  row.releasedAt = new Date().toISOString()
  row.adminNote = String(adminNote || '').slice(0, 120)
  row.creatorReceived = share.creator
  row.platformKept = share.platform
  save(rows)
  createNotification({
    userId: row.creatorId,
    type: 'premium',
    title: 'Request tip released',
    body: `${share.creator} Cash credited (80% of ${row.units})`,
    view: 'wallet',
  })
  return { ok: true, row }
}

export function adminRefundEscrow(id, adminNote = '') {
  const rows = all()
  const row = rows.find((r) => r.id === id)
  if (!row) return { ok: false, error: 'Not found.' }
  if (row.status === 'released' || row.status === 'refunded') return { ok: false, error: 'Already closed.' }
  creditCalabiCash(row.donorId, row.units, {
    kind: 'escrow_refund',
    note: row.requestText,
  })
  row.status = 'refunded'
  row.refundedAt = new Date().toISOString()
  row.adminNote = String(adminNote || '').slice(0, 120)
  save(rows)
  return { ok: true, row }
}
