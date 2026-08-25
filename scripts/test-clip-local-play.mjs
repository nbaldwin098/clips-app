import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
}

const { normalizeItem } = await import('../src/lib/contentService.js')
const { isUserUploadRecord } = await import('../src/lib/mediaMeta.js')
const { hasPlayableVideo, isFeedable } = await import('../src/lib/catalogHealth.js')

const raw = {
  id: 'aB3dE5fG7h9',
  type: 'short',
  title: 'Mine',
  origin: 'upload-local',
  mediaUrl: '',
  sourceUrl: '',
  localStored: true,
  storedBytes: 999,
  hosted: false,
  status: 'published',
  creatorId: 'owner-cs1',
  handle: 'cs1',
}
const n = normalizeItem(raw)
assert.equal(n.localStored, true, 'normalize keeps localStored')
assert.equal(isUserUploadRecord(n), true, 'short id upload is user upload')
assert.equal(hasPlayableVideo(n), true, 'localStored empty url is playable')
assert.equal(isFeedable(n), true, 'localStored clip is feedable')

console.log('ok clip load localStored')
