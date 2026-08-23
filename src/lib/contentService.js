import { getImports, saveImport, parseExternalShort, lsGet, lsSet } from './storage'
import { rankForUser } from './algorithmEngine'
import { notifyFollowersOfUpload } from './notifications'
import { storeMediaBlob, processVideoFile } from './videoStorage'
import { uploadVideoToSupabase } from './mediaUpload'
import { isSupabaseConfigured } from './supabaseClient'
import { pushContentRecord, notifyContentChanged } from './contentSync'
import { getSubscriptionsForUser } from './engagement'
import { getPicsFeed } from './picsService'

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

// Defensively strip raw storage/database error text that may have been saved
// into `description` by an earlier build, so it never renders on a card.
const LEAKED_ERROR_PATTERN = /row-level security|violates|local only\s*—/i
function sanitizeDescription(desc) {
  const text = String(desc || '')
  return LEAKED_ERROR_PATTERN.test(text) ? '' : text
}

export function normalizeItem(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    type: raw.type || 'short',
    title: raw.title || 'Untitled',
    description: sanitizeDescription(raw.description),
    sourceUrl: raw.sourceUrl || raw.mediaUrl || '',
    mediaUrl: raw.mediaUrl || raw.sourceUrl || '',
    thumbUrl: raw.thumbUrl || '',
    origin: raw.origin || raw.platform || 'user',
    storedBytes: raw.storedBytes ?? 0,
    durationSec: raw.durationSec || 0,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    views: raw.views || 0,
    creatorId: raw.creatorId || raw.userId,
    userId: raw.userId || raw.creatorId,
    handle: raw.handle || raw.creatorHandle,
    engagement: raw.engagement || { completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0 },
    createdAt: raw.createdAt || new Date().toISOString(),
    crossPost: raw.crossPost || null,
    hosted: !!raw.hosted,
    soundId: raw.soundId || raw.engagement?.soundId || null,
    soundTitle: raw.soundTitle || raw.engagement?.soundTitle || null,
  }
}

export function getHomeFeed(userId = null) {
  const imports = getImports().map((i) => ({ ...i, type: i.type || 'short' }))
  let merged = withViewCounts(imports.map(normalizeItem)).filter((i) => i.type !== 'pic')
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

function matchesQuery(i, q) {
  if (!q) return true
  return (
    i.title.toLowerCase().includes(q) ||
    (i.description || '').toLowerCase().includes(q) ||
    String(i.handle || '').toLowerCase().includes(q) ||
    String(i.soundTitle || '').toLowerCase().includes(q) ||
    (i.tags || []).some((t) => String(t).toLowerCase().includes(q))
  )
}

function filterByKind(items, kind = 'all') {
  if (kind === 'video') return items.filter((i) => i.type === 'video')
  if (kind === 'clip' || kind === 'short') return items.filter((i) => i.type === 'short')
  if (kind === 'pic') return items.filter((i) => i.type === 'pic')
  return items
}

export function getExplore(query = '', kind = 'all') {
  const catalog = withViewCounts(getImports().map(normalizeItem))
  const pics = getPicsFeed().map((p) => normalizeItem({ ...p, type: 'pic' })).filter(Boolean)
  const seen = new Set()
  const all = []
  for (const i of [...catalog, ...pics]) {
    if (!i?.id || seen.has(i.id)) continue
    seen.add(i.id)
    all.push(i)
  }
  const q = query.trim().toLowerCase()
  const filtered = filterByKind(all, kind).filter((i) => matchesQuery(i, q))
  return sortNewestWithPins(filtered, null)
}

export function getRelated(item, limit = 8) {
  if (!item?.id) return []
  const pool = withViewCounts(getImports().map(normalizeItem)).filter((i) => i.id !== item.id && i.type !== 'pic')
  const tags = new Set((item.tags || []).map((t) => String(t).toLowerCase()))
  const scored = pool.map((i) => {
    let score = 0
    if (i.type === item.type) score += 3
    if (item.soundId && i.soundId === item.soundId) score += 6
    if (item.soundTitle && i.soundTitle && i.soundTitle === item.soundTitle) score += 4
    if (item.handle && i.handle && String(i.handle).toLowerCase() === String(item.handle).toLowerCase()) score += 2
    for (const t of i.tags || []) {
      if (tags.has(String(t).toLowerCase())) score += 2
    }
    return { i, score }
  })
  return scored
    .sort((a, b) => b.score - a.score || new Date(b.i.createdAt) - new Date(a.i.createdAt))
    .slice(0, limit)
    .map((x) => x.i)
}

export function getBySound(soundId, soundTitle) {
  const all = withViewCounts(getImports().map(normalizeItem)).filter((i) => i.type !== 'pic')
  return all.filter((i) => {
    if (soundId && i.soundId === soundId) return true
    if (soundTitle && i.soundTitle && String(i.soundTitle) === String(soundTitle)) return true
    return false
  })
}

export function getByTag(tag) {
  const t = String(tag || '').trim().toLowerCase().replace(/^#/, '')
  if (!t) return []
  const all = withViewCounts(getImports().map(normalizeItem))
  return all.filter((i) => {
    if ((i.tags || []).some((x) => String(x).toLowerCase() === t)) return true
    return String(i.title || '').toLowerCase().includes(t)
  })
}

export function getFollowingFeed(userId, { shortsOnly = false } = {}) {
  if (!userId) return []
  const ids = new Set(getSubscriptionsForUser(userId))
  const feed = getHomeFeed(userId).filter((i) => ids.has(i.creatorId) || ids.has(i.userId))
  return shortsOnly ? feed.filter((i) => i.type === 'short') : feed
}

export function listCatalogTags(limit = 24) {
  const counts = {}
  for (const i of getImports().map(normalizeItem)) {
    for (const t of i.tags || []) {
      const key = String(t || '').trim()
      if (!key) continue
      counts[key] = (counts[key] || 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
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
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { ok: false, item: null, error: 'Use an http or https link.' }
    }
    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
      return { ok: false, item: null, error: 'That link is not allowed.' }
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
  notifyContentChanged()
  pushContentRecord(record, actor).catch(() => {})
  if (actor?.id) {
    notifyFollowersOfUpload({
      creatorId: actor.id,
      handle: actor.handle,
      title: record.title,
    })
  }
  return { ok: true, item: normalizeItem(record), error: null }
}

export async function publishLocalMedia(file, actor = null, { type = null, title = null, description = null, sound = null, tags = [] } = {}) {
  if (!file) return { ok: false, item: null, error: 'Choose a video file.' }
  try {
    const processed = await processVideoFile(file)
    const id = `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    let mediaUrl = processed.rawUrl
    let origin = 'upload-local'
    let hosted = false

    // Never surface raw storage/database errors to viewers — log internally and
    // fall back to the zero-storage local link. If the actor isn't signed in,
    // uploads are local-only by design (no cloud write is even attempted).
    if (actor?.id && isSupabaseConfigured()) {
      const up = await uploadVideoToSupabase(file, actor.id)
      if (up.ok && up.publicUrl) {
        mediaUrl = up.publicUrl
        origin = 'upload'
        hosted = true
      } else if (up.error) {
        console.warn('[Clips] Supabase upload failed, using local link:', up.error)
      }
    }

    try {
      await storeMediaBlob(id, file)
    } catch {}

    const isVertical = processed.height > processed.width
    const isShortDuration = processed.durationSec && processed.durationSec <= 90
    const inferredType = type || (isVertical || isShortDuration ? 'short' : 'video')
    const finalTitle =
      (title && String(title).trim()) ||
      String(file.name || 'Untitled').replace(/\.[^.]+$/, '') ||
      'Untitled'
    const finalDescription = description != null ? String(description).trim() : ''
    const cleanTags = (Array.isArray(tags) ? tags : String(tags || '').split(/[,#]/))
      .map((t) => String(t || '').trim())
      .filter(Boolean)
      .slice(0, 8)

    const record = {
      id,
      type: inferredType,
      title: finalTitle.slice(0, 120),
      description: finalDescription.slice(0, 5000),
      sourceUrl: mediaUrl,
      mediaUrl,
      thumbUrl: processed.thumbUrl || '',
      origin,
      hosted,
      storedBytes: file.size || 0,
      durationSec: processed.durationSec,
      width: processed.width,
      height: processed.height,
      tags: cleanTags,
      createdAt: new Date().toISOString(),
      engagement: {
        completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0,
        soundId: sound?.id || null,
        soundTitle: sound?.title || null,
      },
      views: 0,
      soundId: sound?.id || null,
      soundTitle: sound?.title || null,
    }

    if (actor?.id) {
      record.creatorId = actor.id
      record.userId = actor.id
      record.handle = actor.handle
    }

    saveImport(record)
    notifyContentChanged()
    pushContentRecord(record, actor).catch(() => {})

    if (actor?.id) {
      notifyFollowersOfUpload({
        creatorId: actor.id,
        handle: actor.handle,
        title: record.title,
      })
    }

    return { ok: true, item: normalizeItem(record), error: null, hosted }
  } catch (err) {
    return { ok: false, item: null, error: err?.message || 'Could not process video file.' }
  }
}

export function recordContentView(id) {
  const views = readViews()
  views[id] = (views[id] || 0) + 1
  writeViews(views)
  return views[id]
}
