/**
 * IndexedDB helpers for local media blobs + light client-side metadata.
 * Cloud uploads keep the original file (usually phone MP4) — no browser
 * re-encode. Compression belongs on a server pipeline when you need it.
 */

const DB_NAME = 'clips-media'
const STORE = 'blobs'
const DB_VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'))
  })
}

export async function storeMediaBlob(id, file) {
  if (!id || !file) return false
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(file, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

export async function getMediaFile(id) {
  if (!id) return null
  try {
    const db = await openDb()
    const file = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return file || null
  } catch {
    return null
  }
}

export async function getMediaBlobUrl(id) {
  const file = await getMediaFile(id)
  if (!file) return ''
  try {
    return URL.createObjectURL(file)
  } catch {
    return ''
  }
}

export async function deleteMediaBlob(id) {
  if (!id) return false
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

export async function listMediaBlobIds() {
  try {
    const db = await openDb()
    const ids = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAllKeys()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return ids
  } catch {
    return []
  }
}

export async function getMediaBlobMeta(id) {
  const file = await getMediaFile(id)
  if (!file) return null
  return { size: file.size, type: file.type, name: file.name }
}

function fitSize(w, h, max) {
  if (!w || !h) return { width: max, height: max }
  const scale = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

/**
 * Read duration / dimensions / poster from a video. Does not change the file.
 */
export async function processVideoFile(file) {
  const rawUrl = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.src = rawUrl

    await new Promise((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error('Could not read this video.')), 20000)
      video.onloadedmetadata = () => {
        window.clearTimeout(t)
        resolve()
      }
      video.onerror = () => {
        window.clearTimeout(t)
        reject(new Error('Could not read this video. Try MP4 (H.264).'))
      }
    })

    const width = video.videoWidth || 0
    const height = video.videoHeight || 0
    const durationSec = Number.isFinite(video.duration) ? video.duration : 0

    let thumbUrl = ''
    try {
      await new Promise((resolve) => {
        const done = () => resolve()
        video.currentTime = Math.min(0.2, durationSec || 0)
        video.onseeked = done
        window.setTimeout(done, 1500)
      })
      const size = fitSize(width || 720, height || 1280, 480)
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, size.width, size.height)
        thumbUrl = canvas.toDataURL('image/jpeg', 0.8)
      }
    } catch {
      thumbUrl = ''
    }

    return {
      width,
      height,
      durationSec,
      thumbUrl,
      storedBytes: file.size || 0,
      rawUrl,
    }
  } catch {
    try { URL.revokeObjectURL(rawUrl) } catch {}
    return {
      width: 0,
      height: 0,
      durationSec: 0,
      thumbUrl: '',
      storedBytes: file?.size || 0,
      rawUrl: '',
    }
  }
}

/**
 * Prepare a video for cloud upload: metadata + poster only.
 * Original file bytes are uploaded as-is (playable MP4 from phones).
 */
export async function prepareVideoForUpload(file) {
  const processed = await processVideoFile(file)
  return {
    ...processed,
    file,
    storedBytes: file?.size || processed.storedBytes || 0,
  }
}

/** @deprecated use prepareVideoForUpload */
export async function transcodeVideoForUpload(file) {
  return prepareVideoForUpload(file)
}

/**
 * Decode an image and build a small JPEG poster.
 */
export async function processImageFile(file) {
  const rawUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not read this photo. Use JPG, PNG, or WebP.'))
      el.src = rawUrl
    })
    const width = img.naturalWidth || img.width || 0
    const height = img.naturalHeight || img.height || 0
    if (!width || !height) {
      throw new Error('Could not read this photo. Use JPG, PNG, or WebP.')
    }

    const thumbSize = fitSize(width, height, 240)
    const thumbCanvas = document.createElement('canvas')
    thumbCanvas.width = thumbSize.width
    thumbCanvas.height = thumbSize.height
    const thumbCtx = thumbCanvas.getContext('2d')
    if (!thumbCtx) throw new Error('Could not process photo.')
    thumbCtx.drawImage(img, 0, 0, thumbSize.width, thumbSize.height)
    const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.82)

    return {
      width,
      height,
      thumbUrl,
      storedBytes: file.size || 0,
      rawUrl,
    }
  } catch (err) {
    try { URL.revokeObjectURL(rawUrl) } catch {}
    throw err
  }
}
