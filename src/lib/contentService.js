/**
 * Content service — UI-ready facade.
 *
 * Today: local seed + localStorage imports.
 * Tomorrow: swap internals to Supabase/API without changing component call sites.
 *
 * Contract for UI team:
 *   getHomeFeed(), getShortsFeed(), getExplore(), getById(),
 *   importUserLink(), listImports(), recordView()
 */

import { getLegalSeed, getLegalSeedById } from '../data/legalSeed'
import { getImports, saveImport, parseExternalShort, lsGet, lsSet } from './storage'
import { isLegalLibraryUrl, detectLegalOriginFromUrl } from './license'
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

/** Normalize any content row for cards / player shells */
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
    license: raw.license || null,
    attribution: raw.attribution || null,
    isSeed: !!raw.isSeed,
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
  const seeds = getLegalSeed({ type: 'short' })
  const imports = getImports().map((i) => ({
    ...i,
    type: i.type || 'short',
    isSeed: false,
  }))
  const merged = withViewCounts([...imports, ...seeds].map(normalizeItem))
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
  const all = withViewCounts(
    [...getImports(), ...getLegalSeed()].map(normalizeItem)
  )
  const q = query.trim().toLowerCase()
  if (!q) return all
  return all.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (i.attribution || '').toLowerCase().includes(q)
  )
}

export function getById(id) {
  const fromSeed = getLegalSeedById(id)
  if (fromSeed) return normalizeItem(withViewCounts([fromSeed])[0])
  const fromImport = getImports().find((i) => i.id === id)
  if (fromImport) return normalizeItem(withViewCounts([fromImport])[0])
  return null
}

export function listLegalLibrary(filters) {
  return getLegalSeed(filters).map(normalizeItem)
}

export function listImportsNormalized() {
  return withViewCounts(getImports().map(normalizeItem))
}

/**
 * User paste import (TikTok/YT/etc. or legal URL).
 * Zero binary storage — metadata + URL only.
 */
export function importUserLink(url, opts = {}) {
  const trimmed = (url || '').trim()
  if (!trimmed) return { ok: false, error: 'URL required' }

  const legalOrigin = detectLegalOriginFromUrl(trimmed)
  if (legalOrigin || isLegalLibraryUrl(trimmed)) {
    const record = {
      id: `ref_${Date.now()}`,
      type: 'short',
      platform: legalOrigin || 'legal',
      origin: legalOrigin || 'legal',
      sourceUrl: trimmed,
      mediaUrl: trimmed,
      title: opts.title || `Legal import (${legalOrigin || 'library'})`,
      description: opts.description || 'Imported from a legal public source. Binary remains at origin.',
      license: opts.license || 'Verify on source page',
      attribution: opts.attribution || 'See source',
      storedBytes: 0,
      isSeed: false,
      createdAt: new Date().toISOString(),
      tags: opts.tags || [],
      engagement: {
        completionRate: 0,
        loops: 0,
        shares: 0,
        comments: 0,
        saves: 0,
        earlySkips: 0,
        likes: 0,
      },
      views: 0,
    }
    saveImport(record)
    return { ok: true, item: normalizeItem(record) }
  }

  const parsed = parseExternalShort(trimmed)
  if (!parsed) {
    return {
      ok: false,
      error:
        'Unable to parse URL. Use TikTok, YouTube Shorts, Instagram, Twitch, Kick, or a legal library link (NASA, Wikimedia, Archive.org).',
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

/** API shape documentation for UI / future backend */
export const CONTENT_API_CONTRACT = {
  getHomeFeed: '() => ContentItem[]',
  getShortsFeed: '() => ContentItem[]',
  getExplore: '(query?: string) => ContentItem[]',
  getById: '(id: string) => ContentItem | null',
  importUserLink: '(url: string, opts?) => { ok, item?, error? }',
  listLegalLibrary: '(filters?) => ContentItem[]',
  recordView: '(id: string) => number',
}
