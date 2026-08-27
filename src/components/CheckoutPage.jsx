import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { membershipReturnPaid, isStripeConfigured, stripeMode } from '../lib/stripeConfig'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'
import { usePremiumCheckout } from '../hooks/usePremiumCheckout'
import PageHeader from './PageHeader'

/** calabi-owned checkout shell — Stripe hosts the card form only. */
export default function CheckoutPage({ onNavigate, creatorId, returnParams = {} }) {
  const { user, isAuthenticated } = useAuth()
  const checkout = usePremiumCheckout({ user, isAuthenticated, creatorId })
  const canPay = ownCheckoutConfigured()
  const mode = stripeMode()

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !checkout.target) return
    const search = typeof window !== 'undefined' ? window.location.search : ''
    if (!membershipReturnPaid(returnParams, search)) return
    checkout.setStatus('Returned from Stripe.')
  }, [isAuthenticated, user?.id, checkout.target, returnParams, checkout.setStatus])

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Checkout" subtitle={`Premium · $${checkout.price}/month`} onBack={() => onNavigate?.('home')} />
      <div className="border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-3xl font-semibold text-white">${checkout.price}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Premium badge in chat</li>
          <li>Creator emotes</li>
        </ul>
        {checkout.already ? (
          <p className="text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={!isAuthenticated || !canPay} onClick={checkout.pay} className="w-full h-11 bg-white text-black text-sm font-medium disabled:opacity-40">
            {isAuthenticated
              ? (canPay ? `Pay $${checkout.price}` : 'Checkout not configured')
              : 'Sign in for premium'}
          </button>
        )}
        {checkout.status && <p className="text-xs text-zinc-400">{checkout.status}</p>}
      </div>
    </div>
  )
}
