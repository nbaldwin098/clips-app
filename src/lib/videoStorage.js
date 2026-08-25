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

export async function getMediaFile(id) {
  try {
    const db = await openDB()
    if (!db) return null
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result?.file || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
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

/** List every media id still held in IndexedDB (used to restore wiped catalog rows). */
export async function listMediaBlobIds() {
  try {
    const db = await openDB()
    if (!db) return []
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAllKeys()
      req.onsuccess = () => resolve((req.result || []).map(String).filter(Boolean))
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function getMediaBlobMeta(id) {
  try {
    const db = await openDB()
    if (!db) return null
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => {
        const row = req.result
        if (!row?.file) {
          resolve(null)
          return
        }
        const file = row.file
        resolve({
          id: String(row.id || id),
          size: Number(file.size) || 0,
          type: String(file.type || ''),
          name: String(file.name || ''),
          storedAt: row.storedAt || 0,
        })
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

function fitBox(width, height, maxW, maxH) {
  const w = width || maxW
  const h = height || maxH
  const scale = Math.min(1, maxW / w, maxH / h)
  return {
    width: Math.max(2, Math.round(w * scale / 2) * 2),
    height: Math.max(2, Math.round(h * scale / 2) * 2),
  }
}

function makeThumb(video, maxEdge = 1280) {
  const w = video.videoWidth || 1280
  const h = video.videoHeight || 720
  const size = fitSize(w, h, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(video, 0, 0, size.width, size.height)
  try {
    return canvas.toDataURL('image/jpeg', 0.86)
  } catch {
    return ''
  }
}

function pickRecorderMime() {
  const list = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  return list.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

/**
 * Re-encode to a smaller WebM/MP4 for storage while keeping a sharp JPEG poster.
 * Falls back to the original file if the browser cannot record.
 */
export async function transcodeVideoForUpload(file, { asClip = false } = {}) {
  const processed = await processVideoFile(file)
  const maxW = asClip || processed.height > processed.width ? 1080 : 1920
  const maxH = asClip || processed.height > processed.width ? 1920 : 1080
  const target = fitBox(processed.width, processed.height, maxW, maxH)
  const alreadySmall = file.size < 8 * 1024 * 1024
    && processed.width <= maxW
    && processed.height <= maxH
  if (alreadySmall) {
    return { ...processed, file, transcoded: false }
  }

  const mime = pickRecorderMime()
  if (!mime) {
    return { ...processed, file, transcoded: false }
  }

  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = processed.rawUrl
    await new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('Could not read video'))
    })
    const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream?.()
    if (!stream) return { ...processed, file, transcoded: false }

    const bits = asClip ? 1_800_000 : 2_500_000
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bits })
    const chunks = []
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
    const done = new Promise((resolve, reject) => {
      rec.onstop = () => resolve()
      rec.onerror = () => reject(new Error('Transcode failed'))
    })
    rec.start(400)
    const play = video.play()
    if (play?.catch) await play.catch(() => {})
    await new Promise((resolve) => {
      video.onended = resolve
      setTimeout(resolve, Math.min(180_000, (processed.durationSec || 10) * 1000 + 1500))
    })
    if (rec.state !== 'inactive') rec.stop()
    await done
    video.pause()
    const blob = new Blob(chunks, { type: mime.split(';')[0] })
    if (blob.size < 1024) return { ...processed, file, transcoded: false }
    const ext = mime.includes('mp4') ? 'mp4' : 'webm'
    const out = new File(
      [blob],
      `${String(file.name || 'clip').replace(/\.[^.]+$/, '')}.${ext}`,
      { type: blob.type },
    )
    return {
      ...processed,
      width: target.width || processed.width,
      height: target.height || processed.height,
      file: out,
      transcoded: true,
      storedBytes: out.size,
    }
  } catch {
    return { ...processed, file, transcoded: false }
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

    const thumbSize = fitSize(width, height, 240)
    const thumbCanvas = document.createElement('canvas')
    thumbCanvas.width = thumbSize.width
    thumbCanvas.height = thumbSize.height
    const thumbCtx = thumbCanvas.getContext('2d')
    if (!thumbCtx) throw new Error('Could not process photo.')
    thumbCtx.drawImage(img, 0, 0, thumbSize.width, thumbSize.height)
    const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.55)

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
        const thumbUrl = makeThumb(video, (video.videoHeight || 0) > (video.videoWidth || 0) ? 720 : 1280)
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
