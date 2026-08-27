/**
 * Reward coins ledger per user.
 * Cashback accrues at 5% of USD spent:
 *   coins = Math.floor(usd * 100 * 0.05)
 * Key: calabi_rewards_${userId} → { balance, entries: [{ id, at, coins, note, usd? }] }
 */
import { lsGet, lsSet } from './storage'

const CASHBACK_RATE = 0.05

function rewardsKey(userId) {
  return `calabi_rewards_${userId}`
}

function emptyLedger() {
  return { balance: 0, entries: [] }
}

export function getRewardsLedger(userId) {
  if (!userId) return emptyLedger()
  const raw = lsGet(rewardsKey(userId), null)
  if (!raw || typeof raw !== 'object') return emptyLedger()
  return {
    balance: Math.max(0, Math.floor(Number(raw.balance) || 0)),
    entries: Array.isArray(raw.entries) ? raw.entries : [],
  }
}

/** Record 5% cashback for a purchase. usd = list dollars spent. */
export function accruePurchaseCashback(userId, usd, note = 'Purchase cashback') {
  if (!userId) return emptyLedger()
  const amount = Number(usd) || 0
  const coins = Math.floor(amount * 100 * CASHBACK_RATE)
  if (coins <= 0) return getRewardsLedger(userId)
  const ledger = getRewardsLedger(userId)
  const entry = {
    id: `rw_${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    coins,
    usd: amount,
    note,
  }
  const next = {
    balance: ledger.balance + coins,
    entries: [entry, ...ledger.entries].slice(0, 200),
  }
  lsSet(rewardsKey(userId), next)
  return next
}
