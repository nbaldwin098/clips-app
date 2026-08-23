/**
 * Shared media helpers: tags, dates, chapters, captions, explore filters.
 * Local-only — no invented ASR, no server ingest.
 */

export const LIVE_CATEGORIES = [
  'Just chatting',
  'Gaming',
  'Music',
  'Creative',
  'Sports',
  'IRL',
  'Talk',
]

export function extractHashtags(text) {
  const found = String(text || '').match(/#([a-zA-Z0-9_]{1,40})/g) || []
  return found.map((t) => t.slice(1).toLowerCase())
}

export function mergeTags(manual, description) {
  const fromManual = (Array.isArray(manual) ? manual : String(manual || '').split(/[,#\s]+/))
    .map((t) => String(t).trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean)
  return [...new Set([...fromManual, ...extractHashtags(description)])].slice(0, 12)
}

export function formatPostedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString()
}

export function parseClock(input) {
  const s = String(input || '').trim()
  if (!s) return 0
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)
  const parts = s.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

export function parseChaptersInput(rows) {
  return (rows || [])
    .map((r) => ({
      title: String(r.title || '').trim().slice(0, 80),
      t: parseClock(r.t ?? r.time),
    }))
    .filter((c) => c.title)
}

function clockToSec(raw) {
  const s = String(raw || '').trim().replace(',', '.')
  return parseClock(s)
}

/** Manual captions only — VTT-ish cues, or plain lines mapped across duration. */
export function parseCaptionCues(raw, durationSec = 0) {
  const text = String(raw || '').replace(/\r/g, '').trim()
  if (!text) return []
  if (text.includes('-->')) {
    const cues = []
    const blocks = text.split(/\n{2,}/)
    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => !/^\d+$/.test(l.trim()) && !/^WEBVTT/i.test(l.trim()))
      const timeLine = lines.find((l) => l.includes('-->'))
      if (!timeLine) continue
      const [startRaw, endRaw] = timeLine.split('-->').map((x) => x.trim().split(/[ \t]/)[0])
      const body = lines.filter((l) => l !== timeLine).join(' ').trim()
      if (!body) continue
      cues.push({ start: clockToSec(startRaw), end: clockToSec(endRaw) || clockToSec(startRaw) + 3, text: body })
    }
    return cues
  }
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (!lines.length) return []
  const dur = Math.max(Number(durationSec) || 0, lines.length * 2)
  const slice = dur / lines.length
  return lines.map((line, i) => ({
    start: i * slice,
    end: (i + 1) * slice,
    text: line,
  }))
}

export function cueAtTime(cues, t) {
  const time = Number(t) || 0
  return (cues || []).find((c) => time >= c.start && time < c.end) || null
}

export function isReleased(item, now = Date.now()) {
  if (!item) return false
  if (item.status === 'draft') return false
  if (item.status === 'scheduled' || item.scheduledFor) {
    const when = new Date(item.scheduledFor || 0).getTime()
    if (when && when > now) return false
  }
  return true
}

export function filterExploreItems(items, { date = 'any', duration = 'any', sort = 'newest' } = {}) {
  const now = Date.now()
  const windows = { today: 864e5, week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5 }
  let out = (items || []).filter((i) => {
    if (date !== 'any' && windows[date]) {
      const t = new Date(i.createdAt || 0).getTime()
      if (now - t > windows[date]) return false
    }
    const dur = Number(i.durationSec) || 0
    if (duration === 'short' && dur > 240) return false
    if (duration === 'long' && dur > 0 && dur <= 240) return false
    return true
  })
  if (sort === 'recommended') {
    out = [...out].sort((a, b) => (b.views || 0) - (a.views || 0) || new Date(b.createdAt) - new Date(a.createdAt))
  } else {
    out = [...out].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }
  return out
}

export function linkifyDescription(desc) {
  return String(desc || '')
}
