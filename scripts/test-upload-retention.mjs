/**
 * Regression: catalog seed / saveImport must never wipe user uploads.
 * Mirrors the browser localStorage path with an in-memory shim.
 */
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
}

const { saveImport, getImports, mergeImports } = await import('../src/lib/storage.js')
const { hideBrokenMedia, purgeDeadCatalog } = await import('../src/lib/catalogHealth.js')
const { seedOfficialCatalog } = await import('../src/data/publicMediaSeed.js')

function upload(i) {
  return {
    id: `up_test_${i}`,
    type: 'short',
    title: `User clip ${i}`,
    origin: 'upload-local',
    mediaUrl: '',
    sourceUrl: '',
    storedBytes: 1024,
    localStored: true,
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
  }
}

// Fill with library-like noise past the old 200 cap, plus uploads.
for (let i = 0; i < 220; i += 1) {
  saveImport({
    id: `org-noise-${i}`,
    type: 'video',
    title: `Lib ${i}`,
    origin: 'public-domain-org',
    mediaUrl: 'https://example.com/v.mp4',
    sourceUrl: 'https://example.com/v.mp4',
    createdAt: new Date(Date.now() - i * 2000).toISOString(),
  })
}
for (let i = 0; i < 12; i += 1) saveImport(upload(i))

let ids = new Set(getImports().map((r) => r.id))
for (let i = 0; i < 12; i += 1) {
  assert.ok(ids.has(`up_test_${i}`), `upload ${i} survived after saveImport flood`)
}

// Simulate boot seed rewriting official rows.
seedOfficialCatalog()
ids = new Set(getImports().map((r) => r.id))
for (let i = 0; i < 12; i += 1) {
  assert.ok(ids.has(`up_test_${i}`), `upload ${i} survived catalog seed`)
}

// Thumb-error path must not delete uploads.
hideBrokenMedia('up_test_0')
assert.ok(getImports().some((r) => r.id === 'up_test_0'), 'hideBrokenMedia leaves user uploads')

// Purge must keep uploads even with empty media.
purgeDeadCatalog()
assert.ok(getImports().some((r) => r.id === 'up_test_1'), 'purgeDeadCatalog leaves user uploads')

// mergeImports must keep uploads when cloud pushes hundreds of rows.
const cloud = Array.from({ length: 400 }, (_, i) => ({
  id: `cloud-${i}`,
  type: 'video',
  title: `Cloud ${i}`,
  mediaUrl: 'https://example.com/c.mp4',
  sourceUrl: 'https://example.com/c.mp4',
  createdAt: new Date().toISOString(),
}))
mergeImports(cloud)
ids = new Set(getImports().map((r) => r.id))
for (let i = 0; i < 12; i += 1) {
  assert.ok(ids.has(`up_test_${i}`), `upload ${i} survived cloud merge`)
}

console.log('ok upload retention regressions')
