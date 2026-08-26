/**
 * In-memory catalog only. Source of truth is Supabase (cloud).
 * Never written to localStorage — delete in cloud = gone for every client after sync.
 */

let catalog = []
let hydrated = false

export function isCatalogHydrated() {
  return hydrated
}

export function getCatalog() {
  return catalog.slice()
}

/** Full replace from cloud pull (or empty after failed/empty pull). */
export function setCatalog(rows) {
  catalog = Array.isArray(rows)
    ? rows.filter((r) => r && typeof r === 'object' && r.id)
    : []
  hydrated = true
  return catalog.slice()
}

export function upsertCatalogRecord(record) {
  if (!record?.id) return getCatalog()
  const without = catalog.filter((r) => r.id !== record.id)
  catalog = [record, ...without]
  hydrated = true
  return catalog.slice()
}

export function patchCatalogRecord(id, patch) {
  if (!id) return null
  let found = null
  catalog = catalog.map((r) => {
    if (r.id !== id) return r
    found = { ...r, ...patch }
    return found
  })
  return found
}

export function removeCatalogRecord(id) {
  if (!id) return
  catalog = catalog.filter((r) => r.id !== id)
}

export function clearCatalog() {
  catalog = []
  hydrated = false
}
