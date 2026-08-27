import { X, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePremiumCheckout } from '../hooks/usePremiumCheckout'

export default function CheckoutModal({ open, onClose, creatorId, creatorHandle }) {
  const { user, isAuthenticated } = useAuth()
  const checkout = usePremiumCheckout({ user, isAuthenticated, creatorId, creatorHandle })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
      <div className="w-full max-w-sm border border-zinc-800 bg-[#121218] shadow-2xl p-5 relative">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 h-8 w-8 flex items-center justify-center text-zinc-400 hover:bg-zinc-800" aria-label="Close checkout">
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
        {checkout.already ? (
          <p className="mt-4 text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={checkout.busy || !isAuthenticated} onClick={checkout.pay} className="mt-5 w-full h-11 bg-white text-black font-bold text-sm disabled:opacity-40 hover:bg-zinc-200">
            {!isAuthenticated ? 'Sign in for premium' : checkout.busy ? 'Working…' : `Pay $${checkout.price}`}
          </button>
        )}
        {checkout.status && <p className="mt-3 text-[11px] text-zinc-500">{checkout.status}</p>}
      </div>
    </div>
  )
}
