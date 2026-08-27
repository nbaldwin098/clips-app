/**
 * Buyer-facing platform fee on every card checkout.
 * Rate is internal — UI never shows the percentage, only “Platform fee”.
 */

export const PLATFORM_FEE_RATE = 0.04

/** Shown next to the fee amount — no percentage. */
export const PLATFORM_FEE_LABEL = 'Platform fee'

/** Tooltip / expand copy for the blue ? */
export const PLATFORM_FEE_EXPLAINER = 'Platform and fraud protection'

/**
 * @param {number} listCents — product / tip / pack list price in cents (before fee)
 * @returns {number} fee in cents
 */
export function calcPlatformFeeCents(listCents) {
  const n = Math.max(0, Math.round(Number(listCents) || 0))
  return Math.round(n * PLATFORM_FEE_RATE)
}

/**
 * @param {number} listCents
 * @returns {{ listCents: number, feeCents: number, totalCents: number }}
 */
export function withPlatformFee(listCents) {
  const list = Math.max(0, Math.round(Number(listCents) || 0))
  const feeCents = calcPlatformFeeCents(list)
  return { listCents: list, feeCents, totalCents: list + feeCents }
}

export function formatUsdFromCents(cents) {
  const n = Math.round(Number(cents) || 0) / 100
  return `$${n.toFixed(2)}`
}
