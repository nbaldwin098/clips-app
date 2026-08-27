import { useState } from 'react'
import { X, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePremiumCheckout } from '../hooks/usePremiumCheckout'
import PlatformFeeLine from './PlatformFeeLine'
import { withPlatformFee, formatUsdFromCents } from '../lib/platformFee'

export default function CheckoutModal({ open, onClose, creatorId, creatorHandle }) {
  const { user, isAuthenticated } = useAuth()
  const checkout = usePremiumCheckout({ user, isAuthenticated, creatorId, creatorHandle })
  const priceCents = Math.round((Number(checkout.price) || 0) * 100)
  const { totalCents } = withPlatformFee(priceCents)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#121218] shadow-2xl p-5 relative">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800" aria-label="Close checkout">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-white">
          <Heart className="h-5 w-5" />
          <h2 id="checkout-modal-title" className="text-sm font-semibold">Premium membership</h2>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Support {checkout.label} · ${checkout.price}/month
        </p>
        <p className="mt-4 text-3xl font-semibold text-white">
          ${checkout.price}<span className="text-sm text-zinc-500 font-normal">/mo</span>
        </p>
        <div className="mt-3">
          <PlatformFeeLine listCents={priceCents} showTotal />
        </div>
        <ul className="mt-3 text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Badge in chat when chat exists</li>
          <li>{checkout.configured && checkout.hasLink ? 'Pays on Stripe Checkout' : 'Card checkout is not set up on this site yet.'}</li>
          <li>Payouts are not live</li>
        </ul>
        {checkout.already ? (
          <p className="mt-4 text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={checkout.busy || !isAuthenticated} onClick={checkout.pay} className="mt-5 w-full h-11 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-40 hover:bg-zinc-200 transition-all">
            {!isAuthenticated ? 'Sign in for premium' : checkout.busy ? 'Working…' : checkout.hasLink ? `Pay ${formatUsdFromCents(totalCents)} on Stripe` : `Premium $${checkout.price}/mo`}
          </button>
        )}
        {checkout.status && <p className="mt-3 text-[11px] text-zinc-500">{checkout.status}</p>}
      </div>
    </div>
  )
}
