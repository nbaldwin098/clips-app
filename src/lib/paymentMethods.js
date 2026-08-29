/**
 * Saved payment methods shared by Shop + Wallet.
 * Client-side vault for launch UX (last4 only — no full card numbers).
 */
import { lsGet, lsSet } from './storage'

const KEY = 'calabi_payment_methods'
const PROMPT_KEY = 'calabi_save_payment_prompt'

function uid() {
  return `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function listPaymentMethods(userId) {
  if (!userId) return []
  const all = lsGet(KEY, {}) || {}
  const rows = Array.isArray(all[userId]) ? all[userId] : []
  return rows.filter((r) => r && r.id)
}

export function savePaymentMethod(userId, method) {
  if (!userId) return null
  const brand = String(method?.brand || 'Card').slice(0, 24)
  const last4 = String(method?.last4 || '').replace(/\D/g, '').slice(-4)
  if (last4.length !== 4) return null
  const row = {
    id: method?.id || uid(),
    brand,
    last4,
    expMonth: Number(method?.expMonth) || 12,
    expYear: Number(method?.expYear) || new Date().getFullYear() + 3,
    label: String(method?.label || `${brand} •••• ${last4}`).slice(0, 48),
    createdAt: method?.createdAt || new Date().toISOString(),
  }
  const all = lsGet(KEY, {}) || {}
  const prev = Array.isArray(all[userId]) ? all[userId] : []
  const next = [row, ...prev.filter((r) => r.id !== row.id)].slice(0, 8)
  all[userId] = next
  lsSet(KEY, all)
  return row
}

export function removePaymentMethod(userId, id) {
  if (!userId || !id) return
  const all = lsGet(KEY, {}) || {}
  const prev = Array.isArray(all[userId]) ? all[userId] : []
  all[userId] = prev.filter((r) => r.id !== id)
  lsSet(KEY, all)
}

/** After a paid return, ask once per session whether to save a demo card stub. */
export function shouldPromptSavePayment(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(`${PROMPT_KEY}_${userId}`) === '1'
  } catch {
    return false
  }
}

export function markPaymentSavePrompt(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return
  try { sessionStorage.setItem(`${PROMPT_KEY}_${userId}`, '1') } catch { /* ignore */ }
}

export function clearPaymentSavePrompt(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return
  try { sessionStorage.removeItem(`${PROMPT_KEY}_${userId}`) } catch { /* ignore */ }
}

export const DEMO_SHOP_PRODUCTS = [
  { id: 'demo_prod_hoodie', sellerId: 'demo_seller', title: 'Calabi Hoodie', description: 'Heavyweight black hoodie with white wordmark.', kind: 'physical', priceCents: 4800, shippingCents: 600, currency: 'usd', stock: 40, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=640&q=80', active: true },
  { id: 'demo_prod_cap', sellerId: 'demo_seller', title: 'Studio Cap', description: 'Unstructured cap for late edit sessions.', kind: 'physical', priceCents: 2200, shippingCents: 400, currency: 'usd', stock: 80, imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=640&q=80', active: true },
  { id: 'demo_prod_pack', sellerId: 'demo_seller', title: 'Clip Pack: Night Cuts', description: 'Digital pack of royalty-cleared night B-roll.', kind: 'virtual', priceCents: 900, shippingCents: 0, currency: 'usd', stock: null, imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=640&q=80', active: true },
  { id: 'demo_prod_mug', sellerId: 'demo_seller', title: 'Desk Mug', description: 'Matte ceramic mug for long streams.', kind: 'physical', priceCents: 1600, shippingCents: 500, currency: 'usd', stock: 120, imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcc036?w=640&q=80', active: true },
  { id: 'demo_prod_preset', sellerId: 'demo_seller', title: 'Color Presets Vol. 1', description: 'Five looks for clips and pics.', kind: 'virtual', priceCents: 1200, shippingCents: 0, currency: 'usd', stock: null, imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80', active: true },
  { id: 'demo_prod_tote', sellerId: 'demo_seller', title: 'Market Tote', description: 'Canvas tote with side pocket.', kind: 'physical', priceCents: 2800, shippingCents: 500, currency: 'usd', stock: 60, imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=640&q=80', active: true },
  { id: 'demo_prod_sticker', sellerId: 'demo_seller', title: 'Sticker Sheet', description: 'Eight vinyl stickers for laptops.', kind: 'physical', priceCents: 800, shippingCents: 300, currency: 'usd', stock: 200, imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b7993143456?w=640&q=80', active: true },
  { id: 'demo_prod_beat', sellerId: 'demo_seller', title: 'Beat Lease — Amber', description: 'Wav + tagged mp3 lease for creators.', kind: 'virtual', priceCents: 2500, shippingCents: 0, currency: 'usd', stock: null, imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=640&q=80', active: true },
]

export function productsWithDemo(cloudProducts = []) {
  return Array.isArray(cloudProducts) ? cloudProducts.filter((p) => p && !String(p.id || '').startsWith('demo_')) : []
}
