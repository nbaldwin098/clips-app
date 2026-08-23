/**
 * Membership checkout. Publishable key is expected on Render.
 * A Payment Link (or a server PaymentIntent) is what actually charges a card.
 */
import {
  isStripeConfigured, stripeMode, getStripePaymentLink, buildPaymentLink, loadStripeJs,
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
        ? `Stripe ${stripeMode()} key is live on this deploy. Add a $5/mo Payment Link as VITE_STRIPE_PAYMENT_LINK on Render, set the success URL to https://calabi.us/#/checkout?paid=1, then redeploy. Cards charge on Stripe’s page.`
        : 'The publishable key on this deploy did not load Stripe.js. Check it is pk_live_ or pk_test_ and named VITE_STRIPE_PUBLISHABLE_KEY.',
    }
  }

  return {
    granted: false,
    status: 'no_key_in_build',
    url: '',
    message: 'This build did not receive a publishable key. On Render the name must be exactly VITE_STRIPE_PUBLISHABLE_KEY, then Manual Deploy so Vite bakes it in.',
  }
}
