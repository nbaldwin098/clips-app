import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { membershipReturnPaid, isStripeConfigured, stripeMode } from '../lib/stripeConfig'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'
import { usePremiumCheckout } from '../hooks/usePremiumCheckout'
import PageHeader from './PageHeader'
import { calcPlatformFeeCents, PLATFORM_FEE_EXPLAINER, formatUsdFromCents } from '../lib/marketplaceSync'

export default function CheckoutPage({ onNavigate, creatorId, returnParams = {} }) {
  const { user, isAuthenticated } = useAuth()
  const checkout = usePremiumCheckout({ user, isAuthenticated, creatorId })
  const priceCents = Math.round((Number(checkout.price) || 0) * 100)
  const fee = calcPlatformFeeCents(priceCents)
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
      <PageHeader title="Checkout" subtitle={`Premium · $${checkout.price}/month`} onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-3xl font-semibold text-white">${checkout.price}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Premium badge in chat</li>
          <li>Creator emotes the channel has added</li>
          <li>Charged through calabi’s own Stripe Checkout</li>
        </ul>
        <div className="rounded-lg border border-zinc-800 bg-black/40 p-3 space-y-1 text-xs text-zinc-400">
          <p className="flex items-center gap-1 text-zinc-300">
            Platform fee {formatUsdFromCents(fee)}
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[10px] text-white"
              title={PLATFORM_FEE_EXPLAINER}
            >
              ?
            </span>
          </p>
          <p className="text-[11px] text-sky-300/90">{PLATFORM_FEE_EXPLAINER}</p>
          <p className="text-white pt-1">Stripe hosts the card form; money is confirmed on return to calabi.</p>
        </div>
        <p className="text-[11px] text-zinc-500">
          {canPay
            ? `Own checkout ready${isStripeConfigured() ? ` (${mode})` : ''}. Sign in, then Pay.`
            : 'Set VITE_SUPABASE_URL + ANON_KEY and deploy the create-checkout-session Edge Function.'}
        </p>
        {checkout.already ? (
          <p className="text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={!isAuthenticated || !canPay} onClick={checkout.pay} className="w-full h-11 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40">
            {isAuthenticated
              ? (canPay ? `Pay $${checkout.price}/mo` : 'Checkout not configured')
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
