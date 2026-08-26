/**
 * Marketplace — products, sellers, orders. Supabase source of truth (0018).
 * Platform fee = Stripe processing labeled for buyer/seller protection: 2.9% + $0.30.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getGraphActor } from './graphSync'
import { getStripePaymentLink, buildPaymentLink } from './stripeConfig'

const PRODUCTS_CACHE = 'marketplace_products_cache'
const SELLERS_CACHE = 'marketplace_sellers_cache'
const ORDERS_CACHE = 'marketplace_orders_cache'

/** Stripe-style processing fee, shown as platform fee for protection. */
export function calcPlatformFeeCents(subtotalPlusShippingCents) {
  const n = Math.max(0, Math.floor(Number(subtotalPlusShippingCents) || 0))
  return Math.round(n * 0.029) + 30
}

export const PLATFORM_FEE_EXPLAINER =
  'This platform fee covers payment processing plus buyer and seller protection (insurance-style coverage for disputes and fraud). It is 2.9% + $0.30 of the product and shipping total.'

function canCloud(userId) {
  const actor = getGraphActor()
  return !!(isSupabaseConfigured() && actor?.id && (!userId || actor.id === userId))
}

async function sb() {
  try { return await getSupabase() } catch { return null }
}

function mapProduct(r) {
  if (!r) return null
  return {
    id: r.id,
    sellerId: r.seller_id,
    title: r.title,
    description: r.description || '',
    kind: r.kind,
    priceCents: Number(r.price_cents) || 0,
    shippingCents: Number(r.shipping_cents) || 0,
    currency: r.currency || 'usd',
    stock: r.stock,
    imageUrl: r.image_url || '',
    active: r.active !== false,
    meta: r.meta || {},
    createdAt: r.created_at,
  }
}

function mapSeller(r) {
  if (!r) return null
  return {
    userId: r.user_id,
    kind: r.kind || 'creator',
    status: r.status || 'pending',
    displayName: r.display_name || '',
    bio: r.bio || '',
    payoutEmail: r.payout_email || '',
    createdAt: r.created_at,
  }
}

function mapOrder(r) {
  if (!r) return null
  return {
    id: r.id,
    buyerId: r.buyer_id,
    sellerId: r.seller_id,
    productId: r.product_id,
    productTitle: r.product_title || '',
    kind: r.kind,
    subtotalCents: Number(r.subtotal_cents) || 0,
    shippingCents: Number(r.shipping_cents) || 0,
    platformFeeCents: Number(r.platform_fee_cents) || 0,
    totalCents: Number(r.total_cents) || 0,
    status: r.status,
    trackingNumber: r.tracking_number || '',
    trackingCarrier: r.tracking_carrier || '',
    shippedAt: r.shipped_at,
    deliveredAt: r.delivered_at,
    releaseAt: r.release_at,
    disputeDeadline: r.dispute_deadline,
    createdAt: r.created_at,
  }
}

export function cachedProducts() {
  const rows = lsGet(PRODUCTS_CACHE, [])
  return Array.isArray(rows) ? rows : []
}

export function cachedSellers() {
  const rows = lsGet(SELLERS_CACHE, [])
  return Array.isArray(rows) ? rows : []
}

export function cachedOrders() {
  const rows = lsGet(ORDERS_CACHE, [])
  return Array.isArray(rows) ? rows : []
}

export async function pullMarketplaceCatalog() {
  if (!isSupabaseConfigured()) return { ok: false, products: cachedProducts() }
  const client = await sb()
  if (!client) return { ok: false, products: cachedProducts() }
  try {
    const [{ data: products }, { data: sellers }] = await Promise.all([
      client.from('marketplace_products').select('*').eq('active', true).order('created_at', { ascending: false }).limit(200),
      client.from('marketplace_sellers').select('*').eq('status', 'approved').limit(200),
    ])
    const p = (products || []).map(mapProduct).filter(Boolean)
    const s = (sellers || []).map(mapSeller).filter(Boolean)
    lsSet(PRODUCTS_CACHE, p)
    lsSet(SELLERS_CACHE, s)
    return { ok: true, products: p, sellers: s }
  } catch (e) {
    return { ok: false, products: cachedProducts(), error: String(e?.message || e) }
  }
}

export async function pullMySeller(userId) {
  if (!canCloud(userId)) return null
  const client = await sb()
  if (!client) return null
  const { data } = await client.from('marketplace_sellers').select('*').eq('user_id', userId).maybeSingle()
  return mapSeller(data)
}

export async function applyAsSeller({ userId, kind, displayName, bio, payoutEmail }) {
  if (!canCloud(userId)) return { ok: false, error: 'Cloud account required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const row = {
    user_id: userId,
    kind: kind || 'creator',
    status: 'pending',
    display_name: String(displayName || '').trim().slice(0, 80),
    bio: String(bio || '').trim().slice(0, 500),
    payout_email: String(payoutEmail || '').trim().slice(0, 120),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
  const { error } = await client.from('marketplace_sellers').upsert(row)
  if (error) return { ok: false, error: error.message }
  return { ok: true, seller: mapSeller(row) }
}

export async function listSellerProducts(sellerId) {
  if (!isSupabaseConfigured() || !sellerId) return []
  const client = await sb()
  if (!client) return []
  const { data } = await client.from('marketplace_products').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
  return (data || []).map(mapProduct).filter(Boolean)
}

export async function upsertProduct(sellerId, product) {
  if (!canCloud(sellerId)) return { ok: false, error: 'Cloud account required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const id = product.id || `mp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const row = {
    id,
    seller_id: sellerId,
    title: String(product.title || '').trim().slice(0, 120),
    description: String(product.description || '').trim().slice(0, 2000),
    kind: product.kind === 'virtual' ? 'virtual' : 'physical',
    price_cents: Math.max(0, Math.floor(Number(product.priceCents) || 0)),
    shipping_cents: product.kind === 'virtual' ? 0 : Math.max(0, Math.floor(Number(product.shippingCents) || 0)),
    currency: 'usd',
    stock: product.stock == null ? null : Math.floor(Number(product.stock) || 0),
    image_url: product.imageUrl || null,
    active: product.active !== false,
    meta: product.meta || {},
    updated_at: new Date().toISOString(),
    created_at: product.createdAt || new Date().toISOString(),
  }
  if (!row.title || row.price_cents < 50) return { ok: false, error: 'Title and minimum $0.50 price required.' }
  const { error } = await client.from('marketplace_products').upsert(row)
  if (error) return { ok: false, error: error.message }
  await pullMarketplaceCatalog()
  return { ok: true, product: mapProduct(row) }
}

export async function pullOrdersForUser(userId) {
  if (!canCloud(userId)) return { ok: false, orders: cachedOrders().filter((o) => o.buyerId === userId || o.sellerId === userId) }
  const client = await sb()
  if (!client) return { ok: false, orders: [] }
  const { data, error } = await client
    .from('marketplace_orders')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { ok: false, orders: [], error: error.message }
  const rows = (data || []).map(mapOrder).filter(Boolean)
  const all = cachedOrders().filter((o) => o.buyerId !== userId && o.sellerId !== userId).concat(rows)
  lsSet(ORDERS_CACHE, all.slice(0, 400))
  return { ok: true, orders: rows }
}

export async function startMarketplaceCheckout({ buyer, product }) {
  if (!buyer?.id) return { ok: false, error: 'Sign in required.' }
  if (!canCloud(buyer.id)) return { ok: false, error: 'Cloud account required.' }
  if (!product?.id) return { ok: false, error: 'Product missing.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }

  const subtotal = Math.floor(Number(product.priceCents) || 0)
  const shipping = product.kind === 'virtual' ? 0 : Math.floor(Number(product.shippingCents) || 0)
  const fee = calcPlatformFeeCents(subtotal + shipping)
  const total = subtotal + shipping + fee
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const linkBase = getStripePaymentLink()
  const row = {
    id,
    buyer_id: buyer.id,
    seller_id: product.sellerId,
    product_id: product.id,
    product_title: product.title,
    kind: product.kind,
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    platform_fee_cents: fee,
    total_cents: total,
    status: 'pending_payment',
    stripe_payment_link: linkBase || null,
    meta: { buyerHandle: buyer.handle || '' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error } = await client.from('marketplace_orders').insert(row)
  if (error) return { ok: false, error: error.message }

  if (!linkBase) {
    return {
      ok: false,
      error: 'Stripe Payment Link is not configured (VITE_STRIPE_PAYMENT_LINK). Order saved as pending — set the link to charge cards.',
      order: mapOrder(row),
    }
  }
  const url = buildPaymentLink(linkBase, {
    email: buyer.email || '',
    reference: `marketplace:${id}:${total}`,
  })
  return { ok: true, url, order: mapOrder(row), totalCents: total, platformFeeCents: fee }
}

export async function markOrderPaid(orderId) {
  if (!canCloud()) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const { data: order } = await client.from('marketplace_orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return { ok: false, error: 'Order not found.' }
  const patch = {
    status: order.kind === 'virtual' ? 'released' : 'paid',
    updated_at: new Date().toISOString(),
  }
  if (order.kind === 'virtual') {
    patch.release_at = new Date().toISOString()
  }
  const { error } = await client.from('marketplace_orders').update(patch).eq('id', orderId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function submitTracking(orderId, sellerId, { trackingNumber, carrier }) {
  if (!canCloud(sellerId)) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const tn = String(trackingNumber || '').trim()
  if (!tn) return { ok: false, error: 'Tracking number required.' }
  const { error } = await client.from('marketplace_orders').update({
    tracking_number: tn,
    tracking_carrier: String(carrier || '').trim(),
    status: 'shipped',
    shipped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', orderId).eq('seller_id', sellerId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Mark delivered → funds release 7 days later; buyer dispute window 7 days. */
export async function markDelivered(orderId, actorId) {
  if (!canCloud(actorId)) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const deliveredAt = new Date()
  const releaseAt = new Date(deliveredAt.getTime() + 7 * 86400000)
  const disputeDeadline = new Date(deliveredAt.getTime() + 7 * 86400000)
  const { error } = await client.from('marketplace_orders').update({
    status: 'delivered',
    delivered_at: deliveredAt.toISOString(),
    release_at: releaseAt.toISOString(),
    dispute_deadline: disputeDeadline.toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', orderId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, releaseAt: releaseAt.toISOString(), disputeDeadline: disputeDeadline.toISOString() }
}

export async function releaseOrderFunds(orderId) {
  if (!canCloud()) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const { error } = await client.from('marketplace_orders').update({
    status: 'released',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function listPendingSellerApps() {
  if (!canCloud()) return []
  const client = await sb()
  if (!client) return []
  const { data } = await client.from('marketplace_sellers').select('*').eq('status', 'pending').order('created_at', { ascending: false })
  return (data || []).map(mapSeller).filter(Boolean)
}

export async function setSellerStatus(userId, status) {
  if (!canCloud()) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const { error } = await client.from('marketplace_sellers').update({
    status,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export function formatUsdFromCents(cents) {
  return (Math.max(0, Number(cents) || 0) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  })
}
