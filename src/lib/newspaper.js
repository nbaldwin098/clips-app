/**
 * User newspaper posts — paragraphs + photos/videos on the News tab.
 * Local device feed (cloud optional later). Not product-changelog seeds.
 */
import { lsGet, lsSet } from './storage'
import { newContentId } from './newContentId'
const KEY = 'calabi_newspaper_posts'
const EVENT = 'clips-newspaper-changed'

function notify() {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {}
}

export function subscribeNewspaper(fn) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => { try { fn?.() } catch {} }
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

function normalize(row) {
  if (!row?.id) return null
  const body = String(row.body || '').trim()
  const media = Array.isArray(row.media)
    ? row.media.filter((m) => m && (m.url || m.src)).map((m) => ({
      type: m.type === 'video' || m.type === 'gif' ? m.type : 'image',
      url: String(m.url || m.src || ''),
      alt: String(m.alt || ''),
    }))
    : []
  if (!body && !media.length) return null
  return {
    id: String(row.id),
    body,
    media,
    handle: String(row.handle || '').replace(/^@/, ''),
    displayName: String(row.displayName || row.handle || 'Anonymous'),
    authorId: row.authorId || row.userId || '',
    publishedAt: row.publishedAt || row.createdAt || new Date().toISOString(),
  }
}

export function listNewspaper(limit = 60) {
  const stored = (lsGet(KEY, []) || []).map(normalize).filter(Boolean)
  return stored
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit)
}

export function publishNewspaperPost({ body, media = [], user } = {}) {
  if (!user?.id) return { ok: false, error: 'Sign in to publish.' }
  const text = String(body || '').trim().slice(0, 8000)
  const mediaRows = (Array.isArray(media) ? media : [])
    .filter((m) => m?.url)
    .slice(0, 8)
    .map((m) => ({
      type: m.type === 'video' || m.type === 'gif' ? m.type : 'image',
      url: String(m.url),
      alt: String(m.alt || ''),
    }))
  if (!text && !mediaRows.length) return { ok: false, error: 'Write a paragraph or add a photo/video.' }
  const row = {
    id: newContentId(),
    body: text,
    media: mediaRows,
    authorId: user.id,
    userId: user.id,
    handle: user.handle || '',
    displayName: user.displayName || user.handle || 'Creator',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  const all = [row, ...(lsGet(KEY, []) || [])].slice(0, 200)
  lsSet(KEY, all)
  notify()
  return { ok: true, item: normalize(row) }
}

export function deleteNewspaperPost(id, userId) {
  if (!id || !userId) return { ok: false }
  const next = (lsGet(KEY, []) || []).filter((r) => !(r.id === id && (r.authorId === userId || r.userId === userId)))
  lsSet(KEY, next)
  notify()
  return { ok: true }
}

export function splitParagraphs(body) {
  return String(body || '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function formatPaperWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

/* Back-compat aliases so old News imports keep working during the swap */
export function listNews(limit) {
  return listNewspaper(limit).map((n) => ({
    id: n.id,
    title: splitParagraphs(n.body)[0]?.slice(0, 80) || 'Story',
    body: n.body,
    tag: 'Paper',
    publishedAt: n.publishedAt,
    media: n.media,
    handle: n.handle,
    displayName: n.displayName,
  }))
}

export async function syncNewsFromCloud() {
  return listNews()
}

export function subscribeNewsChanged(fn) {
  return subscribeNewspaper(fn)
}

export function formatNewsWhen(iso) {
  return formatPaperWhen(iso)
}
