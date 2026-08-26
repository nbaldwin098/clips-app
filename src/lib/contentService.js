import { getImports, saveImport, updateImport, removeImport, parseExternalShort, lsGet, lsSet } from './storage'
import { rankForUser, computeContentQuality, computeVelocity } from './algorithmEngine'
import { notifyFollowersOfUpload } from './notifications'
import { transcodeVideoForUpload } from './videoStorage'
import {
  uploadVideoToSupabase,
  uploadDataUrlToSupabase,
  resolveUploadHost,
  signInToUploadMessage,
  uploadFailedMessage,
  uploadHostRequiredMessage,
  deleteHostedMedia,
} from './mediaUpload'
import { pushContentRecord, deleteContentRecord, notifyContentChanged, syncContentFromCloud } from './contentSync'
import { newContentId } from './newContentId'
import { getSubscriptionsForUser } from './engagement'
import { getPicsFeed } from './picsService'
import { mergeTags, isReleased } from './mediaMeta'
import { setChapters, setCaptions, deleteScheduled } from './youtubeParity'
import { isFeedable, isReferenceItem, isRetiredCatalogItem } from './catalogHealth'
import { isAccountHidden } from './trustSafety'
import { listIndexedUsers } from './moderation'
import { OFFICIAL_CREATORS } from '../data/publicMediaSeed'
import { freezeFeed, clearFrozenFeeds } from './frozenFeeds'

export { clearFrozenFeeds }

const VIEW_KEY = 'clips_content_views'
const PIN_KEY = 'clips_pinned_by_creator'

function readViews() {
  const map = lsGet(VIEW_KEY, {}) || {}
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {}
}
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
  const seen = new Set()
  const merged = []
  for (const raw of imported) {
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

export function getCreatorPublicContent(creatorId, handle = null) {
  return getCreatorContent(creatorId, handle).filter((i) => {
    if (!isReleased(i)) return false
    if (!isFeedable(i)) return false
    if (isAccountHidden(i.creatorId || i.userId, i.handle)) return false
    return true
  })
}

export function getCreatorUnreleased(creatorId, handle = null) {
  return getCreatorContent(creatorId, handle).filter((i) => !isReleased(i))
}

const LEAKED_ERROR_PATTERN = /row-level security|violates|local only\s*—/i
function sanitizeDescription(desc) {
  const text = String(desc || '')
  return LEAKED_ERROR_PATTERN.test(text) ? '' : text
}

export function normalizeItem(raw) {
  if (!raw) return null
  const origin = raw.origin || raw.platform || ''
  return {
    id: raw.id,
    type: raw.type || 'short',
    title: raw.title || 'Untitled',
    description: sanitizeDescription(raw.description),
    sourceUrl: raw.sourceUrl || raw.mediaUrl || '',
    mediaUrl: raw.mediaUrl || raw.sourceUrl || '',
    thumbUrl: raw.thumbUrl || '',
    origin: origin || 'user',
    storedBytes: raw.storedBytes ?? 0,
    durationSec: raw.durationSec || 0,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    views: raw.views || 0,
    creatorId: raw.creatorId || raw.userId,
    userId: raw.userId || raw.creatorId,
    handle: raw.handle || raw.creatorHandle,
    displayName: raw.displayName || raw.creatorName || '',
    avatarUrl: raw.avatarUrl || '',
    priceUsd: Number(raw.priceUsd) > 0 ? Math.round(Number(raw.priceUsd) * 100) / 100 : 0,
    engagement: raw.engagement || { completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0 },
    createdAt: raw.createdAt || raw.publishedAt || raw.importedAt || '',
    crossPost: raw.crossPost || null,
    hosted: !!raw.hosted,
    localStored: raw.localStored === true,
    storagePath: raw.storagePath || '',
    soundId: raw.soundId || raw.engagement?.soundId || null,
    soundTitle: raw.soundTitle || raw.engagement?.soundTitle || null,
    stitchOf: raw.stitchOf || null,
    chapters: Array.isArray(raw.chapters) ? raw.chapters : [],
    captionsText: raw.captionsText || '',
    scheduledFor: raw.scheduledFor || null,
    status: raw.status || 'published',
    category: raw.category || null,
    publishedAt: raw.publishedAt || null,
  }
}

function onlyReleased(items) {
  return (items || []).filter((i) => isReleased(i))
}

export function getHomeFeed(userId = null) {
  const imports = getImports().map((i) => ({ ...i, type: i.type || 'short' }))
  let merged = onlyReleased(withViewCounts(imports.map(normalizeItem)).filter((i) => i.type !== 'pic' && isFeedable(i) && !isAccountHidden(i.creatorId || i.userId, i.handle)))
  merged = merged.map((i) => {
    const cid = i.creatorId || i.userId
    return { ...i, pinned: cid ? isPinned(cid, i.id) : false }
  })
  merged = [...merged].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  })
  try {
    const ranked = rankForUser(merged, userId || 'anon')
    const pins = ranked.filter((i) => i.pinned)
    const rest = ranked.filter((i) => !i.pinned)
    return [...pins, ...rest]
  } catch {
    return merged
  }
}

export function getShortsFeed(userId = null) {
  const shorts = getHomeFeed(null).filter((i) => i.type === 'short' && isFeedable(i) && !isReferenceItem(i))
  try { return rankForUser(shorts, userId || 'anon') } catch { return shorts }
}

export function listPopularCreators(limit = 24) {
  const indexed = Object.fromEntries(listIndexedUsers().map((u) => [u.id, u]))
  const by = {}
  for (const raw of getImports()) {
    const item = normalizeItem(raw)
    if (!item || !isReleased(item) || !isFeedable(item) || isReferenceItem(item)) continue
    if (isAccountHidden(item.creatorId || item.userId, item.handle)) continue
    const id = item.creatorId || item.userId
    if (!id) continue
    const meta = indexed[id] || {}
    if (!by[id]) {
      by[id] = {
        id,
        handle: item.handle || meta.handle || '',
        displayName: meta.displayName || item.displayName || item.handle || 'Creator',
        avatarUrl: meta.avatarUrl || item.avatarUrl || null,
        items: [],
      }
    }
    by[id].items.push(item)
    if (item.handle) by[id].handle = item.handle
    if (meta.displayName) by[id].displayName = meta.displayName
    if (meta.avatarUrl) by[id].avatarUrl = meta.avatarUrl
  }
  return Object.values(by)
    .map((c) => {
      let views = 0
      let qualitySum = 0
      let newest = 0
      for (const item of c.items) {
        const v = (readViews()[item.id] || item.views || 0)
        views += v
        qualitySum += computeContentQuality(item.engagement || {}, { isOriginal: true })
        newest = Math.max(newest, new Date(item.createdAt || 0).getTime())
      }
      const n = c.items.length
      const quality = n ? qualitySum / n : 0
      const ageH = Math.max(0.5, (Date.now() - (newest || Date.now())) / 3600000)
      const vel = computeVelocity({ completionRate: quality / 100, loops: 0, shares: 0 }, ageH)
      const fresh = 0.5 + 0.5 * Math.exp(-ageH / 36)
      const score = quality * 0.45 + Math.min(vel, 20) * 2 + Math.min(n, 30) * 2 + views * 0.05 + fresh * 10
      return {
        ...c,
        clipCount: c.items.filter((i) => i.type === 'short').length,
        videoCount: c.items.filter((i) => i.type === 'video').length,
        picCount: c.items.filter((i) => i.type === 'pic').length,
        postCount: n,
        views,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

const TOP_CREATORS_KEY = 'clips_top_creators_cache'
let topCreatorCache = []

function officialCreatorCards() {
  return OFFICIAL_CREATORS.map((c) => ({
    id: c.id,
    handle: c.handle,
    displayName: c.displayName,
    avatarUrl: c.avatarUrl,
    postCount: 0,
  }))
}

function readPersistedCreators() {
  if (topCreatorCache.length) return topCreatorCache
  try {
    const stored = lsGet(TOP_CREATORS_KEY, [])
    if (Array.isArray(stored) && stored.length) {
      topCreatorCache = stored
      return stored
    }
  } catch {}
  return []
}

function persistCreators(list) {
  if (!list.length) return
  topCreatorCache = list
  try { lsSet(TOP_CREATORS_KEY, list.slice(0, 32)) } catch {}
}

export function resolvePublicCreator(handle, userId = null) {
  const h = String(handle || '').toLowerCase().replace(/^@/, '')
  const official =
    OFFICIAL_CREATORS.find((c) => String(c.handle || '').toLowerCase() === h) ||
    OFFICIAL_CREATORS.find((c) => c.id === userId) ||
    null
  if (official) return official
  const users = listIndexedUsers()
  const indexed =
    users.find((u) => String(u.handle || '').toLowerCase() === h) ||
    users.find((u) => u.id === userId) ||
    null
  let fromCatalog = null
  try {
    fromCatalog = (getImports() || []).find((i) => {
      if (userId && (i.creatorId === userId || i.userId === userId)) return true
      if (h && String(i.handle || i.creatorHandle || '').toLowerCase().replace(/^@/, '') === h) return true
      return false
    }) || null
  } catch {
    fromCatalog = null
  }
  const id = indexed?.id || fromCatalog?.creatorId || fromCatalog?.userId || userId || null
  if (!id && !h) return null
  return {
    id,
    handle: indexed?.handle || h || fromCatalog?.handle || '',
    displayName: indexed?.displayName || fromCatalog?.displayName || fromCatalog?.creatorName || h || 'Creator',
    avatarUrl: indexed?.avatarUrl || fromCatalog?.avatarUrl || '',
    bannerUrl: indexed?.bannerUrl || '',
    bio: indexed?.bio || '',
  }
}

export function listSidebarCreators(limit = 8) {
  let ranked = []
  try {
    ranked = listPopularCreators(Math.max(limit, 8))
  } catch {
    ranked = []
  }
  const merged = []
  const seen = new Set()
  for (const c of [...ranked, ...officialCreatorCards(), ...readPersistedCreators()]) {
    if (!c?.id || seen.has(c.id)) continue
    seen.add(c.id)
    merged.push(c)
  }
  if (merged.length) persistCreators(merged)
  const stable = topCreatorCache.length ? topCreatorCache : merged
  return (stable.length ? stable : officialCreatorCards()).slice(0, limit)
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
  const catalog = onlyReleased(withViewCounts(getImports().map(normalizeItem))).filter(isFeedable)
  const pics = getPicsFeed().map((p) => normalizeItem({ ...p, type: 'pic' })).filter((p) => p && isFeedable(p))
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
  const pool = onlyReleased(withViewCounts(getImports().map(normalizeItem))).filter((i) => i.id !== item.id && i.type !== 'pic')
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

export function getMoreFromCreator(item, limit = 8) {
  if (!item) return []
  return getCreatorPublicContent(item.creatorId, item.handle)
    .filter((i) => i.id !== item.id && i.type !== 'pic')
    .slice(0, limit)
}

export function getWatchQueue(item) {
  if (!item) return { prev: null, next: null, queue: [] }
  const more = getMoreFromCreator(item, 20)
  const related = getRelated(item, 12)
  const seen = new Set([item.id])
  const queue = []
  for (const i of [...more, ...related]) {
    if (!i || seen.has(i.id)) continue
    seen.add(i.id)
    queue.push(i)
  }
  const creatorVids = getCreatorPublicContent(item.creatorId, item.handle).filter((i) => i.type === item.type)
  const idx = creatorVids.findIndex((i) => i.id === item.id)
  const prev = idx >= 0 ? (creatorVids[idx + 1] || null) : null
  const next = (idx > 0 ? creatorVids[idx - 1] : null) || queue[0] || related[0] || null
  return { prev, next, queue }
}

export function getBySound(soundId, soundTitle) {
  const all = onlyReleased(withViewCounts(getImports().map(normalizeItem))).filter((i) => i.type !== 'pic')
  return all.filter((i) => {
    if (soundId && i.soundId === soundId) return true
    if (soundTitle && i.soundTitle && String(i.soundTitle) === String(soundTitle)) return true
    return false
  })
}

export function getByTag(tag) {
  const t = String(tag || '').trim().toLowerCase().replace(/^#/, '')
  if (!t) return []
  const all = onlyReleased(withViewCounts(getImports().map(normalizeItem)))
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

export function getStableHomeFeed(userId = null) {
  return freezeFeed('home', userId || 'anon', () => getHomeFeed(userId))
}

export function getStableShortsFeed(userId = null) {
  return freezeFeed('shorts', userId || 'anon', () => getShortsFeed(userId))
}

export function getStableFollowingFeed(userId, { shortsOnly = false } = {}) {
  if (!userId) return []
  return freezeFeed(
    shortsOnly ? 'followingShorts' : 'following',
    userId,
    () => getFollowingFeed(userId, { shortsOnly }),
  )
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
  if (!id) return null
  const fromImport = getImports().find((i) => i.id === id)
  if (fromImport && !isReferenceItem(fromImport) && !isRetiredCatalogItem(fromImport) && isReleased(fromImport)) {
    return normalizeItem(withViewCounts([fromImport])[0])
  }
  return null
}

const watchStash = new Map()

export function stashWatchItem(item) {
  if (!item?.id) return
  watchStash.set(String(item.id), item)
  if (watchStash.size > 32) {
    const oldest = watchStash.keys().next().value
    watchStash.delete(oldest)
  }
}

function peekWatchStash(id) {
  return watchStash.get(String(id)) || null
}

export function getWatchItem(id, fallback = null) {
  if (!id) return null
  const strict = getById(id)
  if (strict) return strict
  const stashed = peekWatchStash(id)
  const fb = fallback && String(fallback.id) === String(id) ? fallback : stashed
  if (fb) return normalizeItem(withViewCounts([fb])[0])
  const raw = getImports().find((i) => i.id === id)
  if (raw) return normalizeItem(withViewCounts([raw])[0])
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

export async function publishLocalMedia(file, actor = null, {
  type = null, title = null, description = null, sound = null, tags = [],
  stitchOf = null, chapters = [], captionsText = '', scheduledFor = null, status = 'published',
  priceUsd = 0,
} = {}) {
  if (!file) return { ok: false, item: null, error: 'Choose a video file.' }
  if (!actor?.id) return { ok: false, item: null, error: signInToUploadMessage() }

  const host = await resolveUploadHost(actor)
  if (!host?.id) {
    return {
      ok: false,
      item: null,
      error: uploadHostRequiredMessage(actor),
    }
  }

  try {
    const processed = await transcodeVideoForUpload(file, { asClip: type === 'short' })
    const outFile = processed.file || file
    const id = newContentId()

    const up = await uploadVideoToSupabase(outFile, host.id)
    if (!up.ok || !up.publicUrl) {
      return { ok: false, item: null, error: up.error || uploadFailedMessage() }
    }
    const mediaUrl = up.publicUrl

    let thumbUrl = ''
    const thumbRaw = String(processed.thumbUrl || '')
    if (thumbRaw.startsWith('data:image/')) {
      const thumbUp = await uploadDataUrlToSupabase(thumbRaw, host.id, `${id}_thumb.jpg`)
      if (thumbUp.ok && thumbUp.publicUrl) thumbUrl = thumbUp.publicUrl
    }

    const isVertical = processed.height > processed.width
    const isShortDuration = processed.durationSec && processed.durationSec <= 90
    const inferredType = type || (isVertical || isShortDuration ? 'short' : 'video')
    const finalTitle =
      (title && String(title).trim()) ||
      String(file.name || 'Untitled').replace(/\.[^.]+$/, '') ||
      'Untitled'
    const finalDescription = description != null ? String(description).trim() : ''
    const cleanTags = mergeTags(tags, finalDescription)
    const cleanChapters = (Array.isArray(chapters) ? chapters : [])
      .map((c) => ({ title: String(c.title || '').trim().slice(0, 80), t: Number(c.t) || 0 }))
      .filter((c) => c.title)
    const when = scheduledFor ? new Date(scheduledFor).getTime() : 0
    const isFuture = when && when > Date.now()
    const finalStatus = status === 'draft' ? 'draft' : (isFuture ? 'scheduled' : 'published')
    const parsedPrice = Number(priceUsd)
    const finalPrice = Number.isFinite(parsedPrice) && parsedPrice > 0
      ? Math.round(parsedPrice * 100) / 100
      : 0

    const record = {
      id,
      type: inferredType,
      title: finalTitle.slice(0, 120),
      description: finalDescription.slice(0, 5000),
      sourceUrl: mediaUrl,
      mediaUrl,
      thumbUrl: thumbUrl || mediaUrl,
      origin: 'upload',
      hosted: true,
      localStored: false,
      storagePath: up.path || '',
      storedBytes: outFile.size || file.size || 0,
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
      stitchOf: stitchOf || null,
      chapters: cleanChapters,
      captionsText: String(captionsText || '').slice(0, 20000),
      scheduledFor: isFuture ? new Date(when).toISOString() : null,
      status: finalStatus,
      publishedAt: finalStatus === 'published' ? new Date().toISOString() : null,
      priceUsd: finalPrice,
      creatorId: host.id,
      userId: host.id,
      handle: host.handle || actor.handle,
    }

    if (finalStatus === 'published') {
      const pushed = await pushContentRecord(record, host)
      if (!pushed.ok) {
        await deleteHostedMedia(mediaUrl)
        if (thumbUrl && thumbUrl !== mediaUrl) await deleteHostedMedia(thumbUrl)
        return { ok: false, item: null, error: pushed.error || uploadFailedMessage() }
      }
    }

    saveImport(record)
    if (cleanChapters.length) setChapters(id, cleanChapters)
    if (record.captionsText) setCaptions(id, [{ lang: 'en', text: record.captionsText }])
    notifyContentChanged()
    syncContentFromCloud(host).catch(() => {})

    if (finalStatus === 'published') {
      notifyFollowersOfUpload({
        creatorId: record.creatorId,
        handle: record.handle,
        title: record.title,
      })
    }

    return { ok: true, item: normalizeItem(record), error: null, hosted: true, localStored: false, status: finalStatus }
  } catch (err) {
    return { ok: false, item: null, error: err?.message || uploadFailedMessage() }
  }
}

export async function publishDraftItem(id, actor = null) {
  const raw = getImports().find((i) => i.id === id)
  if (!raw) return { ok: false, error: 'Draft not found.' }
  const media = String(raw.mediaUrl || raw.sourceUrl || '')
  const hasHttp = media.startsWith('http://') || media.startsWith('https://')
  if (!hasHttp) {
    return { ok: false, error: uploadFailedMessage() }
  }
  const next = {
    ...raw,
    status: 'published',
    publishedAt: new Date().toISOString(),
    scheduledFor: null,
    hosted: true,
    localStored: false,
    origin: raw.origin === 'pic-local' ? 'pic-upload' : (raw.origin === 'upload-local' ? 'upload' : raw.origin),
  }
  const host = await resolveUploadHost(actor?.id ? actor : { id: raw.creatorId, handle: raw.handle, provider: 'supabase' })
  if (host?.id) {
    const pushed = await pushContentRecord(next, host)
    if (!pushed.ok) return { ok: false, error: pushed.error || uploadFailedMessage() }
  }
  saveImport(next)
  notifyContentChanged()
  if (raw.creatorId) {
    notifyFollowersOfUpload({ creatorId: raw.creatorId, handle: raw.handle, title: raw.title })
  }
  return { ok: true, item: normalizeItem(next) }
}

/** Remove a post from the session catalog, Supabase, and storage. */
export async function deleteCatalogItem(id, actor = null) {
  if (!id) return { ok: false, error: 'Missing id' }
  const raw = getImports().find((i) => i.id === id) || null

  removeImport(id)
  notifyContentChanged()

  const cloudOk = await deleteContentRecord(id, actor)

  if (raw) {
    const urls = [raw.mediaUrl, raw.sourceUrl, raw.thumbUrl, raw.mosaicThumb]
    for (const u of urls) {
      if (String(u || '').includes('/storage/v1/object/public/clips/')) {
        await deleteHostedMedia(u)
      }
    }
  }

  try {
    await syncContentFromCloud(actor)
  } catch { /* ok */ }
  removeImport(id)
  notifyContentChanged()

  return { ok: true, cloudOk }
}

export function flushScheduledPublishes() {
  const now = Date.now()
  let changed = false
  for (const raw of getImports()) {
    if (raw.status !== 'scheduled') continue
    const when = new Date(raw.scheduledFor || 0).getTime()
    if (!when || when > now) continue
    updateImport(raw.id, { status: 'published', publishedAt: new Date().toISOString() })
    if (raw.creatorId) {
      notifyFollowersOfUpload({ creatorId: raw.creatorId, handle: raw.handle, title: raw.title })
    }
    deleteScheduled(raw.schedId)
    changed = true
  }
  if (changed) notifyContentChanged()
  return changed
}

export function recordContentView(id) {
  const views = readViews()
  views[id] = (views[id] || 0) + 1
  writeViews(views)
  return views[id]
}
