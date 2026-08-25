/**
 * Live site promotions. Presets are copy templates only — nothing shows
 * until an admin publishes. No invented viewer counts or demo catalog IDs.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { notifyContentChanged } from './contentSync'

const LIST_KEY = 'clips_site_promos'
const DISMISS_KEY = 'clips_promo_dismissed'
const TABLE = 'site_promos'
const EVENT = 'clips-promos-changed'

export const PROMO_PRESETS = [
  {
    id: 'launch',
    name: 'Launch week',
    headline: 'calabi is live',
    body: 'Watch videos, clips, and pics. Upload from Create in the menu.',
    ctaLabel: 'Open Recommended',
    destView: 'home',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'creator-apps',
    name: 'Creator applications',
    headline: 'Creator applications are open',
    body: 'Apply to go live and use Studio.',
    ctaLabel: 'Apply',
    destView: 'creator-apply',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'go-live',
    name: 'Go live',
    headline: 'Go live on calabi',
    body: 'Approved creators can start a listing from + → Go live.',
    ctaLabel: 'Open Live',
    destView: 'live',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'advertise',
    name: 'Advertise',
    headline: 'Advertise on calabi',
    body: 'Apply to run a real campaign. Empty inventory never shows sample ads.',
    ctaLabel: 'Advertise',
    destView: 'advertise',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'clips-pics',
    name: 'Clips + Pics',
    headline: 'calabi and Pics',
    body: 'Vertical clips and a quiet photo mosaic — no grid likes or DMs.',
    ctaLabel: 'Watch clips',
    destView: 'clips',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'explore',
    name: 'Explore',
    headline: 'Find videos, clips, and pics',
    body: 'Search and filter by type, date, and length.',
    ctaLabel: 'Explore',
    destView: 'explore',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'following',
    name: 'Following',
    headline: 'Follow creators',
    body: 'See their uploads on Following.',
    ctaLabel: 'Following',
    destView: 'subscriptions',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'premium',
    name: 'Premium (Stripe)',
    headline: 'Channel memberships',
    body: 'Premium livestream membership when Stripe is connected. Follow stays free.',
    ctaLabel: 'Membership',
    destView: 'checkout',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'featured-watch',
    name: 'Featured watch',
    headline: 'Watch this',
    body: 'Paste a real video or clip ID after it is published.',
    ctaLabel: 'Watch',
    destView: 'watch',
    destId: '',
    featureContentId: '',
    placement: 'home',
  },
  {
    id: 'upload-drive',
    name: 'Upload drive',
    headline: 'Post a video or clip',
    body: 'Use +. Drafts and schedule live in Studio.',
    ctaLabel: 'Open Studio',
    destView: 'dashboard',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'maintenance',
    name: 'Status',
    headline: 'We are working on calabi',
    body: 'Playback and uploads still work. Check Help if something looks off.',
    ctaLabel: 'Help',
    destView: 'help',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
  {
    id: 'rules',
    name: 'Content rules',
    headline: 'Post only what you have rights to',
    body: 'Read the rules before you upload.',
    ctaLabel: 'Content rules',
    destView: 'content-rules',
    destId: '',
    featureContentId: '',
    placement: 'banner',
  },
]

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT))
  notifyContentChanged()
}

function readList() {
  const list = lsGet(LIST_KEY, [])
  return Array.isArray(list) ? list : []
}

function writeList(list) {
  lsSet(LIST_KEY, list)
  emit()
  return list
}

export function listPromoPresets() {
  return PROMO_PRESETS
}

export function draftFromPreset(presetId) {
  const preset = PROMO_PRESETS.find((p) => p.id === presetId)
  if (!preset) return null
  return {
    id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    presetId: preset.id,
    headline: preset.headline,
    body: preset.body,
    ctaLabel: preset.ctaLabel,
    destView: preset.destView,
    destId: preset.destId || '',
    featureContentId: preset.featureContentId || '',
    placement: preset.placement || 'banner',
    published: false,
    startsAt: '',
    endsAt: '',
    clicks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function isPromoLive(promo, now = Date.now()) {
  if (!promo || promo.published !== true) return false
  if (promo.startsAt) {
    const t = new Date(promo.startsAt).getTime()
    if (t && t > now) return false
  }
  if (promo.endsAt) {
    const t = new Date(promo.endsAt).getTime()
    if (t && t < now) return false
  }
  return true
}

export function listPromotions() {
  return readList().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
}

export function getActivePromotion(now = Date.now()) {
  return listPromotions().find((p) => isPromoLive(p, now)) || null
}

export function savePromotion(row) {
  if (!row?.id) return null
  const next = {
    ...row,
    headline: String(row.headline || '').trim().slice(0, 80),
    body: String(row.body || '').trim().slice(0, 240),
    ctaLabel: String(row.ctaLabel || 'Open').trim().slice(0, 32),
    destView: String(row.destView || 'home').trim(),
    destId: String(row.destId || '').trim(),
    featureContentId: String(row.featureContentId || '').trim(),
    updatedAt: new Date().toISOString(),
  }
  const list = readList()
  const i = list.findIndex((p) => p.id === next.id)
  if (i >= 0) list[i] = { ...list[i], ...next }
  else list.unshift(next)
  writeList(list)
  pushPromoToCloud(next).catch(() => {})
  return next
}

export function publishPromotion(id) {
  const list = readList().map((p) => ({
    ...p,
    published: p.id === id,
    updatedAt: new Date().toISOString(),
  }))
  writeList(list)
  const row = list.find((p) => p.id === id)
  if (row) pushPromoToCloud(row).catch(() => {})
  list.filter((p) => p.id !== id).forEach((p) => pushPromoToCloud(p).catch(() => {}))
  return row || null
}

export function unpublishPromotion(id) {
  const list = readList().map((p) => (p.id === id ? { ...p, published: false, updatedAt: new Date().toISOString() } : p))
  writeList(list)
  const row = list.find((p) => p.id === id)
  if (row) pushPromoToCloud(row).catch(() => {})
  return row || null
}

export function deletePromotion(id) {
  writeList(readList().filter((p) => p.id !== id))
  deletePromoFromCloud(id).catch(() => {})
}

export function recordPromoClick(id) {
  const list = readList()
  const row = list.find((p) => p.id === id)
  if (!row) return
  row.clicks = (Number(row.clicks) || 0) + 1
  row.updatedAt = new Date().toISOString()
  writeList(list)
  pushPromoToCloud(row).catch(() => {})
}

export function dismissPromotion(id) {
  const map = lsGet(DISMISS_KEY, {}) || {}
  map[id] = new Date().toISOString()
  lsSet(DISMISS_KEY, map)
  emit()
}

export function isPromoDismissed(id) {
  const map = lsGet(DISMISS_KEY, {}) || {}
  return !!map[id]
}

export function subscribePromos(onChange) {
  if (typeof window === 'undefined') return () => {}
  const fn = () => onChange?.()
  window.addEventListener(EVENT, fn)
  window.addEventListener('storage', fn)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener('storage', fn)
  }
}

function toRow(p) {
  return {
    id: p.id,
    preset_id: p.presetId || null,
    headline: p.headline,
    body: p.body,
    cta_label: p.ctaLabel,
    dest_view: p.destView,
    dest_id: p.destId || '',
    feature_content_id: p.featureContentId || '',
    placement: p.placement || 'banner',
    published: !!p.published,
    starts_at: p.startsAt || null,
    ends_at: p.endsAt || null,
    clicks: Number(p.clicks) || 0,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString(),
  }
}

function fromRow(r) {
  return {
    id: r.id,
    presetId: r.preset_id || '',
    headline: r.headline,
    body: r.body || '',
    ctaLabel: r.cta_label || 'Open',
    destView: r.dest_view || 'home',
    destId: r.dest_id || '',
    featureContentId: r.feature_content_id || '',
    placement: r.placement || 'banner',
    published: !!r.published,
    startsAt: r.starts_at || '',
    endsAt: r.ends_at || '',
    clicks: Number(r.clicks) || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

async function pushPromoToCloud(promo) {
  if (!isSupabaseConfigured() || !promo?.id) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error } = await sb.from(TABLE).upsert(toRow(promo), { onConflict: 'id' })
    if (error) {
      console.warn('[Clips] Promo sync failed:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Clips] Promo sync failed:', err?.message)
    return false
  }
}

async function deletePromoFromCloud(id) {
  if (!isSupabaseConfigured() || !id) return
  try {
    const sb = await getSupabase()
    if (!sb) return
    await sb.from(TABLE).delete().eq('id', id)
  } catch {}
}

export async function syncPromotionsFromCloud() {
  if (!isSupabaseConfigured()) return []
  try {
    const sb = await getSupabase()
    if (!sb) return []
    const { data, error } = await sb.from(TABLE).select('*').order('updated_at', { ascending: false }).limit(40)
    if (error || !data) return []
    const incoming = data.map(fromRow)
    const local = readList()
    const byId = new Map(local.map((p) => [p.id, p]))
    for (const row of incoming) {
      const prev = byId.get(row.id)
      if (!prev || new Date(row.updatedAt || 0) >= new Date(prev.updatedAt || 0)) {
        byId.set(row.id, { ...prev, ...row })
      }
    }
    writeList([...byId.values()])
    return incoming
  } catch {
    return []
  }
}
