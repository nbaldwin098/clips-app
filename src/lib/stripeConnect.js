/**
 * Stripe Connect Express — DISABLED.
 * calabi uses own Creator Studio → Earnings dashboard + admin withdraw queue.
 * Buyers still pay via platform Stripe Checkout (OWN_CHECKOUT.md).
 * See docs/OWN_PAYOUTS.md.
 */

export function connectOnboardingAvailable() {
  return false
}

export async function startConnectOnboarding() {
  return {
    ok: false,
    url: '',
    message: 'Stripe Express is off. Use Creator Studio → Earnings to save a payout method and request a withdrawal.',
    status: 'disabled',
  }
}

export async function fetchConnectStatus() {
  return {
    ok: false,
    status: 'disabled',
    message: 'Stripe Express is off — calabi owns payouts.',
    accountId: '',
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  }
}

export function connectStatusLabel() {
  return 'calabi payouts (no Stripe Express)'
}
