import { lsGet, lsSet } from './storage'
import { addDonation, postLiveChat, markContentPurchased } from './engagement'
import { membershipReturnPaid } from './stripeConfig'
import { startPremiumCheckout } from './checkout'
import { createNotification } from './notifications'
import { creditCoins, getTierById, spendCalabiCash, creatorCashShare, usdToCashUnits } from './calabiCash'
import { CREATOR_REV_SHARE } from './revenueSplit'
import { createDonationRequest } from './donationEscrow'

const PENDING = 'clips_pending_stripe'
export const TIP_AMOUNTS = [2, 5, 10, 25]
export const TIP_AMOUNT_MIN = 1
export const TIP_AMOUNT_MAX = 500

export function normalizeTipAmount(raw) {
  const n = Math.round(Number(raw) * 100) / 100
  if (!Number.isFinite(n)) return null
  if (n < TIP_AMOUNT_MIN || n > TIP_AMOUNT_MAX) return null
  return n
}

export function isValidTipAmount(amount) {
  return normalizeTipAmount(amount) != null
}

export function stashPendingStripe(payload) {
  if (typeof sessionStorage === 'undefined' || !payload?.kind) return
  try {
    sessionStorage.setItem(PENDING, JSON.stringify({ ...payload, at: Date.now() }))
  } catch {}
}

export function readPendingStripe() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPendingStripe() {
  try { sessionStorage.removeItem(PENDING) } catch {}
}

export function donatedToPost(contentId, userId) {
  if (!contentId || !userId) return 0
  const rows = lsGet('post_tips', {})[contentId] || []
  return rows
    .filter((r) => r.donorId === userId)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
}

function recordPostTip(row) {
  const all = lsGet('post_tips', {}) || {}
  const list = all[row.contentId] || []
  list.unshift(row)
  all[row.contentId] = list.slice(0, 200)
  lsSet('post_tips', all)
}

export async function startTipCheckout({ user, kind, creatorId, contentId, amount, handle }) {
  const dollars = normalizeTipAmount(amount)
  if (!user?.id) return { ok: false, url: '', message: 'Sign in first.' }
  if (dollars == null) {
    return { ok: false, url: '', message: `Enter $${TIP_AMOUNT_MIN}–$${TIP_AMOUNT_MAX}.` }
  }
  stashPendingStripe({
    kind,
    donorId: user.id,
    handle: handle || user.handle,
    creatorId,
    contentId: contentId || '',
    amount: dollars,
  })
  const result = await startPremiumCheckout({
    already: false,
    email: user.email || '',
    reference: `${kind}:${creatorId}:${contentId || ''}:${dollars}:${user.id}`.slice(0, 200),
    amountCents: Math.round(dollars * 100),
    kind,
    productName: kind === 'live_tip' ? `Live tip $${dollars}` : `Tip $${dollars}`,
    creatorId: creatorId || '',
    contentId: contentId || '',
  })
  return { ok: !!result.url, url: result.url || '', message: result.message, granted: false }
}

/** Buy a Coin pack via own Stripe Checkout. */
export async function startCalabiCashCheckout({ user, tierId }) {
  if (!user?.id) return { ok: false, url: '', message: 'Sign in first.' }
  const tier = getTierById(tierId)
  if (!tier) return { ok: false, url: '', message: 'Pick a Coin pack.' }
  stashPendingStripe({
    kind: 'coin_pack',
    donorId: user.id,
    handle: user.handle,
    tierId: tier.id,
    coins: tier.coins,
    amount: tier.usd,
  })
  const result = await startPremiumCheckout({
    already: false,
    email: user.email || '',
    reference: `coins:${tier.id}:${tier.coins}:${user.id}`.slice(0, 200),
    amountCents: Math.round(Number(tier.usd) * 100),
    kind: 'coin_pack',
    productName: tier.label || `${tier.coins} Coins`,
    tierId: tier.id,
  })
  return { ok: !!result.url, url: result.url || '', message: result.message, granted: false }
}

/**
 * Instant tip from Coins balance (legacy Cash tip path).
 * Optional requestText holds funds in escrow until fulfilled + admin release.
 */
export function tipWithCalabiCash({
  user,
  creatorId,
  contentId = '',
  units,
  kind = 'live_cash',
  requestText = '',
}) {
  if (!user?.id) return { ok: false, error: 'Sign in first.' }
  if (!creatorId) return { ok: false, error: 'Missing creator.' }
  const n = Math.floor(Number(units) || 0)
  if (n < 1) return { ok: false, error: 'Enter coin amount.' }
  if (requestText) {
    return createDonationRequest({
      donor: user,
      creatorId,
      units: n,
      requestText,
      contentId,
      kind: kind === 'post_cash' ? 'post_request' : 'live_request',
    })
  }
  const spent = spendCalabiCash(user.id, n, {
    kind,
    note: contentId || 'tip',
    targetId: creatorId,
  })
  if (!spent.ok) return spent
  const share = creatorCashShare(n, CREATOR_REV_SHARE)
  creditCoins(creatorId, share.creator, {
    kind: 'tip_earn',
    note: `@${user.handle || 'viewer'}`,
  })
  addDonation(creatorId, {
    fromUserId: user.id,
    handle: user.handle,
    amount: n / 100,
    kind,
    contentId,
    cashUnits: n,
  })
  if (kind === 'live_cash') {
    postLiveChat(creatorId, {
      userId: user.id,
      handle: user.handle,
      kind: 'donation',
      amount: n / 100,
      text: `tipped ${n} Coins`,
    })
  }
  createNotification({
    userId: creatorId,
    type: 'premium',
    title: `@${user.handle || 'someone'} tipped ${n} Coins`,
    body: 'Coin tip',
    view: kind === 'live_cash' ? 'live' : 'watch',
    contentId,
  })
  return { ok: true, units: n, creatorReceived: share.creator }
}

function applyTip(pending) {
  const amount = Number(pending.amount) || 0
  addDonation(pending.creatorId, {
    fromUserId: pending.donorId,
    handle: pending.handle,
    amount,
    kind: pending.kind,
    contentId: pending.contentId || '',
  })
  if (pending.kind === 'live_tip' && pending.creatorId) {
    postLiveChat(pending.creatorId, {
      userId: pending.donorId,
      handle: pending.handle,
      kind: 'donation',
      amount,
      text: `donated $${amount.toFixed(2)}`,
    })
  }
  if (pending.kind === 'post_tip' && pending.contentId) {
    recordPostTip({
      donorId: pending.donorId,
      handle: pending.handle,
      amount,
      contentId: pending.contentId,
      creatorId: pending.creatorId,
      at: new Date().toISOString(),
    })
  }
  if (pending.creatorId && pending.creatorId !== pending.donorId) {
    createNotification({
      userId: pending.creatorId,
      type: 'premium',
      title: `@${pending.handle || 'someone'} donated $${amount.toFixed(2)}`,
      body: pending.kind === 'live_tip' ? 'Live donation' : 'Post donation',
      view: pending.kind === 'live_tip' ? 'live' : 'watch',
      contentId: pending.contentId || '',
    })
  }
}

/**
 * Apply a Stripe return. Never marks premium or a tip unless paid=1 / session_id came back.
 * Tips never grant channel premium.
 * Idempotent across tab refreshes via sessionStorage + localStorage claim key.
 */
export function claimStripeReturn(user, params = {}, search = '') {
  if (!user?.id) return { ok: false, kind: '' }
  if (!membershipReturnPaid(params, search)) return { ok: false, kind: '' }
  const pending = readPendingStripe()
  const claimKey = (() => {
    try {
      const q = typeof search === 'string' ? new URLSearchParams(search) : new URLSearchParams()
      const sid = String(params.session_id || params.sessionId || q.get('session_id') || '').slice(0, 120)
      const kind = String(pending?.kind || 'unknown').slice(0, 40)
      const amt = String(pending?.amount || pending?.tierId || pending?.contentId || pending?.at || '').slice(0, 80)
      return `calabi_stripe_claimed_${user.id}_${kind}_${sid || amt}`
    } catch {
      return ''
    }
  })()
  const already = () => {
    if (!claimKey || typeof window === 'undefined') return false
    try {
      if (sessionStorage.getItem(claimKey) === '1') return true
      if (localStorage.getItem(claimKey) === '1') return true
    } catch {}
    return false
  }
  if (already()) {
    clearPendingStripe()
    return { ok: false, kind: '', alreadyClaimed: true }
  }
  clearPendingStripe()
  // Mark before granting so a mid-flight refresh cannot double-credit.
  const markClaimed = () => {
    if (!claimKey || typeof window === 'undefined') return
    try { sessionStorage.setItem(claimKey, '1') } catch {}
    try { localStorage.setItem(claimKey, '1') } catch {}
  }
  markClaimed()
  if (pending?.kind === 'live_tip' || pending?.kind === 'post_tip') {
    if (pending.donorId !== user.id) return { ok: false, kind: '' }
    applyTip(pending)
    return { ok: true, kind: pending.kind, amount: pending.amount }
  }
  if (pending?.kind === 'calabi_cash' || pending?.kind === 'coin_pack') {
    if (pending.donorId !== user.id) return { ok: false, kind: '' }
    const tier = getTierById(pending.tierId)
    const coins = Math.floor(Number(pending.coins) || tier?.coins || 0)
    if (coins > 0) {
      creditCoins(user.id, coins, {
        kind: 'purchase',
        tierId: pending.tierId,
        usd: pending.amount,
        note: 'Coin pack',
      })
    }
    return { ok: true, kind: 'coin_pack', coins }
  }
  if (pending?.kind === 'post_purchase') {
    if (pending.donorId === user.id && pending.contentId) markContentPurchased(user.id, pending.contentId)
    try { sessionStorage.removeItem('clips_pending_purchase') } catch {}
    return { ok: true, kind: 'post_purchase' }
  }
  if (pending?.kind === 'premium') {
    return { ok: true, kind: 'premium', creatorId: pending.creatorId || '' }
  }
  if (pending?.kind === 'marketplace') {
    if (pending.donorId === user.id && pending.orderId) {
      import('./marketplaceSync').then(({ markOrderPaid }) => {
        markOrderPaid(pending.orderId).catch(() => {})
      }).catch(() => {})
    }
    return { ok: true, kind: 'marketplace', orderId: pending.orderId || '' }
  }
  try {
    const leftover = sessionStorage.getItem('clips_pending_purchase')
    if (leftover) {
      markContentPurchased(user.id, leftover)
      sessionStorage.removeItem('clips_pending_purchase')
      return { ok: true, kind: 'post_purchase' }
    }
  } catch {}
  return { ok: false, kind: '' }
}
