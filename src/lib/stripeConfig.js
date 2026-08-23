/**
 * Stripe — publishable key from Render only.
 * Name must be exactly VITE_STRIPE_PUBLISHABLE_KEY (Vite ignores vars without VITE_).
 * Secret keys never belong in VITE_*.
 */

function env(key) {
  try {
    return String(import.meta.env?.[key] || '').trim()
  } catch {
    return ''
  }
}

export function getStripePublishableKey() {
  const k = env('VITE_STRIPE_PUBLISHABLE_KEY')
  return k.startsWith('pk_') ? k : ''
}

export function isStripeConfigured() {
  return !!getStripePublishableKey()
}

export function stripeMode() {
  const k = getStripePublishableKey()
  if (!k) return 'unconfigured'
  if (k.startsWith('pk_test')) return 'test'
  if (k.startsWith('pk_live')) return 'live'
  return 'unknown'
}

/** Hosted Payment Link from Stripe Dashboard. Optional. */
export function getStripePaymentLink() {
  const raw = env('VITE_STRIPE_PAYMENT_LINK')
  if (!raw) return ''
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return ''
    const host = u.hostname.toLowerCase()
    if (host === 'buy.stripe.com' || host === 'checkout.stripe.com' || host.endsWith('.stripe.com')) {
      return u.toString()
    }
  } catch {}
  return ''
}

export function membershipReturnPaid(params = {}, search = '') {
  const q = new URLSearchParams(search || '')
  const paid = String(params.paid || q.get('paid') || params.checkout || q.get('checkout') || '')
  const session = params.session_id || q.get('session_id')
  return paid === '1' || paid === 'success' || !!session
}

export function buildPaymentLink(base, { email, reference } = {}) {
  if (!base) return ''
  try {
    const u = new URL(base)
    if (email) u.searchParams.set('prefilled_email', email)
    if (reference) u.searchParams.set('client_reference_id', String(reference).slice(0, 200))
    return u.toString()
  } catch {
    return base
  }
}

let stripePromise = null
export async function loadStripeJs() {
  const pk = getStripePublishableKey()
  if (!pk || typeof window === 'undefined') return { ok: false, stripe: null, error: 'no_key' }
  if (window.Stripe) {
    try {
      return { ok: true, stripe: window.Stripe(pk), error: null }
    } catch (err) {
      return { ok: false, stripe: null, error: err?.message || 'bad_key' }
    }
  }
  if (!stripePromise) {
    stripePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://js.stripe.com/v3/'
      s.async = true
      s.onload = () => resolve(true)
      s.onerror = () => reject(new Error('stripe_js'))
      document.head.appendChild(s)
    })
  }
  try {
    await stripePromise
    return { ok: true, stripe: window.Stripe(pk), error: null }
  } catch (err) {
    return { ok: false, stripe: null, error: err?.message || 'stripe_js' }
  }
}

export const STRIPE_PRODUCT_NOTES = {
  model: 'Creator receives 100% of list price. Buyer pays list + fee on top.',
  connect: 'Stripe Connect Express for creator payouts (Phase 4).',
  feeRate: 0.029,
  feeFixed: 0.3,
  renderKey: 'VITE_STRIPE_PUBLISHABLE_KEY',
  renderLink: 'VITE_STRIPE_PAYMENT_LINK',
}
