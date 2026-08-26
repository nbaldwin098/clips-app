/**
 * Calabi Cash + Gold Coins.
 * Cloud (Supabase wallets) is source of truth via economySync.
 * Cache is display-only after pull/push — never invent balances offline.
 */

import { lsGet } from './storage'
import { getGraphActor } from './graphSync'
import { isSupabaseConfigured } from './supabaseClient'
import {
  cachedCash,
  cachedCoins,
  cachedEarnings,
  cacheCash,
  cacheCoins,
  cloudCreditCash,
  cloudSpendCash,
  cloudCreditCoins,
  cloudSpendCoins,
  cloudCreditEarnings,
  cloudSaveWithdrawMethod,
  cloudRemoveWithdrawMethod,
  cloudRequestWithdrawal,
  pullWallet,
  pullEarnings,
} from './economySync'

export const CALABI_CASH_PER_USD = 100
export const CALABI_CASH_UNIT_USD = 0.01

/** Fliff-style packs: Cash display + Gold Coin bonus */
export const CALABI_CASH_TIERS = [
  { id: 't1', usd: 1.99, units: 400, bonusPct: 0, label: 'Up to 4.00 Cash', coins: 40, stack: 1 },
  { id: 't3', usd: 4.99, units: 1000, bonusPct: 0, label: 'Up to 10.00 Cash', coins: 120, stack: 2 },
  { id: 't5', usd: 9.99, units: 2000, bonusPct: 0, label: 'Up to 20.00 Cash', coins: 280, stack: 3 },
  { id: 't10', usd: 19.99, units: 4000, bonusPct: 5, label: 'Up to 40.00 Cash', coins: 600, stack: 4, badge: 'Popular' },
  { id: 't50', usd: 49.99, units: 10000, bonusPct: 10, label: 'Up to 100.00 Cash', coins: 1600, stack: 5, badge: 'Best value' },
]

export const CALABI_CASH_FIRST_BUY = {
  id: 'first',
  usd: 1,
  units: 300,
  bonusPct: 200,
  label: 'First-Time · 3.00 Cash',
  coins: 50,
  stack: 1,
  once: true,
}

export const CALABI_CASH_PACKS = CALABI_CASH_TIERS.map((t) => ({
  id: t.id,
  cash: t.units / 100,
  coins: t.coins || 0,
  priceUsd: t.usd,
  label: t.label,
  stack: t.stack || 1,
  badge: t.badge,
  units: t.units,
}))

function cloudReady(userId) {
  const actor = getGraphActor()
  return !!(isSupabaseConfigured() && actor?.id && userId && actor.id === userId)
}

export function getCalabiCashBalance(userId) {
  return cachedCash(userId)
}

export function getCashBalance(userId) {
  return getCalabiCashBalance(userId)
}

export function getCoinBalance(userId) {
  return cachedCoins(userId)
}

export function hasUsedFirstBuy(userId) {
  if (!userId) return true
  return !!(lsGet('calabi_cash_first_buyers', {}) || {})[userId]
}

export function listCashTiersForUser(userId) {
  const tiers = [...CALABI_CASH_TIERS]
  if (userId && !hasUsedFirstBuy(userId)) tiers.unshift(CALABI_CASH_FIRST_BUY)
  return tiers
}

export function getTierById(id) {
  if (id === CALABI_CASH_FIRST_BUY.id) return CALABI_CASH_FIRST_BUY
  return CALABI_CASH_TIERS.find((t) => t.id === id) || null
}

export function listCashLedger(userId, limit = 50) {
  const all = lsGet('calabi_cash_ledger', []) || []
  if (!userId) return all.slice(0, limit)
  return all.filter((r) => r.userId === userId).slice(0, limit)
}

export function listCoinLedger(userId, limit = 50) {
  const all = lsGet('calabi_coin_ledger', []) || []
  if (!userId) return all.slice(0, limit)
  return all.filter((r) => r.userId === userId).slice(0, limit)
}

export function refreshWalletFromCloud(userId) {
  return pullWallet(userId)
}

export function refreshEarningsFromCloud(creatorId) {
  return pullEarnings(creatorId)
}

/**
 * Credit Cash on cloud. Sync shape for callers; work is async on Supabase.
 * Fails closed if not a cloud-signed-in user.
 */
export function creditCalabiCash(userId, units, meta = {}) {
  if (!userId) return { ok: false, error: 'Sign in first.' }
  if (!cloudReady(userId)) return { ok: false, error: 'Cloud account required.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const optimistic = getCalabiCashBalance(userId) + n
  cacheCash(userId, optimistic)
  ;(async () => {
    const res = await cloudCreditCash(userId, n, meta)
    if (!res.ok) {
      cacheCash(userId, Math.max(0, getCalabiCashBalance(userId) - n))
      return
    }
    const coins = Math.floor(Number(meta.coins) || 0)
    if (coins > 0) await cloudCreditCoins(userId, coins, { kind: 'pack_bonus', note: meta.tierId || '' })
    if (meta.usd > 0 && meta.creatorId) {
      await cloudCreditEarnings(meta.creatorId, Number(meta.usd) * 0.7, { kind: 'cash_pack', packId: meta.tierId })
    }
  })()
  return { ok: true, balance: optimistic, pendingCloud: true }
}

export function spendCalabiCash(userId, units, meta = {}) {
  if (!userId) return { ok: false, error: 'Sign in first.' }
  if (!cloudReady(userId)) return { ok: false, error: 'Cloud account required.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const bal = getCalabiCashBalance(userId)
  if (bal < n) return { ok: false, error: 'Not enough Calabi Cash.', balance: bal }
  cacheCash(userId, bal - n)
  ;(async () => {
    const res = await cloudSpendCash(userId, n, meta)
    if (!res.ok) cacheCash(userId, bal)
  })()
  return { ok: true, balance: bal - n, pendingCloud: true }
}

export function creditCoins(userId, amount, meta = {}) {
  if (!cloudReady(userId)) return 0
  const add = Math.floor(Number(amount) || 0)
  if (add <= 0) return getCoinBalance(userId)
  const next = getCoinBalance(userId) + add
  cacheCoins(userId, next)
  ;(async () => {
    const res = await cloudCreditCoins(userId, add, meta)
    if (!res.ok) cacheCoins(userId, Math.max(0, next - add))
  })()
  return next
}

export function spendCoins(userId, amount, meta = {}) {
  if (!cloudReady(userId)) return { ok: false, error: 'Cloud account required.', balance: 0 }
  const sub = Math.floor(Number(amount) || 0)
  if (sub <= 0) return { ok: false, balance: getCoinBalance(userId), error: 'Invalid amount' }
  const bal = getCoinBalance(userId)
  if (bal < sub) return { ok: false, balance: bal, error: 'Insufficient Gold Coins' }
  cacheCoins(userId, bal - sub)
  ;(async () => {
    const res = await cloudSpendCoins(userId, sub, meta)
    if (!res.ok) cacheCoins(userId, bal)
  })()
  return { ok: true, balance: bal - sub, pendingCloud: true }
}

/** Awaitable pack purchase — Cash + Gold Coins on cloud. */
export async function purchaseCashPack(userId, packId) {
  if (!userId) return { ok: false, error: 'Sign in first.' }
  if (!cloudReady(userId)) return { ok: false, error: 'Cloud account required. Sign in with your calabi account.' }
  const tier = getTierById(packId)
  if (!tier) return { ok: false, error: 'Unknown pack' }
  const cashRes = await cloudCreditCash(userId, tier.units, {
    kind: 'pack_purchase',
    tierId: tier.id,
    usd: tier.usd,
    note: tier.label,
  })
  if (!cashRes.ok) return cashRes
  let coins = getCoinBalance(userId)
  if (tier.coins > 0) {
    const c = await cloudCreditCoins(userId, tier.coins, { kind: 'pack_bonus', note: tier.id })
    if (c.ok) coins = c.balance
  }
  return {
    ok: true,
    cash: cashRes.balance,
    coins,
    addedCash: tier.units,
    addedCoins: tier.coins || 0,
    pack: tier,
  }
}

export async function purchaseCashTier(userId, tierId) {
  return purchaseCashPack(userId, tierId)
}

export function usdToCashUnits(usd) {
  return Math.round(Number(usd) * CALABI_CASH_PER_USD)
}

export function cashUnitsToUsd(units) {
  return Math.round(Number(units) * CALABI_CASH_UNIT_USD * 100) / 100
}

export function formatCash(units) {
  return cashUnitsToUsd(units).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCashDollars(units) {
  return cashUnitsToUsd(units).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export function creatorCashShare(units, creatorRate = 0.8) {
  const n = Math.floor(Number(units) || 0)
  const creator = Math.floor(n * creatorRate)
  return { creator, platform: n - creator }
}

/* ——— Creator earnings (cloud) ——— */

export function getCreatorEarnings(creatorId) {
  return cachedEarnings(creatorId)
}

export function creditCreatorSale(usd, meta = {}) {
  const creatorId = meta.creatorId
  if (!creatorId || !cloudReady(creatorId)) return null
  ;(async () => { await cloudCreditEarnings(creatorId, usd, meta) })()
  return cachedEarnings(creatorId)
}

export function creditCreatorEarnings(creatorId, usd, meta = {}) {
  return creditCreatorSale(usd, { ...meta, creatorId })
}

export function earningsSeriesByDay(creatorId, days = 30) {
  const e = getCreatorEarnings(creatorId)
  const map = new Map((e.daily || []).map((r) => [r.day, Number(r.usd) || 0]))
  const out = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ day: key, usd: map.get(key) || 0 })
  }
  return out
}

export function listWithdrawMethods(creatorId) {
  const all = lsGet('calabi.withdraw.methods.v1', {}) || {}
  const rows = creatorId ? all[creatorId] : []
  return Array.isArray(rows) ? rows : []
}

export async function saveWithdrawMethod(creatorId, method) {
  return cloudSaveWithdrawMethod(creatorId, method)
}

export async function removeWithdrawMethod(creatorId, id) {
  return cloudRemoveWithdrawMethod(creatorId, id)
}

export function listWithdrawRequests(creatorId, limit = 30) {
  const all = lsGet('calabi.withdraw.requests.v1', {}) || {}
  const rows = creatorId ? all[creatorId] : []
  return Array.isArray(rows) ? rows.slice(0, limit) : []
}

export async function requestWithdrawal(creatorId, amountUsd, methodId) {
  return cloudRequestWithdrawal(creatorId, amountUsd, methodId)
}

export const COIN_REDEEMS = [
  { id: 'emote_slot', coins: 50, label: 'Channel emote reaction' },
  { id: 'highlight', coins: 200, label: 'Highlight my chat message' },
  { id: 'raid_cheer', coins: 500, label: 'Raid cheer burst' },
  { id: 'vip_day', coins: 2000, label: '1-day VIP badge' },
]
