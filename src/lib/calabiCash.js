/**
 * Coins wallet (chat cosmetics) + Stripe tips/TTS for creator-set features.
 * Calabi Cash removed — packs buy Coins only.
 * Cloud wallets are source of truth via economySync.
 */
import { lsGet } from './storage'
import { getGraphActor } from './graphSync'
import { isSupabaseConfigured } from './supabaseClient'
import {
  cachedCoins,
  cachedEarnings,
  cacheCoins,
  cloudCreditCoins,
  cloudSpendCoins,
  cloudCreditEarnings,
  cloudSaveWithdrawMethod,
  cloudRemoveWithdrawMethod,
  cloudRequestWithdrawal,
  pullWallet,
  pullEarnings,
} from './economySync'

/** Coin packs (USD → coins). No Cash. */
export const COIN_PACKS = [
  { id: 'c100', usd: 0.99, coins: 100, label: '100 Coins', stack: 1 },
  { id: 'c550', usd: 4.49, coins: 550, label: '550 Coins', stack: 2, badge: 'Popular' },
  { id: 'c1350', usd: 9.99, coins: 1350, label: '1,350 Coins', stack: 3 },
  { id: 'c3250', usd: 19.99, coins: 3250, label: '3,250 Coins', stack: 4 },
  { id: 'c10000', usd: 49.99, coins: 10000, label: '10,000 Coins', stack: 5, badge: 'Best value' },
]

/** @deprecated use COIN_PACKS — kept so old checkout kinds don't crash */
export const CALABI_CASH_TIERS = COIN_PACKS.map((p) => ({
  id: p.id,
  usd: p.usd,
  units: 0,
  coins: p.coins,
  label: p.label,
  stack: p.stack,
  badge: p.badge,
}))
export const CALABI_CASH_FIRST_BUY = null
export const CALABI_CASH_PACKS = COIN_PACKS.map((p) => ({
  id: p.id,
  cash: 0,
  coins: p.coins,
  priceUsd: p.usd,
  label: p.label,
  stack: p.stack,
  badge: p.badge,
  units: 0,
}))
export const CALABI_CASH_PER_USD = 100
export const CALABI_CASH_UNIT_USD = 0.01

function cloudReady(userId) {
  const actor = getGraphActor()
  return !!(isSupabaseConfigured() && actor?.id && userId && actor.id === userId)
}

/** Cash balance retired — always 0 for display. */
export function getCalabiCashBalance() {
  return 0
}
export function getCashBalance() {
  return 0
}

export function getCoinBalance(userId) {
  return cachedCoins(userId)
}

export function hasUsedFirstBuy() {
  return true
}

export function listCashTiersForUser() {
  return [...COIN_PACKS]
}

export function listCoinPacks() {
  return [...COIN_PACKS]
}

export function getTierById(id) {
  return COIN_PACKS.find((p) => p.id === id) || null
}

export function listCashLedger() {
  return []
}

export function formatCash() {
  return '0.00'
}

export function formatCashDollars() {
  return '$0.00'
}

export function cashUnitsToUsd() {
  return 0
}

export function usdToCashUnits(usd) {
  return Math.round(Number(usd) * 100) || 0
}

export function creditCalabiCash(userId, units, meta = {}) {
  // Legacy Cash callers → Coins (1:1) so tips/pools keep working after Cash removal.
  return creditCoins(userId, units, { ...meta, migratedFrom: 'cash' })
}

export function spendCalabiCash(userId, units, meta = {}) {
  return spendCoins(userId, units, { ...meta, migratedFrom: 'cash' })
}

export function creatorCashShare(units, creatorRate = 0.8) {
  const n = Math.floor(Number(units) || 0)
  const creator = Math.floor(n * creatorRate)
  return { creator, platform: n - creator }
}

export function spendCoins(userId, amount, meta = {}) {
  const n = Math.floor(Number(amount) || 0)
  if (!userId || n < 1) return { ok: false, error: 'Invalid amount' }
  if (!cloudReady(userId)) return { ok: false, error: 'Cloud wallet required' }
  const bal = getCoinBalance(userId)
  if (bal < n) return { ok: false, error: 'Insufficient Coins', balance: bal }
  cacheCoins(userId, bal - n)
  ;(async () => {
    const res = await cloudSpendCoins(userId, n, meta)
    if (!res?.ok) cacheCoins(userId, bal)
  })()
  return { ok: true, balance: bal - n }
}

export function creditCoins(userId, amount, meta = {}) {
  const n = Math.floor(Number(amount) || 0)
  if (!userId || n < 1) return { ok: false }
  if (!cloudReady(userId)) return { ok: false, error: 'Cloud wallet required' }
  const bal = getCoinBalance(userId)
  cacheCoins(userId, bal + n)
  ;(async () => {
    await cloudCreditCoins(userId, n, meta)
  })()
  return { ok: true, balance: bal + n }
}

/** Buy a coin pack after Stripe return — credits coins only. */
export async function purchaseCoinPack(userId, tierId) {
  const pack = getTierById(tierId)
  if (!pack || !userId) return { ok: false, error: 'Invalid pack' }
  if (!cloudReady(userId)) return { ok: false, error: 'Sign in with cloud account' }
  const res = await cloudCreditCoins(userId, pack.coins, { kind: 'pack', tierId: pack.id, usd: pack.usd })
  if (!res?.ok) return { ok: false, error: res?.error || 'Could not credit coins' }
  await pullWallet(userId)
  return { ok: true, addedCoins: pack.coins, pack }
}

/** @deprecated */
export async function purchaseCashPack(userId, tierId) {
  return purchaseCoinPack(userId, tierId)
}

export async function refreshWalletFromCloud(userId) {
  if (!userId) return
  await pullWallet(userId)
}

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

export async function refreshEarningsFromCloud(creatorId) {
  if (!creatorId) return
  await pullEarnings(creatorId)
}

export const COIN_REDEEMS = [
  { id: 'chat_bigger', coins: 75, label: 'Bigger chat message' },
  { id: 'emote_slot', coins: 100, label: 'Creator custom emoji' },
  { id: 'gif_slot', coins: 150, label: 'Creator custom GIF' },
  { id: 'highlight', coins: 200, label: 'Highlight my chat message' },
  { id: 'raid_cheer', coins: 500, label: 'Raid cheer burst' },
]
