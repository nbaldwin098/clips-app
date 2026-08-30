import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const videoStorageSrc = readFileSync(new URL('../src/lib/videoStorage.js', import.meta.url), 'utf8')
assert.ok(videoStorageSrc.includes('Original file bytes are uploaded as-is'), 'prepare keeps original file bytes')
assert.ok(!videoStorageSrc.includes('MediaRecorder'), 'no MediaRecorder WebM force on iOS path')
assert.ok(videoStorageSrc.includes('...processed,\n    file,'), 'prepare returns the original File')
console.log('ok iOS original-file upload path')

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
  creatorId: 'owner-kiddnixk',
  handle: 'kiddnixk',
}
const n = normalizeItem(raw)
assert.equal(n.localStored, true, 'normalize keeps localStored')
assert.equal(isUserUploadRecord(n), true, 'short id upload is user upload')
assert.equal(hasPlayableVideo(n), true, 'localStored empty url is playable on device')
assert.equal(isFeedable(n), false, 'device-only clip stays off shared feeds until hosted')

console.log('ok clip load localStored')
