/**
 * Stripe configuration — keys from environment only.
 * Never commit secret keys. Publishable key is safe for client.
 *
 * Render / Vite:
 *   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
 * Secret key stays on server only (future Edge Function):
 *   STRIPE_SECRET_KEY=sk_...
 */

export function getStripePublishableKey() {
  try {
    return import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || ''
  } catch {
    return ''
  }
}

export function isStripeConfigured() {
  const k = getStripePublishableKey()
  return typeof k === 'string' && k.startsWith('pk_')
}

export function stripeMode() {
  const k = getStripePublishableKey()
  if (!k) return 'unconfigured'
  if (k.startsWith('pk_test')) return 'test'
  if (k.startsWith('pk_live')) return 'live'
  return 'unknown'
}

export const STRIPE_PRODUCT_NOTES = {
  model: 'Creator receives 100% of list price. Buyer pays list + fee on top.',
  connect: 'Stripe Connect Express for creator payouts (Phase 4).',
  feeRate: 0.029,
  feeFixed: 0.3,
}
