export async function sha256Blob(blob) {
  const buf = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export function registerHostedHash(hash, meta = {}) {
  if (!hash) return
  const all = JSON.parse(localStorage.getItem('clips_content_hashes') || '{}')
  if (all[hash]) return { duplicate: true, existing: all[hash] }
  all[hash] = { ...meta, at: new Date().toISOString() }
  localStorage.setItem('clips_content_hashes', JSON.stringify(all))
  return { duplicate: false }
}
export function findHash(hash) {
  const all = JSON.parse(localStorage.getItem('clips_content_hashes') || '{}')
  return all[hash] || null
}
