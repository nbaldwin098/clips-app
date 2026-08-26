/**
 * Creator payouts are handed out by the owner after someone applies and is approved.
 * Storage cost is tracked admin-only and silently deducted from payouts.
 * Creators only see the amount they were paid — never storage line items.
 */
import { lsGet, lsSet, getImports } from './storage'
import { getViews } from './engagement'
import { listIndexedUsers } from './moderation'
import { payoutsHeld } from './trustSafety'
import { storageDueUsd, addStorageSettledUsd, storageCostUsdForCreator, bytesForCreator, formatBytes } from './storageCosts'

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

/** Public ledger rows creators may see — no storage fields. */
export function listCreatorVisiblePayouts(userId) {
  if (!userId) return []
  return listPayoutLedger()
    .filter((r) => r.userId === userId && r.status === 'sent' && r.kind !== 'storage')
    .map((r) => ({
      id: r.id,
      amount: r.amount,
      note: r.note || '',
      sentVia: r.sentVia || '',
      at: r.at,
      status: r.status,
    }))
}

export function paidForCreator(userId) {
  if (!userId) return 0
  return listPayoutLedger()
    .filter((r) => r.userId === userId && r.status === 'sent' && r.kind !== 'storage')
    .reduce((n, r) => n + (Number(r.amount) || 0), 0)
}

export function creatorBalance(userId, handle = '') {
  const views = viewsForCreator(userId, handle)
  const paid = paidForCreator(userId)
  return { views, paid }
}

/**
 * Record a payout. `amount` is the gross admin intends before storage.
 * Storage due is deducted silently; creator-facing amount is net only.
 * Admin ledger keeps gross / storage / net for books.
 */
export function recordManualPayout({ userId, handle, amount, note, sentVia }) {
  const gross = Math.round(Number(amount) * 100) / 100
  if (!userId || !Number.isFinite(gross) || gross <= 0) {
    return { ok: false, error: 'Enter a creator and a positive amount.' }
  }
  if (payoutsHeld(userId)) return { ok: false, error: 'Payouts are on hold for this account.' }

  const storageDue = storageDueUsd(userId)
  const storageTaken = Math.min(storageDue, gross)
  const net = Math.round((gross - storageTaken) * 100) / 100

  if (net <= 0 && storageTaken > 0) {
    // Entire payout applied to storage — no creator-visible payment row
    addStorageSettledUsd(userId, storageTaken)
    const list = listPayoutLedger()
    list.unshift({
      id: `stor_${Date.now()}`,
      userId,
      handle: handle || '',
      amount: 0,
      gross,
      storageDeducted: storageTaken,
      kind: 'storage',
      note: 'Storage cost applied (not shown to creator)',
      sentVia: String(sentVia || 'manual').slice(0, 40),
      status: 'sent',
      at: new Date().toISOString(),
      adminOnly: true,
    })
    lsSet(LEDGER_KEY, list)
    return {
      ok: true,
      row: null,
      net: 0,
      gross,
      storageDeducted: storageTaken,
      message: `$${storageTaken.toFixed(2)} applied to storage; creator receives $0.`,
    }
  }

  if (storageTaken > 0) addStorageSettledUsd(userId, storageTaken)

  const row = {
    id: `pay_${Date.now()}`,
    userId,
    handle: handle || '',
    amount: net,
    gross,
    storageDeducted: storageTaken,
    kind: 'payout',
    note: String(note || '').slice(0, 240),
    sentVia: String(sentVia || 'manual').slice(0, 40),
    status: 'sent',
    at: new Date().toISOString(),
  }
  const list = listPayoutLedger()
  list.unshift(row)
  lsSet(LEDGER_KEY, list)
  return {
    ok: true,
    row,
    net,
    gross,
    storageDeducted: storageTaken,
    message: storageTaken > 0
      ? `Creator paid $${net.toFixed(2)} (storage $${storageTaken.toFixed(2)} deducted, admin-only).`
      : `Creator paid $${net.toFixed(2)}.`,
  }
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
    const bal = creatorBalance(u.id, u.handle)
    seen.set(u.id, {
      userId: u.id,
      handle: u.handle,
      displayName: u.displayName,
      ...bal,
      // Admin-only fields
      storageBytes: bytesForCreator(u.id),
      storageBytesLabel: formatBytes(bytesForCreator(u.id)),
      storageMonthlyUsd: storageCostUsdForCreator(u.id),
      storageDueUsd: storageDueUsd(u.id),
    })
  }
  for (const row of getImports() || []) {
    const id = row.creatorId || row.userId
    if (!id || seen.has(id)) continue
    const bal = creatorBalance(id, row.handle)
    seen.set(id, {
      userId: id,
      handle: row.handle,
      displayName: row.handle,
      ...bal,
      storageBytes: bytesForCreator(id),
      storageBytesLabel: formatBytes(bytesForCreator(id)),
      storageMonthlyUsd: storageCostUsdForCreator(id),
      storageDueUsd: storageDueUsd(id),
    })
  }
  return [...seen.values()].sort((a, b) => (b.storageBytes || 0) - (a.storageBytes || 0))
}
