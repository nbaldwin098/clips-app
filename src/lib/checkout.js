/**
 * Membership checkout. Publishable key is expected on Render.
 * A Payment Link (or a server PaymentIntent) is what actually charges a card.
 */
import {
  isStripeConfigured, getStripePaymentLink, buildPaymentLink, loadStripeJs,
} from './stripeConfig'

export function checkoutCanCharge() {
  return !!getStripePaymentLink()
}

export async function startPremiumCheckout({ already = false, email = '', reference = '' } = {}) {
  if (already) {
    return { granted: false, status: 'already', message: 'You already have premium on this channel.', url: '' }
  }

  const link = getStripePaymentLink()
  if (link) {
    const url = buildPaymentLink(link, { email, reference })
    return {
      granted: false,
      status: 'redirect',
      url,
      message: 'Opening Stripe Checkout…',
    }
  }

  if (isStripeConfigured()) {
    const loaded = await loadStripeJs()
    return {
      granted: false,
      status: loaded.ok ? 'key_ready' : 'key_bad',
      url: '',
      message: loaded.ok
        ? 'Card checkout is not fully set up yet. You will not be charged until it is.'
        : 'Card checkout could not start. Try again later.',
    }
  }

  return {
    granted: false,
    status: 'no_key_in_build',
    url: '',
    message: 'Card checkout is not set up on this site yet.',
  }
}
