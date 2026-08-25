import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { membershipReturnPaid } from '../lib/stripeConfig'
import { usePremiumCheckout } from '../hooks/usePremiumCheckout'
import PageHeader from './PageHeader'

export default function CheckoutPage({ onNavigate, creatorId, returnParams = {} }) {
  const { user, isAuthenticated } = useAuth()
  const checkout = usePremiumCheckout({ user, isAuthenticated, creatorId })

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !checkout.target) return
    const search = typeof window !== 'undefined' ? window.location.search : ''
    if (!membershipReturnPaid(returnParams, search)) return
    checkout.setStatus('Stripe sent you back here. Donations, paid posts, and premium only apply if that is what you started — a webhook will confirm the charge later.')
  }, [isAuthenticated, user?.id, checkout.target, returnParams, checkout.setStatus])

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Premium" subtitle={`List price $${checkout.price}/month`} onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-3xl font-semibold text-white">${checkout.price}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Premium badge in chat when live chat exists</li>
          <li>Creator emotes the channel has added</li>
          <li>Payouts are not live — this does not invent a wallet balance</li>
        </ul>
        <p className="text-[11px] text-zinc-500">
          {checkout.configured
            ? (checkout.hasLink ? 'Card checkout is ready.' : 'Card checkout is not set up yet. Premium will not charge until it is.')
            : 'Card checkout is not set up on this site yet.'}
        </p>
        {checkout.already ? (
          <p className="text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={!isAuthenticated} onClick={checkout.pay} className="w-full h-11 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40">
            {isAuthenticated ? (checkout.hasLink ? `Pay $${checkout.price}/mo on Stripe` : `Premium $${checkout.price}/mo`) : 'Sign in for premium'}
          </button>
        )}
        {checkout.status && <p className="text-xs text-zinc-400">{checkout.status}</p>}
      </div>
    </div>
  )
}
