/**
 * Platform News — left-menu News tab.
 * Cloud (site_news) is source of truth when migration 0019 is applied.
 * Seeded items fill the feed until cloud posts exist (product truth, not fake metrics).
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const CACHE_KEY = 'clips_site_news_cache'
const TABLE = 'site_news'
const EVENT = 'clips-news-changed'

/** Always-available product updates (shown when cloud is empty or offline). */
export const SEED_NEWS = [
  {
    id: 'seed_cash_coins',
    title: 'Calabi Cash + Gold Coins',
    body: 'Cash is for donations, TTS, premium, and paid features. Coins are for chat — bigger messages, creator emojis & GIFs, and more later. Buy packs in Wallet under Site settings.',
    tag: 'Money',
    destView: 'settings',
    destId: 'wallet',
    ctaLabel: 'Open Wallet',
    publishedAt: '2026-08-20T12:00:00.000Z',
  },
  {
    id: 'seed_media_priority',
    title: 'Videos, Clips, and Pics come first',
    body: 'Watch, Clips, and Pics load ahead of everything else on the site — the feed is the product.',
    tag: 'Product',
    destView: 'home',
    destId: '',
    ctaLabel: 'Recommended',
    publishedAt: '2026-08-22T12:00:00.000Z',
  },
  {
    id: 'seed_shop',
    title: 'Shop is live in the menu',
    body: 'Browse creator merch from Shop. Sellers manage listings in Seller portal (under More).',
    tag: 'Shop',
    destView: 'shop',
    destId: '',
    ctaLabel: 'Open Shop',
    publishedAt: '2026-08-24T12:00:00.000Z',
  },
  {
    id: 'seed_studio',
    title: 'Creator Studio: Earnings + bubble map',
    body: 'Creators get Earnings (not Wallet) in Studio, plus an audience bubble map — every signed-in viewer, with colored rings for like, follow, share, and more.',
    tag: 'Creators',
    destView: 'dashboard',
    destId: '',
    ctaLabel: 'Creator Studio',
    publishedAt: '2026-08-26T12:00:00.000Z',
  },
]

function notify() {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {}
}

export function subscribeNewsChanged(fn) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => { try { fn?.() } catch {} }
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

function fromRow(row) {
  if (!row?.id) return null
  return {
    id: String(row.id),
    title: String(row.title || '').trim() || 'Update',
    body: String(row.body || '').trim(),
    tag: String(row.tag || 'Update').trim() || 'Update',
    destView: String(row.dest_view || row.destView || '').trim(),
    destId: String(row.dest_id || row.destId || '').trim(),
    ctaLabel: String(row.cta_label || row.ctaLabel || '').trim(),
    publishedAt: row.published_at || row.publishedAt || row.created_at || new Date().toISOString(),
    source: 'cloud',
  }
}

function cacheCloud(rows) {
  lsSet(CACHE_KEY, Array.isArray(rows) ? rows : [])
}

function readCache() {
  const rows = lsGet(CACHE_KEY, [])
  return Array.isArray(rows) ? rows.map(fromRow).filter(Boolean) : []
}

/** Published news for the News tab — cloud first, seed fills gaps. */
export function listNews(limit = 40) {
  const cloud = readCache()
  const byId = new Map()
  for (const row of SEED_NEWS) {
    byId.set(row.id, { ...row, source: 'seed' })
  }
  // Cloud overrides same ids and adds new posts
  for (const row of cloud) {
    byId.set(row.id, row)
  }
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit)
}

export async function syncNewsFromCloud() {
  if (!isSupabaseConfigured()) return listNews()
  try {
    const sb = await getSupabase()
    if (!sb) return listNews()
    const { data, error } = await sb
      .from(TABLE)
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(80)
    if (!error && Array.isArray(data)) {
      cacheCloud(data)
      notify()
    }
  } catch {}
  return listNews()
}

/** Admin: list all (incl. drafts) when signed in as admin. */
export async function pullAllNewsForAdmin() {
  if (!isSupabaseConfigured()) return []
  try {
    const sb = await getSupabase()
    if (!sb) return []
    const { data, error } = await sb
      .from(TABLE)
      .select('*')
      .order('published_at', { ascending: false })
      .limit(100)
    if (error || !Array.isArray(data)) return []
    return data.map(fromRow).filter(Boolean)
  } catch {
    return []
  }
}

export async function publishNewsPost(partial = {}) {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Cloud not configured' }
  const sb = await getSupabase()
  if (!sb) return { ok: false, error: 'No session' }
  const id = partial.id || `news_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const row = {
    id,
    title: String(partial.title || '').trim().slice(0, 160),
    body: String(partial.body || '').trim().slice(0, 4000),
    tag: String(partial.tag || 'Update').trim().slice(0, 40),
    dest_view: String(partial.destView || '').trim().slice(0, 64),
    dest_id: String(partial.destId || '').trim().slice(0, 120),
    cta_label: String(partial.ctaLabel || '').trim().slice(0, 40),
    published: partial.published !== false,
    published_at: partial.publishedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (!row.title || !row.body) return { ok: false, error: 'Title and body required' }
  try {
    const { error } = await sb.from(TABLE).upsert(row)
    if (error) return { ok: false, error: error.message }
    await syncNewsFromCloud()
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed' }
  }
}

export async function unpublishNewsPost(id) {
  if (!id || !isSupabaseConfigured()) return { ok: false }
  const sb = await getSupabase()
  if (!sb) return { ok: false }
  try {
    const { error } = await sb.from(TABLE).update({ published: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    await syncNewsFromCloud()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed' }
  }
}

export function formatNewsWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}
