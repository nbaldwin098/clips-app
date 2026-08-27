/**
 * Creator financial engine.
 * - Memberships & tips: 80% creator / 20% platform of list price (see revenueSplit.js).
 * - Buyer platform fee (4%) is added on top — not taken from creator price.
 * Ads are not offered — no creator ad share.
 */

import { CREATOR_REV_SHARE, PLATFORM_REV_SHARE, splitRevenue } from './revenueSplit'
import { getCalabiCashBalance } from './calabiCash'
import { PLATFORM_FEE_RATE, calcPlatformFeeCents } from './platformFee'

export function buildCheckout(amount) {
  const n = Number(amount) || 0
  const listCents = Math.round(n * 100)
  const feeCents = calcPlatformFeeCents(listCents)
  const fee = feeCents / 100
  const totalCharged = n + fee
  const split = splitRevenue(n, CREATOR_REV_SHARE)
  return {
    creatorReceives: split.creator,
    platformKeeps: split.platform,
    buyerFee: Math.round(fee * 100) / 100,
    totalCharged: Math.round(totalCharged * 100) / 100,
    feeRate: PLATFORM_FEE_RATE,
    feeFixed: 0,
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
