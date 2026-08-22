/**
 * Content service — UI-ready facade.
 * Catalog = user imports only (localStorage until backend).
 */

import { getImports, saveImport, parseExternalShort, lsGet, lsSet } from './storage'
import { rankForUser } from './algorithmEngine'

const VIEW_KEY = 'clips_content_views'

function readViews() {
  return lsGet(VIEW_KEY, {}) || {}
}

function writeViews(map) {
  lsSet(VIEW_KEY, map)
}

function withViewCounts(items) {
  const views = readViews()
  return items.map((i) => ({
    ...i,
    views: views[i.id] || i.views || 0,
  }))
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
    engagement: raw.engagement || {
      completionRate: 0,
      loops: 0,
      shares: 0,
      comments: 0,
      saves: 0,
      earlySkips: 0,
      likes: 0,
    },
    createdAt: raw.createdAt || new Date().toISOString(),
    crossPost: raw.crossPost || null,
  }
}

export function getHomeFeed(userId = null) {
  const imports = getImports().map((i) => ({
    ...i,
    type: i.type || 'short',
  }))
  const merged = withViewCounts(imports.map(normalizeItem))
  if (userId && typeof rankForUser === 'function') {
    try {
      return rankForUser(merged, userId)
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
  if (!q) return all
  return all.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.tags || []).some((t) => t.toLowerCase().includes(q))
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

export function importUserLink(url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return { ok: false, error: 'URL required' }

  const parsed = parseExternalShort(trimmed)
  if (!parsed) {
    return {
      ok: false,
      error:
        'Unable to parse URL. Use a TikTok, YouTube Shorts, Instagram, Twitch, or Kick link.',
    }
  }
  saveImport(parsed)
  return { ok: true, item: normalizeItem(parsed) }
}

export function recordView(id) {
  if (!id) return
  const map = readViews()
  map[id] = (map[id] || 0) + 1
  writeViews(map)
  return map[id]
}

export const CONTENT_API_CONTRACT = {
  getHomeFeed: '() => ContentItem[]',
  getShortsFeed: '() => ContentItem[]',
  getExplore: '(query?: string) => ContentItem[]',
  getById: '(id: string) => ContentItem | null',
  importUserLink: '(url: string) => { ok, item?, error? }',
  recordView: '(id: string) => number',
}
