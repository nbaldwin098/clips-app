/**
 * Creator financial engine.
 * - Subscriptions & tips: 100% of listed price to creator.
 * - Transaction fee charged on top to the buyer (Stripe-ready).
 * Site ads are platform revenue. There is no creator ad share, so no ad
 * revenue is computed or shown to creators.
 */

const TRANSACTION_FEE_RATE = 0.029
const TRANSACTION_FEE_FIXED = 0.3

export function buildCheckout(amount) {
  const n = Number(amount) || 0
  const fee = n * TRANSACTION_FEE_RATE + TRANSACTION_FEE_FIXED
  const totalCharged = n + fee
  return {
    creatorReceives: Math.round(n * 100) / 100,
    buyerFee: Math.round(fee * 100) / 100,
    totalCharged: Math.round(totalCharged * 100) / 100,
    feeRate: TRANSACTION_FEE_RATE,
    feeFixed: TRANSACTION_FEE_FIXED,
  }
}

export function getEmptyWalletSnapshot() {
  return {
    activeSubscribers: 0,
    monthlySubscriptionRevenue: 0,
    pendingPayout: 0,
    lastPayoutAt: null,
    currency: 'usd',
  }
}
