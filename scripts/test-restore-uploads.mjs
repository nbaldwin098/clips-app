/**
 * Restore wiped catalog rows from legacy user_clips + claim orphan uploads.
 */
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
}

const { getImports, saveImport, lsSet } = await import('../src/lib/storage.js')
const {
  restoreFromLegacyClips,
  claimOrphanUploads,
  restoreLostUploads,
} = await import('../src/lib/restoreUploads.js')

lsSet('user_clips', [
  {
    id: 'up_legacy_1',
    type: 'short',
    title: 'Old clip',
    origin: 'upload-local',
    localStored: true,
    storedBytes: 2048,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
])

const actor = { id: 'user_abc', handle: 'alice' }
const n = restoreFromLegacyClips(actor)
assert.equal(n, 1, 'restores one legacy clip')
const row = getImports().find((r) => r.id === 'up_legacy_1')
assert.ok(row, 'legacy clip is back in imports')
assert.equal(row.creatorId, 'user_abc', 'restored clip is owned by current user')
assert.equal(row.restoredFrom, 'user_clips', 'marks restoredFrom')

saveImport({
  id: 'up_orphan',
  type: 'short',
  title: 'Orphan',
  origin: 'upload-local',
  localStored: true,
  storedBytes: 100,
})
assert.equal(claimOrphanUploads(actor), 1, 'claims one orphan upload')
const orphan = getImports().find((r) => r.id === 'up_orphan')
assert.equal(orphan?.creatorId, 'user_abc', 'orphan now has creatorId')

const full = await restoreLostUploads(actor)
assert.ok(typeof full.total === 'number', 'restoreLostUploads returns totals')
assert.equal(full.fromLegacy, 0, 'second pass does not duplicate legacy')
assert.equal(full.claimed, 0, 'second pass does not re-claim')

console.log('ok restore uploads')
