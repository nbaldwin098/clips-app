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
