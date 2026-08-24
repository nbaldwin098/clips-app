import { useState } from 'react'
import { X, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getMembershipPrice, isPremiumSub } from '../lib/engagement'
import { getStripePaymentLink } from '../lib/stripeConfig'
import { startPremiumCheckout } from '../lib/checkout'
import { stashPendingStripe } from '../lib/tips'
import { redirectSafeUrl } from '../lib/safeUrl'

export default function CheckoutModal({ open, onClose, creatorId, creatorHandle }) {
  const { user, isAuthenticated } = useAuth()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const target = creatorId || user?.id
  const price = getMembershipPrice(target)
  const already = user && target ? isPremiumSub(user.id, target) : false
  const hasLink = !!getStripePaymentLink()

  if (!open) return null

  const pay = async () => {
    if (!isAuthenticated || !target) {
      setStatus('Sign in first.')
      return
    }
    setBusy(true)
    stashPendingStripe({ kind: 'premium', donorId: user.id, handle: user.handle, creatorId: target })
    const result = await startPremiumCheckout({
      already,
      email: user?.email || '',
      reference: target,
    })
    setStatus(result.message)
    if (result.url) redirectSafeUrl(result.url)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#121218] shadow-2xl p-5 relative">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-white">
          <Heart className="h-5 w-5" />
          <h2 className="text-sm font-semibold">Premium membership</h2>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {creatorHandle ? `Support @${creatorHandle}` : 'Support this channel'} · ${price}/month
        </p>
        <p className="mt-4 text-3xl font-semibold text-white">
          ${price}<span className="text-sm text-zinc-500 font-normal">/mo</span>
        </p>
        <ul className="mt-3 text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Badge in chat when chat exists</li>
          <li>{hasLink ? 'Pays on Stripe Checkout' : 'Needs a Payment Link on Render to charge'}</li>
          <li>Payouts are not live</li>
        </ul>
        {already ? (
          <p className="mt-4 text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={busy || !isAuthenticated} onClick={pay} className="mt-5 w-full h-11 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-40 hover:bg-zinc-200 transition-all">
            {!isAuthenticated ? 'Sign in to subscribe' : busy ? 'Working…' : hasLink ? `Pay $${price}/mo on Stripe` : `Subscribe $${price}/mo`}
          </button>
        )}
        {status && <p className="mt-3 text-[11px] text-zinc-500">{status}</p>}
      </div>
    </div>
  )
}
