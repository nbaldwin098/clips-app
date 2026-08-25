import { getMediaBlobUrl } from './videoStorage'
import { parseEmbedUrl } from './videoEmbed'

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function isHttp(url) {
  return typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))
}

export function isBlob(url) {
  return typeof url === 'string' && url.startsWith('blob:')
}

export function buildCandidates(item) {
  if (!item) return []
  const list = []
  const push = (u) => {
    if (u && typeof u === 'string' && !list.includes(u)) list.push(u)
  }
  if (isHttp(item.mediaUrl)) push(item.mediaUrl)
  if (isHttp(item.sourceUrl)) push(item.sourceUrl)
  if (isBlob(item.mediaUrl)) push(item.mediaUrl)
  if (isBlob(item.sourceUrl)) push(item.sourceUrl)
  return list
}

export async function resolvePlayback(item) {
  const candidates = buildCandidates(item)
  try {
    const idbUrl = await getMediaBlobUrl(item?.id)
    if (idbUrl && !candidates.includes(idbUrl)) {
      if (!candidates.some(isHttp)) candidates.unshift(idbUrl)
      else candidates.push(idbUrl)
    }
  } catch {}
  // Prefer stable http sources; keep blob/idb as fallbacks.
  const usable = candidates.filter((u) => isHttp(u) || isBlob(u))
  const preferred = usable.filter(isHttp)
  const list = preferred.length ? [...preferred, ...usable.filter((u) => !isHttp(u))] : usable
  if (!list.length) return { candidates: list, playSrc: '', mode: 'video' }
  const first = list[0]
  const parsed = parseEmbedUrl(first)
  if (parsed?.type === 'iframe') {
    return { candidates: list, playSrc: parsed.src, mode: 'iframe' }
  }
  return { candidates: list, playSrc: parsed?.src || first, mode: 'video' }
}

export function formatClock(sec) {
  const n = Math.max(0, Math.floor(Number(sec) || 0))
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  const s = n % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
