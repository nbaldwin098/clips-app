/**
 * Membership / tip / pack checkout.
 * Own Stripe Checkout Session via Edge Function (STRIPE_SECRET_KEY).
 * Payment Links are not required.
 */
import { isStripeConfigured } from './stripeConfig'
import { createCheckoutSession, checkoutCanCharge as edgeCanCharge } from './stripeCheckout'

export function checkoutCanCharge() {
  return edgeCanCharge() || isStripeConfigured()
}

/**
 * Start card checkout. Prefer amountCents + kind from the caller.
 * Legacy callers may only pass email/reference — those need amountCents to charge.
 */
export async function startPremiumCheckout({
  already = false,
  email = '',
  reference = '',
  amountCents = 0,
  kind = 'premium',
  productName = '',
  creatorId = '',
  contentId = '',
  tierId = '',
  orderId = '',
} = {}) {
  if (already) {
    return { granted: false, status: 'already', message: 'You already have premium on this channel.', url: '' }
  }

  const cents = Math.round(Number(amountCents) || 0)
  if (cents < 100) {
    return {
      granted: false,
      status: 'bad_amount',
      url: '',
      message: 'Checkout needs a price of at least $1.00.',
    }
  }

  const result = await createCheckoutSession({
    kind,
    amountCents: cents,
    productName: productName || (kind === 'premium' ? 'Channel premium · calabi' : ''),
    email,
    creatorId,
    contentId,
    tierId,
    orderId,
    reference,
  })

  return {
    granted: false,
    status: result.status,
    url: result.url || '',
    message: result.message,
    sessionId: result.sessionId || '',
  }
}
