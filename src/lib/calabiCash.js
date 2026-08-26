/**
 * Calabi Cash — platform currency.
 * Core: 100 units = $1.00 USD (1 unit = $0.01).
 * Web purchase tiers keep ~97% of transaction revenue via Payment Link gateways.
 */

import { lsGet, lsSet } from './storage'

export const CALABI_CASH_PER_USD = 100
export const CALABI_CASH_UNIT_USD = 0.01

/** Structured web purchase tiers (units for USD). */
export const CALABI_CASH_TIERS = [
  { id: 't1', usd: 1, units: 100, bonusPct: 0, label: '100 Cash' },
  { id: 't3', usd: 3, units: 315, bonusPct: 5, label: '315 Cash' },
  { id: 't5', usd: 5, units: 550, bonusPct: 10, label: '550 Cash' },
  { id: 't10', usd: 10, units: 1150, bonusPct: 15, label: '1,150 Cash' },
  { id: 't50', usd: 50, units: 6000, bonusPct: 20, label: '6,000 Cash' },
]

/** One-time onboarding: 300 units for $1.00 */
export const CALABI_CASH_FIRST_BUY = {
  id: 'first',
  usd: 1,
  units: 300,
  bonusPct: 200,
  label: 'First-Time Buyer · 300 Cash',
  once: true,
}

const BALANCES = 'calabi_cash_balances'
const LEDGER = 'calabi_cash_ledger'
const FIRST = 'calabi_cash_first_buyers'

function balMap() {
  return lsGet(BALANCES, {}) || {}
}

function saveBal(map) {
  lsSet(BALANCES, map)
}

export function getCalabiCashBalance(userId) {
  if (!userId) return 0
  return Math.max(0, Math.floor(Number(balMap()[userId]) || 0))
}

export function hasUsedFirstBuy(userId) {
  if (!userId) return true
  return !!(lsGet(FIRST, {}) || {})[userId]
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

function pushLedger(row) {
  const all = lsGet(LEDGER, []) || []
  all.unshift({ ...row, at: row.at || new Date().toISOString() })
  lsSet(LEDGER, all.slice(0, 500))
}

export function listCashLedger(userId, limit = 50) {
  const all = lsGet(LEDGER, []) || []
  if (!userId) return all.slice(0, limit)
  return all.filter((r) => r.userId === userId).slice(0, limit)
}

/** Credit units after a paid purchase (or admin grant). */
export function creditCalabiCash(userId, units, meta = {}) {
  if (!userId) return { ok: false, error: 'Sign in first.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const map = balMap()
  map[userId] = getCalabiCashBalance(userId) + n
  saveBal(map)
  if (meta.tierId === CALABI_CASH_FIRST_BUY.id) {
    const first = lsGet(FIRST, {}) || {}
    first[userId] = new Date().toISOString()
    lsSet(FIRST, first)
  }
  pushLedger({
    userId,
    delta: n,
    balance: map[userId],
    kind: meta.kind || 'credit',
    note: meta.note || '',
    tierId: meta.tierId || '',
    usd: meta.usd || 0,
  })
  return { ok: true, balance: map[userId] }
}

/** Spend units (tips, viewer actions, challenge stakes). */
export function spendCalabiCash(userId, units, meta = {}) {
  if (!userId) return { ok: false, error: 'Sign in first.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const bal = getCalabiCashBalance(userId)
  if (bal < n) return { ok: false, error: 'Not enough Calabi Cash.' }
  const map = balMap()
  map[userId] = bal - n
  saveBal(map)
  pushLedger({
    userId,
    delta: -n,
    balance: map[userId],
    kind: meta.kind || 'spend',
    note: meta.note || '',
    targetId: meta.targetId || '',
  })
  return { ok: true, balance: map[userId] }
}

export function usdToCashUnits(usd) {
  return Math.round(Number(usd) * CALABI_CASH_PER_USD)
}

export function cashUnitsToUsd(units) {
  return Math.round(Number(units) * CALABI_CASH_UNIT_USD * 100) / 100
}

/** Creator share of Cash tips after platform cut (default 80%). */
export function creatorCashShare(units, creatorRate = 0.8) {
  const n = Math.floor(Number(units) || 0)
  const creator = Math.floor(n * creatorRate)
  return { creator, platform: n - creator }
}
