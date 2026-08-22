/**
 * Creator financial engine.
 * - Ad revenue: 90% to creators by impression share, 10% platform.
 * - Subscriptions & tips: 100% of listed price to creator.
 * - Transaction fee charged on top to the buyer.
 */

const PLATFORM_AD_SHARE = 0.10
const CREATOR_AD_SHARE = 0.90
const TRANSACTION_FEE_RATE = 0.029
const TRANSACTION_FEE_FIXED = 0.30

/**
 * Calculate monthly ad revenue distribution.
 */
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

/**
 * Build a checkout line that protects creator earnings.
 * Buyer pays listed price + transparent fee.
 */
export function buildCheckout(amount) {
  const fee = amount * TRANSACTION_FEE_RATE + TRANSACTION_FEE_FIXED
  const totalCharged = amount + fee
  return {
    creatorReceives: amount,
    buyerFee: Math.round(fee * 100) / 100,
    totalCharged: Math.round(totalCharged * 100) / 100,
  }
}

/**
 * Example monthly snapshot for demonstration.
 */
export function getDemoWalletSnapshot(creatorId) {
  const totalPlatformPool = 125000
  const totalImpressions = 48000000
  const creatorImpressions = {
    mkbhd: 8200000,
    shroud: 6100000,
    tarik: 3400000,
    ludwig: 5100000,
    theprimeagen: 980000,
    gmhikaru: 2200000,
    valorantesports: 4500000,
  }[creatorId] || 500000

  const ad = calculateAdRevenueSplit(totalPlatformPool, creatorImpressions, totalImpressions)

  return {
    adImpressions: creatorImpressions,
    estimatedAdRevenue: ad.creatorAmount,
    activeSubscribers: Math.floor(creatorImpressions / 12000),
    monthlySubscriptionRevenue: Math.floor(creatorImpressions / 12000) * 4.99,
    pendingPayout: ad.creatorAmount + Math.floor(creatorImpressions / 12000) * 4.99 * 0.85,
    lastPayoutAt: '2026-07-28T00:00:00Z',
  }
}
