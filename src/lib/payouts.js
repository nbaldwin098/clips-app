/**
 * Creator earnings from views. Money is sent by the owner by hand.
 * The dashboard shows earned / pending / paid. There is no Stripe Connect withdraw.
 */
import { lsGet, lsSet, getImports } from './storage'
import { getViews } from './engagement'
import { listIndexedUsers } from './moderation'

const SETTINGS_KEY = 'clips_payout_settings'
const OVERRIDES_KEY = 'clips_payout_rpm_overrides'
const LEDGER_KEY = 'clips_payout_ledger'
const CONTACT_KEY = 'clips_payout_contacts'

const DEFAULT_RPM = 1

export function getPayoutSettings() {
  const s = lsGet(SETTINGS_KEY, null) || {}
  const rpm = Number(s.rpmPerThousand)
  return {
    rpmPerThousand: Number.isFinite(rpm) && rpm >= 0 ? rpm : DEFAULT_RPM,
    note: s.note || 'Paid by hand from Admin → Payouts. Not an automatic bank transfer.',
  }
}

export function setPayoutSettings(partial) {
  const next = { ...getPayoutSettings(), ...partial }
  const rpm = Number(next.rpmPerThousand)
  next.rpmPerThousand = Number.isFinite(rpm) ? Math.max(0, Math.min(1000, rpm)) : DEFAULT_RPM
  lsSet(SETTINGS_KEY, next)
  return next
}

export function getCreatorRpm(userId) {
  const overrides = lsGet(OVERRIDES_KEY, {}) || {}
  if (userId && overrides[userId] != null && Number.isFinite(Number(overrides[userId]))) {
    return Math.max(0, Number(overrides[userId]))
  }
  return getPayoutSettings().rpmPerThousand
}

export function setCreatorRpm(userId, rpm) {
  if (!userId) return getCreatorRpm(userId)
  const overrides = lsGet(OVERRIDES_KEY, {}) || {}
  const n = Number(rpm)
  if (!Number.isFinite(n) || n < 0) delete overrides[userId]
  else overrides[userId] = Math.min(1000, n)
  lsSet(OVERRIDES_KEY, overrides)
  return getCreatorRpm(userId)
}

export function viewsForCreator(userId, handle = '') {
  if (!userId && !handle) return 0
  const h = String(handle || '').toLowerCase()
  let views = 0
  for (const row of getImports() || []) {
    const cid = row.creatorId || row.userId
    const match = (userId && cid === userId) || (h && String(row.handle || '').toLowerCase() === h)
    if (!match) continue
    views += getViews(row.id) || row.views || 0
  }
  return views
}

export function earnedForCreator(userId, handle = '') {
  const views = viewsForCreator(userId, handle)
  const rpm = getCreatorRpm(userId)
  return Math.round((views / 1000) * rpm * 100) / 100
}

export function listPayoutLedger() {
  return lsGet(LEDGER_KEY, []) || []
}

export function paidForCreator(userId) {
  if (!userId) return 0
  return listPayoutLedger()
    .filter((r) => r.userId === userId && r.status === 'sent')
    .reduce((n, r) => n + (Number(r.amount) || 0), 0)
}

export function pendingForCreator(userId, handle = '') {
  const earned = earnedForCreator(userId, handle)
  const paid = paidForCreator(userId)
  return Math.round((earned - paid) * 100) / 100
}

export function creatorBalance(userId, handle = '') {
  const views = viewsForCreator(userId, handle)
  const rpm = getCreatorRpm(userId)
  const earned = earnedForCreator(userId, handle)
  const paid = paidForCreator(userId)
  const pending = pendingForCreator(userId, handle)
  return { views, rpm, earned, paid, pending }
}

export function recordManualPayout({ userId, handle, amount, note, sentVia }) {
  const n = Math.round(Number(amount) * 100) / 100
  if (!userId || !Number.isFinite(n) || n <= 0) return { ok: false, error: 'Enter a creator and a positive amount.' }
  const row = {
    id: `pay_${Date.now()}`,
    userId,
    handle: handle || '',
    amount: n,
    note: String(note || '').slice(0, 240),
    sentVia: String(sentVia || 'manual').slice(0, 40),
    status: 'sent',
    at: new Date().toISOString(),
  }
  const list = listPayoutLedger()
  list.unshift(row)
  lsSet(LEDGER_KEY, list)
  return { ok: true, row }
}

export function getPayoutContact(userId) {
  if (!userId) return { method: 'paypal', handle: '', note: '' }
  const all = lsGet(CONTACT_KEY, {}) || {}
  return { method: 'paypal', handle: '', note: '', ...(all[userId] || {}) }
}

export function setPayoutContact(userId, partial) {
  if (!userId) return getPayoutContact(userId)
  const all = lsGet(CONTACT_KEY, {}) || {}
  const next = { ...getPayoutContact(userId), ...partial }
  all[userId] = next
  lsSet(CONTACT_KEY, all)
  return next
}

export function listCreatorBalances() {
  const seen = new Map()
  for (const u of listIndexedUsers()) {
    if (!u?.id) continue
    seen.set(u.id, { userId: u.id, handle: u.handle, displayName: u.displayName, ...creatorBalance(u.id, u.handle) })
  }
  for (const row of getImports() || []) {
    const id = row.creatorId || row.userId
    if (!id || seen.has(id)) continue
    seen.set(id, { userId: id, handle: row.handle, displayName: row.handle, ...creatorBalance(id, row.handle) })
  }
  return [...seen.values()].sort((a, b) => b.pending - a.pending)
}
