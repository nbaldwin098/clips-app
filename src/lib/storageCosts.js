/**
 * Admin-only storage cost estimates for creator media.
 * Never surface these numbers in creator dashboards — only Admin UI.
 */
import { lsGet, lsSet, getImports } from './storage'
import { listIndexedUsers } from './moderation'

const RATE_KEY = 'clips_storage_usd_per_gb_month'
const SETTLED_KEY = 'clips_storage_settled_usd'

/** Default ~ cloud object storage ballpark; admin can change. */
const DEFAULT_USD_PER_GB_MONTH = 0.023

export function getStorageUsdPerGbMonth() {
  const n = Number(lsGet(RATE_KEY, DEFAULT_USD_PER_GB_MONTH))
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_USD_PER_GB_MONTH
}

export function setStorageUsdPerGbMonth(rate) {
  const n = Math.max(0, Number(rate) || 0)
  lsSet(RATE_KEY, n)
  return n
}

function settledMap() {
  const m = lsGet(SETTLED_KEY, {}) || {}
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {}
}

/** USD already deducted from payouts for this creator (internal). */
export function storageSettledUsd(userId) {
  if (!userId) return 0
  return Number(settledMap()[userId]) || 0
}

export function addStorageSettledUsd(userId, amount) {
  if (!userId) return 0
  const n = Math.max(0, Number(amount) || 0)
  if (!n) return storageSettledUsd(userId)
  const all = settledMap()
  all[userId] = Math.round((storageSettledUsd(userId) + n) * 100) / 100
  lsSet(SETTLED_KEY, all)
  return all[userId]
}

export function bytesForCreator(userId) {
  if (!userId) return 0
  let bytes = 0
  for (const row of getImports() || []) {
    const cid = row.creatorId || row.userId
    if (cid !== userId) continue
    const b = Number(row.storedBytes) || 0
    if (b > 0) bytes += b
  }
  return bytes
}

/** Monthly storage cost estimate at current rate × current bytes. */
export function storageCostUsdForCreator(userId) {
  const bytes = bytesForCreator(userId)
  const gb = bytes / (1024 * 1024 * 1024)
  return Math.round(gb * getStorageUsdPerGbMonth() * 100) / 100
}

/** Cost not yet deducted from a payout. */
export function storageDueUsd(userId) {
  const cost = storageCostUsdForCreator(userId)
  const settled = storageSettledUsd(userId)
  return Math.max(0, Math.round((cost - settled) * 100) / 100)
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** Admin table rows — never show in creator UI. */
export function listCreatorStorageCosts() {
  const seen = new Map()
  for (const u of listIndexedUsers()) {
    if (!u?.id) continue
    const bytes = bytesForCreator(u.id)
    if (!bytes) continue
    seen.set(u.id, {
      userId: u.id,
      handle: u.handle || '',
      displayName: u.displayName || u.handle || u.id,
      bytes,
      bytesLabel: formatBytes(bytes),
      monthlyUsd: storageCostUsdForCreator(u.id),
      dueUsd: storageDueUsd(u.id),
      settledUsd: storageSettledUsd(u.id),
    })
  }
  for (const row of getImports() || []) {
    const id = row.creatorId || row.userId
    if (!id || seen.has(id)) continue
    const bytes = bytesForCreator(id)
    if (!bytes) continue
    seen.set(id, {
      userId: id,
      handle: row.handle || '',
      displayName: row.displayName || row.handle || id,
      bytes,
      bytesLabel: formatBytes(bytes),
      monthlyUsd: storageCostUsdForCreator(id),
      dueUsd: storageDueUsd(id),
      settledUsd: storageSettledUsd(id),
    })
  }
  return [...seen.values()].sort((a, b) => b.bytes - a.bytes)
}
