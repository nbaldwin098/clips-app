import { getImports, saveImport, parseExternalShort, lsGet, lsSet } from './storage'
import { rankForUser } from './algorithmEngine'
import { notifyFollowersOfUpload } from './notifications'

const VIEW_KEY = 'clips_content_views'
const PIN_KEY = 'clips_pinned_by_creator'

function readViews() { return lsGet(VIEW_KEY, {}) || {} }
function writeViews(map) { lsSet(VIEW_KEY, map) }

function withViewCounts(items) {
  const views = readViews()
  return items.map((i) => ({ ...i, views: views[i.id] || i.views || 0 }))
}

export function getPinnedIds(creatorId) {
  if (!creatorId) return []
  const all = lsGet(PIN_KEY, {}) || {}
  return all[creatorId] || []
}

export function togglePin(creatorId, contentId) {
  if (!creatorId || !contentId) return []
  const all = lsGet(PIN_KEY, {}) || {}
  const list = all[creatorId] || []
  const i = list.indexOf(contentId)
  if (i >= 0) list.splice(i, 1)
  else list.unshift(contentId)
  all[creatorId] = list.slice(0, 50)
  lsSet(PIN_KEY, all)
  return all[creatorId]
}

export function isPinned(creatorId, contentId) {
  return getPinnedIds(creatorId).includes(contentId)
}

export function sortNewestWithPins(items, creatorId = null) {
  const pins = creatorId ? getPinnedIds(creatorId) : []
  const pinIndex = (id) => {
    const i = pins.indexOf(id)
    return i === -1 ? 9999 : i
  }
  return [...items].sort((a, b) => {
    if (creatorId) {
      const pa = pinIndex(a.id)
      const pb = pinIndex(b.id)
      if (pa !== pb) return pa - pb
    }
    const ta = new Date(a.createdAt || a.importedAt || 0).getTime()
    const tb = new Date(b.createdAt || b.importedAt || 0).getTime()
    return tb - ta
  })
}

export function getCreatorContent(creatorId, handle = null) {
  const imported = getImports()
  const legacy = lsGet('user_clips', []) || []
  const seen = new Set()
  const merged = []
  for (const raw of [...imported, ...legacy]) {
    if (!raw?.id || seen.has(raw.id)) continue
    seen.add(raw.id)
    merged.push(raw)
  }
  const all = withViewCounts(merged.map(normalizeItem))
  const filtered = all.filter((i) => {
    if (creatorId && (i.creatorId === creatorId || i.userId === creatorId)) return true
    if (handle && String(i.handle || i.creatorHandle || '').toLowerCase() === String(handle).toLowerCase()) return true
    return false
  })
  return sortNewestWithPins(filtered, creatorId)
}

export function normalizeItem(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    type: raw.type || 'short',
    title: raw.title || 'Untitled',
    description: raw.description || '',
    sourceUrl: raw.sourceUrl || raw.mediaUrl || '',
    mediaUrl: raw.mediaUrl || raw.sourceUrl || '',
    thumbUrl: raw.thumbUrl || '',
    origin: raw.origin || raw.platform || 'user',
    storedBytes: raw.storedBytes ?? 0,
    durationSec: raw.durationSec || 0,
    tags: raw.tags || [],
    views: raw.views || 0,
    creatorId: raw.creatorId || raw.userId,
    userId: raw.userId || raw.creatorId,
    handle: raw.handle || raw.creatorHandle,
    engagement: raw.engagement || { completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0 },
    createdAt: raw.createdAt || new Date().toISOString(),
    crossPost: raw.crossPost || null,
  }
}

export function getHomeFeed(userId = null) {
  const imports = getImports().map((i) => ({ ...i, type: i.type || 'short' }))
  let merged = withViewCounts(imports.map(normalizeItem))
  merged = merged.map((i) => {
    const cid = i.creatorId || i.userId
    return { ...i, pinned: cid ? isPinned(cid, i.id) : false }
  })
  merged = [...merged].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  })
  if (userId && typeof rankForUser === 'function') {
    try {
      const ranked = rankForUser(merged, userId)
      const pins = ranked.filter((i) => i.pinned)
      const rest = ranked.filter((i) => !i.pinned)
      return [...pins, ...rest]
    } catch {
      return merged
    }
  }
  return merged
}

export function getShortsFeed(userId = null) {
  return getHomeFeed(userId).filter((i) => i.type === 'short')
}

export function getExplore(query = '') {
  const all = withViewCounts(getImports().map(normalizeItem))
  const q = query.trim().toLowerCase()
  if (!q) return sortNewestWithPins(all, null)
  return sortNewestWithPins(
    all.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(q))
    ),
    null
  )
}

export function getById(id) {
  const fromImport = getImports().find((i) => i.id === id)
  if (fromImport) return normalizeItem(withViewCounts([fromImport])[0])
  return null
}

export function listImportsNormalized() {
  return withViewCounts(getImports().map(normalizeItem))
}

export function importUserLink(url, actor = null) {
  const trimmed = String(url || '').trim()
  if (!trimmed) return { ok: false, item: null, error: 'Paste a public short URL.' }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, item: null, error: 'Use an http or https link.' }
    }
  } catch {
    return { ok: false, item: null, error: 'That is not a valid URL.' }
  }
  const record = parseExternalShort(trimmed)
  if (!record) return { ok: false, item: null, error: 'Unable to import that URL.' }
  if (actor?.id) {
    record.creatorId = actor.id
    record.userId = actor.id
    record.handle = actor.handle || record.handle
  }
  saveImport(record)
  if (actor?.id) {
    notifyFollowersOfUpload({
      creatorId: actor.id,
      handle: actor.handle,
      title: record.title,
    })
  }
  return { ok: true, item: normalizeItem(record), error: null }
}

export function recordContentView(id) {
  const views = readViews()
  views[id] = (views[id] || 0) + 1
  writeViews(views)
  return views[id]
}
