import { useState } from 'react'
import {
  PLATFORM_FEE_LABEL,
  PLATFORM_FEE_EXPLAINER,
  calcPlatformFeeCents,
  formatUsdFromCents,
} from '../lib/platformFee'

/**
 * Compact “Platform fee $X.XX” row with a blue ? for fraud/platform copy.
 * Does not show the percentage.
 */
export default function PlatformFeeLine({ listCents, className = '', showTotal = false }) {
  const [open, setOpen] = useState(false)
  const list = Math.round(Number(listCents) || 0)
  const fee = calcPlatformFeeCents(list)
  const total = list + fee
  if (list <= 0) return null

  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-xs text-zinc-400">
        <span>
          {PLATFORM_FEE_LABEL} {formatUsdFromCents(fee)}
        </span>
        <button
          type="button"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white hover:bg-sky-500"
          title={PLATFORM_FEE_EXPLAINER}
          aria-label={PLATFORM_FEE_EXPLAINER}
          onClick={() => setOpen((v) => !v)}
        >
          ?
        </button>
      </p>
      {open ? (
        <p className="mt-1 text-[11px] text-sky-300/90 leading-relaxed">{PLATFORM_FEE_EXPLAINER}</p>
      ) : null}
      {showTotal ? (
        <p className="mt-1 text-sm font-semibold text-white">Total {formatUsdFromCents(total)}</p>
      ) : null}
    </div>
  )
}
