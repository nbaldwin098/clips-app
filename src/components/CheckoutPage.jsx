import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { membershipReturnPaid, isStripeConfigured, stripeMode } from '../lib/stripeConfig'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'
import { usePremiumCheckout } from '../hooks/usePremiumCheckout'
import PageHeader from './PageHeader'
import PlatformFeeLine from './PlatformFeeLine'
import { withPlatformFee, formatUsdFromCents } from '../lib/platformFee'

/** calabi-owned checkout shell — Stripe hosts the card form only. */
export default function CheckoutPage({ onNavigate, creatorId, returnParams = {} }) {
  const { user, isAuthenticated } = useAuth()
  const checkout = usePremiumCheckout({ user, isAuthenticated, creatorId })
  const priceCents = Math.round((Number(checkout.price) || 0) * 100)
  const { totalCents } = withPlatformFee(priceCents)
  const canPay = ownCheckoutConfigured()
  const mode = stripeMode()

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !checkout.target) return
    const search = typeof window !== 'undefined' ? window.location.search : ''
    if (!membershipReturnPaid(returnParams, search)) return
    checkout.setStatus('Returned from Stripe. Premium applies when checkout confirms paid=1 or session_id.')
  }, [isAuthenticated, user?.id, checkout.target, returnParams, checkout.setStatus])

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="calabi Checkout" subtitle={`Premium · $${checkout.price}/month`} onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Order summary</p>
        <p className="text-3xl font-semibold text-white">${checkout.price}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Premium badge in chat</li>
          <li>Creator emotes the channel has added</li>
          <li>calabi Checkout · card form hosted by Stripe</li>
        </ul>
        <div className="rounded-lg border border-zinc-800 bg-black/40 p-3 space-y-1 text-xs text-zinc-400">
          <p className="text-zinc-300">Subtotal {formatUsdFromCents(priceCents)}</p>
          <PlatformFeeLine listCents={priceCents} showTotal />
        </div>
        <p className="text-[11px] text-zinc-500">
          {canPay
            ? `Ready${isStripeConfigured() ? ` (${mode})` : ''}. Sign in, then Pay — you return here after Stripe.`
            : 'Set cloud env + deploy create-checkout-session.'}
        </p>
        {checkout.already ? (
          <p className="text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={!isAuthenticated || !canPay} onClick={checkout.pay} className="w-full h-11 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40">
            {isAuthenticated
              ? (canPay ? `Pay ${formatUsdFromCents(totalCents)}` : 'Checkout not configured')
              : 'Sign in for premium'}
          </button>
        )}
        {checkout.status && <p className="text-xs text-zinc-400">{checkout.status}</p>}
        <button type="button" className="text-xs text-zinc-500 underline" onClick={() => onNavigate?.('shop')}>
          Or shop physical / virtual products →
        </button>
      </div>
    </div>
  )
}
