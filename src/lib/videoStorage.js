/**
 * Zero-Storage Video Processing & Blob/Link Streaming Engine
 *
 * Converts uploaded local video files into lightweight playback URLs (Blob URLs / IndexedDB streaming refs)
 * while capturing full 1080p video metadata, duration, frame dimensions, and poster frames.
 *
 * This allows 1080p videos and clips to play smoothly directly in the web player
 * without uploading gigabytes to an expensive centralized server (zero-storage model),
 * while standardizing all items into link references.
 */

const DB_NAME = 'clips_media_store'
const STORE_NAME = 'media_blobs'

function openDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

export async function storeMediaBlob(id, file) {
  try {
    const db = await openDB()
    if (!db) return null
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ id, file, storedAt: Date.now() })
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function getMediaBlobUrl(id) {
  try {
    const db = await openDB()
    if (!db) return null
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => {
        if (req.result?.file) {
          resolve(URL.createObjectURL(req.result.file))
        } else {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (!canvas.toBlob) {
      try {
        const dataUrl = canvas.toDataURL(type, quality)
        resolve(dataUrlToBlob(dataUrl))
      } catch {
        resolve(null)
      }
      return
    }
    canvas.toBlob((blob) => resolve(blob || null), type, quality)
  })
}

function dataUrlToBlob(dataUrl) {
  const [header, body] = String(dataUrl).split(',')
  if (!body) return null
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg'
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

function fitSize(width, height, maxEdge) {
  const w = width || maxEdge
  const h = height || maxEdge
  const scale = Math.min(1, maxEdge / Math.max(w, h, 1))
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

/**
 * Decode an image, keep a displayable JPEG in IndexedDB, and build a small
 * data-URL thumbnail so the Pics grid still paints after a refresh when the
 * original blob: object URL is gone.
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

    const thumbSize = fitSize(width, height, 480)
    const thumbCanvas = document.createElement('canvas')
    thumbCanvas.width = thumbSize.width
    thumbCanvas.height = thumbSize.height
    const thumbCtx = thumbCanvas.getContext('2d')
    if (!thumbCtx) throw new Error('Could not process photo.')
    thumbCtx.drawImage(img, 0, 0, thumbSize.width, thumbSize.height)
    const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.72)

    const storeSize = fitSize(width, height, 1920)
    const storeCanvas = document.createElement('canvas')
    storeCanvas.width = storeSize.width
    storeCanvas.height = storeSize.height
    const storeCtx = storeCanvas.getContext('2d')
    if (!storeCtx) throw new Error('Could not process photo.')
    storeCtx.drawImage(img, 0, 0, storeSize.width, storeSize.height)
    const jpegBlob = await canvasToBlob(storeCanvas, 'image/jpeg', 0.88)
    const displayFile = jpegBlob
      ? new File([jpegBlob], `${String(file.name || 'photo').replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
      : file

    return {
      width,
      height,
      thumbUrl,
      rawUrl,
      displayFile,
    }
  } catch (err) {
    URL.revokeObjectURL(rawUrl)
    throw err
  }
}

/**
 * Capture high-quality video metadata and a clean 1080p poster frame
 */
export async function processVideoFile(file) {
  return new Promise((resolve, reject) => {
    try {
      const rawUrl = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      video.src = rawUrl

      video.onloadedmetadata = () => {
        const durationSec = Math.round(video.duration * 10) / 10 || 0

        // Seek to 1s or middle to extract a crisp 1080p thumbnail frame
        const seekTarget = Math.min(1.0, durationSec > 2 ? 1.0 : durationSec / 2)
        video.currentTime = seekTarget
      }

      video.onseeked = () => {
        let thumbUrl = ''
        try {
          const canvas = document.createElement('canvas')
          // Standardize thumbnail canvas
          const w = video.videoWidth || 1280
          const h = video.videoHeight || 720
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h)
            thumbUrl = canvas.toDataURL('image/jpeg', 0.82)
          }
        } catch {
          // fallback if tainted
        }

        resolve({
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          durationSec: Math.round(video.duration * 10) / 10 || 0,
          sizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
          thumbUrl,
          rawUrl,
        })
      }

      video.onerror = (err) => {
        URL.revokeObjectURL(rawUrl)
        reject(err)
      }
    } catch (err) {
      reject(err)
    }
  })
}
