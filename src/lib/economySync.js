/**
 * Cloud economy — Calabi Cash, Gold Coins, creator earnings.
 * Supabase is source of truth. Local cache is display-only after a successful pull/push.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { getGraphActor } from './graphSync'

const CACHE_WALLETS = 'calabi_cash_balances'
const CACHE_COINS = 'calabi_coin_balances'
const CACHE_LEDGER = 'calabi_cash_ledger'
const CACHE_COIN_LEDGER = 'calabi_coin_ledger'
const CACHE_FIRST = 'calabi_cash_first_buyers'
const CACHE_EARN = 'calabi.creator.earnings.v1'
const CACHE_WM = 'calabi.withdraw.methods.v1'
const CACHE_WR = 'calabi.withdraw.requests.v1'

function canCloud(userId) {
  const actor = getGraphActor()
  return !!(isSupabaseConfigured() && actor?.id && userId && actor.id === userId)
}

async function sb() {
  if (!isSupabaseConfigured()) return null
  try {
    return await getSupabase()
  } catch {
    return null
  }
}

export function cacheCash(userId, units) {
  const map = lsGet(CACHE_WALLETS, {}) || {}
  map[userId] = Math.max(0, Math.floor(Number(units) || 0))
  lsSet(CACHE_WALLETS, map)
}

export function cacheCoins(userId, units) {
  const map = lsGet(CACHE_COINS, {}) || {}
  map[userId] = Math.max(0, Math.floor(Number(units) || 0))
  lsSet(CACHE_COINS, map)
}

function pushLocalLedger(row) {
  const all = lsGet(CACHE_LEDGER, []) || []
  all.unshift({ ...row, at: row.at || new Date().toISOString() })
  lsSet(CACHE_LEDGER, all.slice(0, 500))
}

function pushLocalCoinLedger(row) {
  const all = lsGet(CACHE_COIN_LEDGER, []) || []
  all.unshift({ ...row, at: row.at || new Date().toISOString() })
  lsSet(CACHE_COIN_LEDGER, all.slice(0, 500))
}

export function cachedCash(userId) {
  if (!userId) return 0
  return Math.max(0, Math.floor(Number((lsGet(CACHE_WALLETS, {}) || {})[userId]) || 0))
}

export function cachedCoins(userId) {
  if (!userId) return 0
  return Math.max(0, Math.floor(Number((lsGet(CACHE_COINS, {}) || {})[userId]) || 0))
}

export async function pullWallet(userId) {
  if (!canCloud(userId)) return { ok: false, reason: 'cloud_required', cash: cachedCash(userId), coins: cachedCoins(userId) }
  const client = await sb()
  if (!client) return { ok: false, reason: 'no_client', cash: cachedCash(userId), coins: cachedCoins(userId) }
  try {
    const { data, error } = await client.from('wallets').select('*').eq('user_id', userId).maybeSingle()
    if (error) return { ok: false, reason: error.message, cash: cachedCash(userId), coins: cachedCoins(userId) }
    if (!data) {
      await client.from('wallets').upsert({ user_id: userId, cash_units: 0, coin_units: 0, updated_at: new Date().toISOString() })
      cacheCash(userId, 0)
      cacheCoins(userId, 0)
      return { ok: true, cash: 0, coins: 0, firstBuyAt: null }
    }
    cacheCash(userId, data.cash_units)
    cacheCoins(userId, data.coin_units)
    if (data.first_buy_at) {
      const first = lsGet(CACHE_FIRST, {}) || {}
      first[userId] = data.first_buy_at
      lsSet(CACHE_FIRST, first)
    }
    const { data: ledger } = await client
      .from('wallet_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (Array.isArray(ledger)) {
      const cashRows = []
      const coinRows = []
      for (const r of ledger) {
        const row = {
          userId: r.user_id,
          delta: Number(r.delta) || 0,
          balance: Number(r.balance) || 0,
          kind: r.kind,
          note: r.note || '',
          at: r.created_at,
          ...(r.meta || {}),
        }
        if (String(r.kind || '').startsWith('coin')) coinRows.push(row)
        else cashRows.push(row)
      }
      const allCash = lsGet(CACHE_LEDGER, []) || []
      const allCoin = lsGet(CACHE_COIN_LEDGER, []) || []
      lsSet(CACHE_LEDGER, [...cashRows, ...allCash.filter((x) => x.userId !== userId)].slice(0, 500))
      lsSet(CACHE_COIN_LEDGER, [...coinRows, ...allCoin.filter((x) => x.userId !== userId)].slice(0, 500))
    }
    return {
      ok: true,
      cash: Number(data.cash_units) || 0,
      coins: Number(data.coin_units) || 0,
      firstBuyAt: data.first_buy_at || null,
    }
  } catch (e) {
    return { ok: false, reason: String(e?.message || e), cash: cachedCash(userId), coins: cachedCoins(userId) }
  }
}

async function ensureWalletRow(client, userId) {
  const { data } = await client.from('wallets').select('*').eq('user_id', userId).maybeSingle()
  if (data) return data
  const blank = { user_id: userId, cash_units: 0, coin_units: 0, updated_at: new Date().toISOString() }
  await client.from('wallets').upsert(blank)
  return blank
}

async function writeLedger(client, row) {
  await client.from('wallet_ledger').upsert({
    id: row.id,
    user_id: row.userId,
    kind: row.kind,
    delta: row.delta,
    balance: row.balance,
    note: row.note || '',
    meta: row.meta || {},
    created_at: row.at || new Date().toISOString(),
  })
}

/** Credit cash on cloud. Returns { ok, balance, error }. */
export async function cloudCreditCash(userId, units, meta = {}) {
  if (!canCloud(userId)) return { ok: false, error: 'Sign in with cloud account required.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  try {
    const row = await ensureWalletRow(client, userId)
    const next = Math.max(0, Math.floor(Number(row.cash_units) || 0) + n)
    const patch = { cash_units: next, updated_at: new Date().toISOString() }
    if (meta.tierId === 'first' && !row.first_buy_at) patch.first_buy_at = new Date().toISOString()
    const { error } = await client.from('wallets').update(patch).eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    const entry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      kind: meta.kind || 'cash_credit',
      delta: n,
      balance: next,
      note: meta.note || '',
      meta: { tierId: meta.tierId || '', usd: meta.usd || 0 },
      at: new Date().toISOString(),
    }
    await writeLedger(client, entry)
    cacheCash(userId, next)
    pushLocalLedger({
      userId,
      delta: n,
      balance: next,
      kind: entry.kind,
      note: entry.note,
      tierId: meta.tierId || '',
      usd: meta.usd || 0,
      at: entry.at,
    })
    if (patch.first_buy_at) {
      const first = lsGet(CACHE_FIRST, {}) || {}
      first[userId] = patch.first_buy_at
      lsSet(CACHE_FIRST, first)
    }
    return { ok: true, balance: next }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

export async function cloudSpendCash(userId, units, meta = {}) {
  if (!canCloud(userId)) return { ok: false, error: 'Sign in with cloud account required.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  try {
    const row = await ensureWalletRow(client, userId)
    const bal = Math.floor(Number(row.cash_units) || 0)
    if (bal < n) return { ok: false, error: 'Not enough Calabi Cash.', balance: bal }
    const next = bal - n
    const { error } = await client.from('wallets').update({ cash_units: next, updated_at: new Date().toISOString() }).eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    const entry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      kind: meta.kind || 'cash_debit',
      delta: -n,
      balance: next,
      note: meta.note || '',
      meta: { targetId: meta.targetId || '' },
      at: new Date().toISOString(),
    }
    await writeLedger(client, entry)
    cacheCash(userId, next)
    pushLocalLedger({
      userId,
      delta: -n,
      balance: next,
      kind: entry.kind,
      note: entry.note,
      targetId: meta.targetId || '',
      at: entry.at,
    })
    return { ok: true, balance: next }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

export async function cloudCreditCoins(userId, units, meta = {}) {
  if (!canCloud(userId)) return { ok: false, error: 'Sign in with cloud account required.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  try {
    const row = await ensureWalletRow(client, userId)
    const next = Math.max(0, Math.floor(Number(row.coin_units) || 0) + n)
    const { error } = await client.from('wallets').update({ coin_units: next, updated_at: new Date().toISOString() }).eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    const entry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      kind: meta.kind || 'coin_credit',
      delta: n,
      balance: next,
      note: meta.note || '',
      meta: {},
      at: new Date().toISOString(),
    }
    await writeLedger(client, entry)
    cacheCoins(userId, next)
    pushLocalCoinLedger({
      userId,
      delta: n,
      balance: next,
      kind: entry.kind,
      note: entry.note,
      at: entry.at,
    })
    return { ok: true, balance: next }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

export async function cloudSpendCoins(userId, units, meta = {}) {
  if (!canCloud(userId)) return { ok: false, error: 'Sign in with cloud account required.' }
  const n = Math.floor(Number(units) || 0)
  if (n <= 0) return { ok: false, error: 'Invalid amount.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  try {
    const row = await ensureWalletRow(client, userId)
    const bal = Math.floor(Number(row.coin_units) || 0)
    if (bal < n) return { ok: false, error: 'Insufficient Gold Coins', balance: bal }
    const next = bal - n
    const { error } = await client.from('wallets').update({ coin_units: next, updated_at: new Date().toISOString() }).eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    const entry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      kind: meta.kind || 'coin_debit',
      delta: -n,
      balance: next,
      note: meta.note || '',
      meta: {},
      at: new Date().toISOString(),
    }
    await writeLedger(client, entry)
    cacheCoins(userId, next)
    pushLocalCoinLedger({
      userId,
      delta: -n,
      balance: next,
      kind: entry.kind,
      note: entry.note,
      at: entry.at,
    })
    return { ok: true, balance: next }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

function emptyEarnings() {
  return {
    availableUsd: 0,
    pendingUsd: 0,
    lifetimeUsd: 0,
    tipsUsd: 0,
    subsUsd: 0,
    packsUsd: 0,
    daily: [],
  }
}

export function cachedEarnings(creatorId) {
  const all = lsGet(CACHE_EARN, {}) || {}
  const e = creatorId ? all[creatorId] : null
  if (!e) return emptyEarnings()
  return {
    availableUsd: Number(e.availableUsd) || 0,
    pendingUsd: Number(e.pendingUsd) || 0,
    lifetimeUsd: Number(e.lifetimeUsd) || 0,
    tipsUsd: Number(e.tipsUsd) || 0,
    subsUsd: Number(e.subsUsd) || 0,
    packsUsd: Number(e.packsUsd) || 0,
    daily: Array.isArray(e.daily) ? e.daily : [],
  }
}

function saveEarnCache(creatorId, e) {
  const all = lsGet(CACHE_EARN, {}) || {}
  all[creatorId] = e
  lsSet(CACHE_EARN, all)
}

export async function pullEarnings(creatorId) {
  if (!canCloud(creatorId)) return { ok: false, earnings: cachedEarnings(creatorId) }
  const client = await sb()
  if (!client) return { ok: false, earnings: cachedEarnings(creatorId) }
  try {
    const [{ data: row }, { data: daily }] = await Promise.all([
      client.from('creator_earnings').select('*').eq('creator_id', creatorId).maybeSingle(),
      client.from('creator_earnings_daily').select('*').eq('creator_id', creatorId).order('day', { ascending: true }).limit(90),
    ])
    const e = {
      availableUsd: Number(row?.available_usd) || 0,
      pendingUsd: Number(row?.pending_usd) || 0,
      lifetimeUsd: Number(row?.lifetime_usd) || 0,
      tipsUsd: Number(row?.tips_usd) || 0,
      subsUsd: Number(row?.subs_usd) || 0,
      packsUsd: Number(row?.packs_usd) || 0,
      daily: (daily || []).map((d) => ({ day: String(d.day).slice(0, 10), usd: Number(d.usd) || 0 })),
    }
    saveEarnCache(creatorId, e)

    const { data: methods } = await client.from('withdraw_methods').select('*').eq('creator_id', creatorId)
    const allWm = lsGet(CACHE_WM, {}) || {}
    allWm[creatorId] = (methods || []).map((m) => ({
      id: m.id,
      type: m.type,
      label: m.label,
      details: m.details,
      primary: !!m.is_primary,
      createdAt: m.created_at,
    }))
    lsSet(CACHE_WM, allWm)

    const { data: reqs } = await client
      .from('withdraw_requests')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(50)
    const allWr = lsGet(CACHE_WR, {}) || {}
    allWr[creatorId] = (reqs || []).map((r) => ({
      id: r.id,
      amountUsd: Number(r.amount_usd) || 0,
      methodId: r.method_id,
      methodLabel: r.method_label,
      status: r.status,
      createdAt: r.created_at,
    }))
    lsSet(CACHE_WR, allWr)

    return { ok: true, earnings: e }
  } catch {
    return { ok: false, earnings: cachedEarnings(creatorId) }
  }
}

export async function cloudCreditEarnings(creatorId, usd, meta = {}) {
  if (!creatorId || !canCloud(creatorId)) return { ok: false, error: 'Cloud creator required.' }
  const amount = Math.round((Number(usd) || 0) * 100) / 100
  if (amount <= 0) return { ok: false, error: 'Invalid amount.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  try {
    const cur = cachedEarnings(creatorId)
    const pulled = await pullEarnings(creatorId)
    const e = pulled.earnings || cur
    e.availableUsd = Math.round((e.availableUsd + amount) * 100) / 100
    e.lifetimeUsd = Math.round((e.lifetimeUsd + amount) * 100) / 100
    const kind = meta.kind || 'other'
    if (kind === 'tip') e.tipsUsd = Math.round((e.tipsUsd + amount) * 100) / 100
    else if (kind === 'sub' || kind === 'premium') e.subsUsd = Math.round((e.subsUsd + amount) * 100) / 100
    else if (kind === 'cash_pack') e.packsUsd = Math.round((e.packsUsd + amount) * 100) / 100
    const day = new Date().toISOString().slice(0, 10)
    const daily = [...(e.daily || [])]
    const idx = daily.findIndex((r) => r.day === day)
    if (idx >= 0) daily[idx] = { ...daily[idx], usd: Math.round((daily[idx].usd + amount) * 100) / 100 }
    else daily.push({ day, usd: amount })
    e.daily = daily.slice(-90)

    await client.from('creator_earnings').upsert({
      creator_id: creatorId,
      available_usd: e.availableUsd,
      pending_usd: e.pendingUsd,
      lifetime_usd: e.lifetimeUsd,
      tips_usd: e.tipsUsd,
      subs_usd: e.subsUsd,
      packs_usd: e.packsUsd,
      updated_at: new Date().toISOString(),
    })
    const dayUsd = daily.find((r) => r.day === day)?.usd || amount
    await client.from('creator_earnings_daily').upsert({
      creator_id: creatorId,
      day,
      usd: dayUsd,
    })
    saveEarnCache(creatorId, e)
    return { ok: true, earnings: e }
  } catch (err) {
    return { ok: false, error: String(err?.message || err) }
  }
}

export async function cloudSaveWithdrawMethod(creatorId, method) {
  if (!canCloud(creatorId)) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const id = method.id || `wm_${Date.now()}`
  const row = {
    id,
    creator_id: creatorId,
    type: method.type || 'paypal',
    label: String(method.label || '').trim() || 'Payout method',
    details: String(method.details || '').trim(),
    is_primary: Boolean(method.primary),
    created_at: method.createdAt || new Date().toISOString(),
  }
  const { error } = await client.from('withdraw_methods').upsert(row)
  if (error) return { ok: false, error: error.message }
  await pullEarnings(creatorId)
  return { ok: true, method: { id, type: row.type, label: row.label, details: row.details, primary: row.is_primary, createdAt: row.created_at } }
}

export async function cloudRemoveWithdrawMethod(creatorId, id) {
  if (!canCloud(creatorId)) return { ok: false, error: 'Cloud required.' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  const { error } = await client.from('withdraw_methods').delete().eq('id', id).eq('creator_id', creatorId)
  if (error) return { ok: false, error: error.message }
  await pullEarnings(creatorId)
  return { ok: true }
}

export async function cloudRequestWithdrawal(creatorId, amountUsd, methodId) {
  if (!canCloud(creatorId)) return { ok: false, error: 'Cloud required.' }
  const amount = Math.round((Number(amountUsd) || 0) * 100) / 100
  if (amount < 10) return { ok: false, error: 'Minimum withdrawal is $10' }
  const client = await sb()
  if (!client) return { ok: false, error: 'Cloud unavailable.' }
  await pullEarnings(creatorId)
  const e = cachedEarnings(creatorId)
  if (amount > e.availableUsd) return { ok: false, error: 'Amount exceeds available balance' }
  const methods = (lsGet(CACHE_WM, {}) || {})[creatorId] || []
  const method = methods.find((m) => m.id === methodId)
  if (!method) return { ok: false, error: 'Select a withdrawal method' }
  e.availableUsd = Math.round((e.availableUsd - amount) * 100) / 100
  e.pendingUsd = Math.round((e.pendingUsd + amount) * 100) / 100
  const req = {
    id: `wr_${Date.now()}`,
    creator_id: creatorId,
    amount_usd: amount,
    method_id: method.id,
    method_label: method.label,
    status: 'pending',
    created_at: new Date().toISOString(),
  }
  const { error: e1 } = await client.from('creator_earnings').upsert({
    creator_id: creatorId,
    available_usd: e.availableUsd,
    pending_usd: e.pendingUsd,
    lifetime_usd: e.lifetimeUsd,
    tips_usd: e.tipsUsd,
    subs_usd: e.subsUsd,
    packs_usd: e.packsUsd,
    updated_at: new Date().toISOString(),
  })
  if (e1) return { ok: false, error: e1.message }
  const { error: e2 } = await client.from('withdraw_requests').insert(req)
  if (e2) return { ok: false, error: e2.message }
  saveEarnCache(creatorId, e)
  await pullEarnings(creatorId)
  return { ok: true, request: { id: req.id, amountUsd: amount, methodId: method.id, methodLabel: method.label, status: 'pending', createdAt: req.created_at }, earnings: e }
}

export async function pushContentView({ id, contentId, creatorId, actorId, surface, contentType }) {
  const actor = getGraphActor()
  if (!isSupabaseConfigured() || !contentId || !creatorId) return false
  if (actorId && actor?.id && actorId !== actor.id) return false
  if (!actor?.id) return false
  const client = await sb()
  if (!client) return false
  try {
    const { error } = await client.from('content_views').upsert({
      id: id || `cv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content_id: contentId,
      creator_id: creatorId,
      actor_id: actorId || actor.id,
      surface: surface || 'unknown',
      content_type: contentType || null,
      created_at: new Date().toISOString(),
    })
    return !error
  } catch {
    return false
  }
}

export async function pushPremiumSub(userId, creatorId) {
  if (!canCloud(userId) || !creatorId) return false
  const client = await sb()
  if (!client) return false
  try {
    const { error } = await client.from('premium_subs').upsert({
      user_id: userId,
      creator_id: creatorId,
      created_at: new Date().toISOString(),
    })
    return !error
  } catch {
    return false
  }
}

export async function pullPremiumSubs() {
  if (!isSupabaseConfigured()) return false
  const client = await sb()
  if (!client) return false
  try {
    const { data, error } = await client.from('premium_subs').select('*').limit(5000)
    if (error || !data) return false
    const byCreator = {}
    for (const r of data) {
      if (!r.creator_id || !r.user_id) continue
      byCreator[r.creator_id] = byCreator[r.creator_id] || []
      if (!byCreator[r.creator_id].includes(r.user_id)) byCreator[r.creator_id].push(r.user_id)
    }
    for (const [creatorId, list] of Object.entries(byCreator)) {
      lsSet(`premium_${creatorId}`, list)
    }
    return true
  } catch {
    return false
  }
}

export async function pullContentViewsForCreator(creatorId) {
  if (!creatorId || !isSupabaseConfigured()) return []
  const client = await sb()
  if (!client) return []
  try {
    const { data, error } = await client
      .from('content_views')
      .select('id, content_id, creator_id, actor_id, surface, content_type, created_at')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error || !Array.isArray(data)) return []
    return data
  } catch {
    return []
  }
}

export async function pullViewCounts(contentIds = []) {
  if (!isSupabaseConfigured() || !contentIds.length) return false
  const client = await sb()
  if (!client) return false
  try {
    const { data, error } = await client
      .from('content_view_counts')
      .select('content_id, views')
      .in('content_id', contentIds.slice(0, 500))
    if (error || !data) return false
    const map = lsGet('engagement_views', {}) || {}
    for (const r of data) {
      if (!r.content_id) continue
      map[r.content_id] = Math.max(Number(map[r.content_id]) || 0, Number(r.views) || 0)
    }
    lsSet('engagement_views', map)
    return true
  } catch {
    return false
  }
}
