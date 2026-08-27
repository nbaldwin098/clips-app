/**
 * Stripe — publishable key from Render only.
 * Name must be exactly VITE_STRIPE_PUBLISHABLE_KEY (Vite ignores vars without VITE_).
 * Secret keys never belong in VITE_*.
 */
import { runtimeEnv } from './runtimeEnv'

function env(key) {
  return runtimeEnv(key)
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
  model: 'List price at checkout. Payouts require Stripe Connect (not live).',
  connect: 'Stripe Connect Express for creator payouts (Phase 4).',
  feeRate: 0.029,
  feeFixed: 0.3,
  renderKey: 'VITE_STRIPE_PUBLISHABLE_KEY',
  renderLink: 'VITE_STRIPE_PAYMENT_LINK',
  cashLinks: 'Optional per-pack links: VITE_STRIPE_CASH_LINK_T1/T3/T5/T10/T50/FIRST',
}

/** Per-tier Coins Payment Links (fallback: generic VITE_STRIPE_PAYMENT_LINK). */
export function getCalabiCashPaymentLink(tierId) {
  const map = {
    first: 'VITE_STRIPE_CASH_LINK_FIRST',
    t1: 'VITE_STRIPE_CASH_LINK_T1',
    t3: 'VITE_STRIPE_CASH_LINK_T3',
    t5: 'VITE_STRIPE_CASH_LINK_T5',
    t10: 'VITE_STRIPE_CASH_LINK_T10',
    t50: 'VITE_STRIPE_CASH_LINK_T50',
  }
  const key = map[tierId]
  const raw = key ? env(key) : ''
  if (raw) {
    try {
      const u = new URL(raw)
      if (u.protocol === 'https:' && (u.hostname === 'buy.stripe.com' || u.hostname.endsWith('.stripe.com'))) {
        return u.toString()
      }
    } catch {}
  }
  return getStripePaymentLink()
}
