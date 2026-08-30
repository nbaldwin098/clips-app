/**
 * BUG-022: cloud delete must resolve public/signed/authenticated URLs and
 * raw storage paths, then warn (not throw) when remove fails.
 */
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
}

const {
  storagePathFromPublicUrl,
  hostedMediaObjectPath,
  collectHostedMediaTargets,
  deleteHostedMedia,
} = await import('../src/lib/mediaUpload.js')

const uid = '11111111-2222-4333-8444-555555555555'
const rel = `videos/${uid}/clip.mp4`

assert.equal(
  storagePathFromPublicUrl(`https://xyz.supabase.co/storage/v1/object/public/clips/${rel}`),
  rel,
  'public URL',
)
assert.equal(
  storagePathFromPublicUrl(`https://xyz.supabase.co/storage/v1/object/sign/clips/${rel}?token=abc`),
  rel,
  'signed URL drops query',
)
assert.equal(
  storagePathFromPublicUrl(`https://xyz.supabase.co/storage/v1/object/authenticated/clips/${rel}`),
  rel,
  'authenticated URL',
)
assert.equal(
  storagePathFromPublicUrl(`https://xyz.supabase.co/storage/v1/object/public/clips/pics/${uid}/a%20b.jpg`),
  `pics/${uid}/a b.jpg`,
  'decodes URI path',
)
assert.equal(storagePathFromPublicUrl('https://cdn.example/not-storage.mp4'), '')
assert.equal(hostedMediaObjectPath(rel), rel, 'raw bucket path')
assert.equal(hostedMediaObjectPath(`/${rel}`), rel)
assert.equal(hostedMediaObjectPath('videos/../secret'), '', 'rejects path traversal')
assert.equal(hostedMediaObjectPath('data:image/jpeg;base64,xx'), '')
assert.equal(hostedMediaObjectPath('https://example.com/foo.mp4'), '')

const targets = collectHostedMediaTargets({
  storagePath: rel,
  mediaUrl: `https://xyz.supabase.co/storage/v1/object/public/clips/${rel}`,
  sourceUrl: `https://xyz.supabase.co/storage/v1/object/sign/clips/${rel}?token=1`,
  thumbUrl: `https://xyz.supabase.co/storage/v1/object/public/clips/pics/${uid}/thumb.jpg`,
  mosaicThumb: 'https://example.com/ignore.jpg',
})
assert.deepEqual(targets.sort(), [rel, `pics/${uid}/thumb.jpg`].sort())
assert.equal(collectHostedMediaTargets(null).length, 0)

const removed = await deleteHostedMedia(rel)
assert.equal(removed, false, 'delete without Supabase warns and returns false')

const { saveImport } = await import('../src/lib/storage.js')
const { deleteCatalogItem } = await import('../src/lib/contentService.js')

saveImport({
  id: 'del_cloud_1',
  type: 'short',
  title: 'To delete',
  origin: 'upload',
  mediaUrl: `https://xyz.supabase.co/storage/v1/object/public/clips/${rel}`,
  sourceUrl: `https://xyz.supabase.co/storage/v1/object/public/clips/${rel}`,
  thumbUrl: `https://xyz.supabase.co/storage/v1/object/public/clips/pics/${uid}/thumb.jpg`,
  storagePath: rel,
  hosted: true,
  createdAt: new Date().toISOString(),
})

const refused = await deleteCatalogItem('del_cloud_1')
assert.equal(refused.ok, false)
assert.equal(refused.error, 'intentional-required')

const done = await deleteCatalogItem('del_cloud_1', null, { intentional: true })
assert.equal(done.ok, true)
assert.ok(Array.isArray(done.storageResults))
assert.equal(done.storageResults.length, 2, 'media + thumb paths attempted')
assert.ok(done.storageResults.every((r) => r.removed === false), 'warn-on-fail when storage is offline')

console.log('ok delete hosted media regression')
