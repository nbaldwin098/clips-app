/**
 * Membership checkout gate. Live site: never grant premium without a charge.
 */
import { isStripeConfigured, stripeMode } from './stripeConfig'

export function checkoutCanCharge() {
  return isStripeConfigured()
}

export function startPremiumCheckout({ already = false } = {}) {
  if (already) {
    return { granted: false, status: 'already', message: 'You already have premium on this channel.' }
  }
  if (!isStripeConfigured()) {
    return {
      granted: false,
      status: 'no_stripe',
      message: 'Stripe is not connected. Cards cannot be charged. Set VITE_STRIPE_PUBLISHABLE_KEY and a server PaymentIntent before taking money.',
    }
  }
  return {
    granted: false,
    status: 'needs_intent',
    message: `Stripe publishable key is set (${stripeMode()}), but a server PaymentIntent is not connected. Premium is not granted until a real charge succeeds.`,
  }
}
