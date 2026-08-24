import { lsGet, lsSet } from './storage'
import { addDonation, postLiveChat, markContentPurchased } from './engagement'
import { membershipReturnPaid } from './stripeConfig'
import { startPremiumCheckout } from './checkout'
import { createNotification } from './notifications'

const PENDING = 'clips_pending_stripe'
export const TIP_AMOUNTS = [2, 5, 10, 25]

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
  const dollars = Number(amount)
  if (!user?.id) return { ok: false, url: '', message: 'Sign in first.' }
  if (!TIP_AMOUNTS.includes(dollars)) return { ok: false, url: '', message: 'Pick a listed amount.' }
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
  })
  return { ok: !!result.url, url: result.url || '', message: result.message, granted: false }
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
 */
export function claimStripeReturn(user, params = {}, search = '') {
  if (!user?.id) return { ok: false, kind: '' }
  if (!membershipReturnPaid(params, search)) return { ok: false, kind: '' }
  const pending = readPendingStripe()
  clearPendingStripe()
  if (pending?.kind === 'live_tip' || pending?.kind === 'post_tip') {
    if (pending.donorId !== user.id) return { ok: false, kind: '' }
    applyTip(pending)
    return { ok: true, kind: pending.kind, amount: pending.amount }
  }
  if (pending?.kind === 'post_purchase') {
    if (pending.donorId === user.id && pending.contentId) markContentPurchased(user.id, pending.contentId)
    try { sessionStorage.removeItem('clips_pending_purchase') } catch {}
    return { ok: true, kind: 'post_purchase' }
  }
  if (pending?.kind === 'premium') {
    return { ok: true, kind: 'premium', creatorId: pending.creatorId || '' }
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
