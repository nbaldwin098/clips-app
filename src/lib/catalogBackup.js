/**
 * Catalog backup — last-known-good snapshot of session catalog.
 * Used before intentional deletes and after successful cloud sync.
 * This is a safety net, not a full cloud backup service.
 */
import { lsGet, lsSet, getImports, replaceImportsFromCloud } from './storage'
import { clearFrozenFeeds } from './frozenFeeds'
import { notifyContentChanged } from './contentSync'

const BACKUP_KEY = 'calabi_catalog_backup_v1'
const HISTORY_KEY = 'calabi_catalog_backup_history_v1'
const MAX_HISTORY = 3

function sanitizeRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r && r.id)
    .map((r) => ({ ...r }))
}

/** Snapshot current catalog. Keeps latest + short rolling history. */
export function snapshotCatalogBackup(reason = 'manual') {
  if (typeof localStorage === 'undefined') return { ok: false, error: 'no-storage' }
  const rows = sanitizeRows(getImports())
  if (!rows.length) return { ok: false, error: 'empty', count: 0 }
  const payload = {
    at: new Date().toISOString(),
    reason: String(reason || 'manual'),
    count: rows.length,
    rows,
  }
  lsSet(BACKUP_KEY, payload)
  const hist = Array.isArray(lsGet(HISTORY_KEY, [])) ? lsGet(HISTORY_KEY, []) : []
  const next = [
    { at: payload.at, reason: payload.reason, count: payload.count, rows },
    ...hist.filter((h) => h?.at !== payload.at),
  ].slice(0, MAX_HISTORY)
  lsSet(HISTORY_KEY, next)
  return { ok: true, count: rows.length, at: payload.at }
}

export function getCatalogBackupMeta() {
  const latest = lsGet(BACKUP_KEY, null)
  if (!latest?.at) return null
  return {
    at: latest.at,
    reason: latest.reason || '',
    count: Number(latest.count) || (latest.rows?.length || 0),
  }
}

export function listCatalogBackupHistory() {
  const hist = lsGet(HISTORY_KEY, [])
  return (Array.isArray(hist) ? hist : []).map((h) => ({
    at: h.at,
    reason: h.reason,
    count: Number(h.count) || (h.rows?.length || 0),
  }))
}

/** Restore latest backup into session catalog (does not delete cloud). */
export function restoreCatalogBackup({ index = 0 } = {}) {
  const hist = Array.isArray(lsGet(HISTORY_KEY, [])) ? lsGet(HISTORY_KEY, []) : []
  const latest = lsGet(BACKUP_KEY, null)
  const pick = index > 0 ? hist[index] : (hist[0] || latest)
  const rows = sanitizeRows(pick?.rows)
  if (!rows.length) return { ok: false, error: 'No backup available' }
  replaceImportsFromCloud(rows)
  try { clearFrozenFeeds() } catch { /* ok */ }
  try { notifyContentChanged() } catch { /* ok */ }
  return { ok: true, count: rows.length, at: pick.at, reason: pick.reason }
}

/** Download backup JSON for off-device safety. */
export function downloadCatalogBackup() {
  const latest = lsGet(BACKUP_KEY, null)
  if (!latest?.rows?.length) return { ok: false, error: 'No backup to download' }
  if (typeof document === 'undefined') return { ok: false, error: 'no-document' }
  const blob = new Blob([JSON.stringify(latest, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calabi-catalog-backup-${String(latest.at || 'now').replace(/[:.]/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true, count: latest.rows.length }
}
