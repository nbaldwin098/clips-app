/**
 * Creator financial engine.
 * - Memberships & Coins tips: 80% creator / 20% platform (see revenueSplit.js).
 * - Legacy USD tip checkout still uses buyer fee on top (Stripe-ready).
 * Ads are not offered — no creator ad share.
 */

import { CREATOR_REV_SHARE, PLATFORM_REV_SHARE, splitRevenue } from './revenueSplit'
import { getCalabiCashBalance } from './calabiCash'

const TRANSACTION_FEE_RATE = 0.029
const TRANSACTION_FEE_FIXED = 0.3

export function buildCheckout(amount) {
  const n = Number(amount) || 0
  const fee = n * TRANSACTION_FEE_RATE + TRANSACTION_FEE_FIXED
  const totalCharged = n + fee
  const split = splitRevenue(n, CREATOR_REV_SHARE)
  return {
    creatorReceives: split.creator,
    platformKeeps: split.platform,
    buyerFee: Math.round(fee * 100) / 100,
    totalCharged: Math.round(totalCharged * 100) / 100,
    feeRate: TRANSACTION_FEE_RATE,
    feeFixed: TRANSACTION_FEE_FIXED,
    creatorRate: CREATOR_REV_SHARE,
    platformRate: PLATFORM_REV_SHARE,
  }
}

export function getEmptyWalletSnapshot(userId) {
  return {
    activeSubscribers: 0,
    monthlySubscriptionRevenue: 0,
    pendingPayout: 0,
    lastPayoutAt: null,
    currency: 'usd',
    calabiCash: userId ? getCalabiCashBalance(userId) : 0,
    creatorRevShare: CREATOR_REV_SHARE,
  }
}

export { CREATOR_REV_SHARE, PLATFORM_REV_SHARE, splitRevenue }
