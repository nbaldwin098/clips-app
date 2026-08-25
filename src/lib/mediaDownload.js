import { getMediaFile } from './videoStorage'

function filenameFromItem(item) {
  const base = String(item?.title || item?.id || 'download')
    .replace(/[^\w\s-]+/g, '')
    .trim()
    .slice(0, 60) || 'download'
  const type = item?.type === 'pic' ? 'jpg' : (String(item?.mediaUrl || '').includes('.webm') ? 'webm' : 'mp4')
  return `${base}.${item?.type === 'pic' ? 'jpg' : type}`
}

function triggerBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Anyone can save a posted file. Prefers the hosted cloud URL; IndexedDB is legacy only. */
export async function downloadPostedMedia(item) {
  if (!item) return { ok: false, error: 'Nothing to download.' }
  const name = filenameFromItem(item)
  const hosted = item.mediaUrl || item.sourceUrl || ''
  if (String(hosted).startsWith('http://') || String(hosted).startsWith('https://')) {
    try {
      const res = await fetch(hosted, { mode: 'cors' })
      if (res.ok) {
        triggerBlob(await res.blob(), name)
        return { ok: true }
      }
    } catch {}
  }
  try {
    const local = await getMediaFile(item.id)
    if (local) {
      triggerBlob(local, local.name || name)
      return { ok: true }
    }
  } catch {}
  const src = item.mediaUrl || item.sourceUrl || item.thumbUrl || ''
  if (!src) return { ok: false, error: 'No file on this post.' }
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    try {
      const res = await fetch(src)
      triggerBlob(await res.blob(), name)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not save this file.' }
    }
  }
  try {
    const res = await fetch(src, { mode: 'cors' })
    if (!res.ok) throw new Error('fetch')
    triggerBlob(await res.blob(), name)
    return { ok: true }
  } catch {
    const a = document.createElement('a')
    a.href = src
    a.download = name
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
    return { ok: true }
  }
}
