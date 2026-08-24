/**
 * Creator payouts are handed out by the owner after someone applies and is approved.
 * Views do not mint a dollar amount. There is no Stripe Connect withdraw.
 */
import { lsGet, lsSet, getImports } from './storage'
import { getViews } from './engagement'
import { listIndexedUsers } from './moderation'
import { payoutsHeld } from './trustSafety'

const SETTINGS_KEY = 'clips_payout_settings'
const LEDGER_KEY = 'clips_payout_ledger'
const CONTACT_KEY = 'clips_payout_contacts'

export function getPayoutSettings() {
  const s = lsGet(SETTINGS_KEY, null) || {}
  return {
    note: s.note || 'Paid by hand from Admin → Payouts after you apply and are approved. Not an automatic bank transfer.',
  }
}

export function setPayoutSettings(partial) {
  const next = { ...getPayoutSettings(), ...partial }
  lsSet(SETTINGS_KEY, next)
  return next
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

export function listPayoutLedger() {
  return lsGet(LEDGER_KEY, []) || []
}

export function paidForCreator(userId) {
  if (!userId) return 0
  return listPayoutLedger()
    .filter((r) => r.userId === userId && r.status === 'sent')
    .reduce((n, r) => n + (Number(r.amount) || 0), 0)
}

export function creatorBalance(userId, handle = '') {
  const views = viewsForCreator(userId, handle)
  const paid = paidForCreator(userId)
  return { views, paid }
}

export function recordManualPayout({ userId, handle, amount, note, sentVia }) {
  const n = Math.round(Number(amount) * 100) / 100
  if (!userId || !Number.isFinite(n) || n <= 0) return { ok: false, error: 'Enter a creator and a positive amount.' }
  if (payoutsHeld(userId)) return { ok: false, error: 'Payouts are on hold for this account.' }
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
  return [...seen.values()].sort((a, b) => b.paid - a.paid)
}
