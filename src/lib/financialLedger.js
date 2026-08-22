/**
 * Creator financial engine.
 * - Ad revenue: 90% to creators by impression share, 10% platform.
 * - Subscriptions & tips: 100% of listed price to creator.
 * - Transaction fee charged on top to the buyer (Stripe-ready).
 */

const PLATFORM_AD_SHARE = 0.1
const CREATOR_AD_SHARE = 0.9
const TRANSACTION_FEE_RATE = 0.029
const TRANSACTION_FEE_FIXED = 0.3

export function calculateAdRevenueSplit(totalPool, creatorImpressions, totalImpressions) {
  const platformCut = totalPool * PLATFORM_AD_SHARE
  const creatorPool = totalPool * CREATOR_AD_SHARE
  const share = totalImpressions > 0 ? creatorImpressions / totalImpressions : 0
  const creatorAmount = creatorPool * share

  return {
    totalPool,
    platformCut,
    creatorPool,
    creatorSharePct: share * 100,
    creatorAmount,
  }
}

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
    adImpressions: 0,
    estimatedAdRevenue: 0,
    activeSubscribers: 0,
    monthlySubscriptionRevenue: 0,
    pendingPayout: 0,
    lastPayoutAt: null,
    currency: 'usd',
  }
}
