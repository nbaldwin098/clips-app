/**
 * BUG-021: iOS clip play breaks if the upload path re-encodes phone MP4/MOV to WebM.
 * Default prepare must return the same File object. Optional ffmpeg stays MP4-only.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
}

function stubMediaDom() {
  globalThis.window = {
    setTimeout,
    clearTimeout,
  }
  globalThis.URL.createObjectURL = () => 'blob:mock-video'
  globalThis.URL.revokeObjectURL = () => {}
  globalThis.document = {
    createElement(tag) {
      if (tag === 'video') {
        const video = {
          muted: true,
          playsInline: true,
          preload: 'metadata',
          videoWidth: 720,
          videoHeight: 1280,
          duration: 9.2,
          currentTime: 0,
          onloadedmetadata: null,
          onerror: null,
          onseeked: null,
          _src: '',
          set src(val) {
            this._src = val
            queueMicrotask(() => this.onloadedmetadata?.())
          },
          get src() { return this._src },
        }
        return video
      }
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: () => {} }),
          toDataURL: () => 'data:image/jpeg;base64,xx',
        }
      }
      return {}
    },
  }
}

stubMediaDom()

const videoStorageSrc = readFileSync(new URL('../src/lib/videoStorage.js', import.meta.url), 'utf8')
const transcodeSrc = readFileSync(new URL('../src/lib/videoTranscode.js', import.meta.url), 'utf8')
const flagsSrc = readFileSync(new URL('../src/lib/featureFlags.js', import.meta.url), 'utf8')
const publishSrc = readFileSync(new URL('../src/lib/contentService.js', import.meta.url), 'utf8')

assert.equal(videoStorageSrc.includes('MediaRecorder'), false, 'videoStorage must not use MediaRecorder')
assert.match(videoStorageSrc, /Original file bytes are uploaded as-is/)
assert.match(flagsSrc, /FEATURE_CLIENT_TRANSCODE = false/)
assert.match(transcodeSrc, /Never force WebM/)
assert.match(transcodeSrc, /out\.mp4/)
assert.match(transcodeSrc, /video\/mp4/)
assert.equal(/video\/webm/.test(transcodeSrc), false, 'optional transcode must not target WebM')
assert.match(transcodeSrc, /includes\('webm'\)/)
assert.match(publishSrc, /prepareVideoForUploadMaybeTranscode/)

const { prepareVideoForUpload, transcodeVideoForUpload } = await import('../src/lib/videoStorage.js')
const { prepareVideoForUploadMaybeTranscode } = await import('../src/lib/videoTranscode.js')
const { FEATURE_CLIENT_TRANSCODE, clientTranscodeEnabled } = await import('../src/lib/featureFlags.js')

assert.equal(FEATURE_CLIENT_TRANSCODE, false, 'client transcode stays off by default')
assert.equal(clientTranscodeEnabled(), false, 'env-less runtime does not enable transcode')

const bytes = new Uint8Array([0, 0, 0, 28, 0x66, 0x74, 0x79, 0x70])
const phone = new File([bytes], 'IMG_1234.MOV', { type: 'video/quicktime' })

const prepared = await prepareVideoForUpload(phone)
assert.equal(prepared.file, phone, 'prepareVideoForUpload keeps the original File reference')
assert.equal(prepared.file.type, 'video/quicktime')
assert.equal(prepared.file.name, 'IMG_1234.MOV')
assert.equal(prepared.storedBytes, phone.size)

const alias = await transcodeVideoForUpload(phone)
assert.equal(alias.file, phone, 'deprecated transcode alias is original-file, not WebM')

const maybe = await prepareVideoForUploadMaybeTranscode(phone)
assert.equal(maybe.file, phone, 'default maybe-transcode path keeps original bytes')
assert.equal(String(maybe.file.type).includes('webm'), false)
assert.notEqual(maybe.transcoded, true)

const forcedSmall = await prepareVideoForUploadMaybeTranscode(phone, { force: true })
assert.equal(forcedSmall.file, phone, 'files under 8MB skip ffmpeg and stay original')

console.log('ok ios original-file upload regression')
