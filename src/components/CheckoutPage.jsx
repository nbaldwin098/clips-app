import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { PREMIUM_PRICE, isPremiumSub } from '../lib/engagement'
import { isStripeConfigured, stripeMode } from '../lib/stripeConfig'
import { startPremiumCheckout } from '../lib/checkout'
import PageHeader from './PageHeader'

export default function CheckoutPage({ onNavigate, creatorId }) {
  const { user, isAuthenticated } = useAuth()
  const [status, setStatus] = useState('')
  const target = creatorId || user?.id
  const already = user && target ? isPremiumSub(user.id, target) : false
  const configured = isStripeConfigured()

  const pay = () => {
    if (!isAuthenticated) {
      setStatus('Sign in first.')
      return
    }
    const result = startPremiumCheckout({ already })
    setStatus(result.message)
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Premium" subtitle={`List price $${PREMIUM_PRICE}/month`} onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-3xl font-semibold text-white">${PREMIUM_PRICE}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Subscriber badge in chat</li>
          <li>Creator emotes</li>
          <li>Creator keeps list price — when Stripe actually charges</li>
        </ul>
        <p className="text-[11px] text-zinc-500">
          Stripe: {configured ? `key present (${stripeMode()})` : 'not connected'} · premium is not granted until a real charge succeeds
        </p>
        {already ? (
          <p className="text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={!isAuthenticated} onClick={pay} className="w-full h-11 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40">
            {isAuthenticated ? `Subscribe $${PREMIUM_PRICE}/mo` : 'Sign in to subscribe'}
          </button>
        )}
        {status && <p className="text-xs text-zinc-400">{status}</p>}
      </div>
    </div>
  )
}
