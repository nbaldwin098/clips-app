import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMembershipPrice, isPremiumSub } from '../lib/engagement'
import { isStripeConfigured, getStripePaymentLink, membershipReturnPaid } from '../lib/stripeConfig'
import { startPremiumCheckout } from '../lib/checkout'
import { stashPendingStripe } from '../lib/tips'
import { openSafeUrl } from '../lib/safeUrl'
import PageHeader from './PageHeader'

export default function CheckoutPage({ onNavigate, creatorId, returnParams = {} }) {
  const { user, isAuthenticated } = useAuth()
  const [status, setStatus] = useState('')
  const target = creatorId || user?.id
  const price = getMembershipPrice(target)
  const already = user && target ? isPremiumSub(user.id, target) : false
  const configured = isStripeConfigured()
  const hasLink = !!getStripePaymentLink()

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !target) return
    const search = typeof window !== 'undefined' ? window.location.search : ''
    if (!membershipReturnPaid(returnParams, search)) return
    setStatus('Stripe sent you back here. Donations, paid posts, and premium only apply if that is what you started — a webhook will confirm the charge later.')
  }, [isAuthenticated, user?.id, target, returnParams])

  const pay = async () => {
    if (!isAuthenticated) {
      setStatus('Sign in first.')
      return
    }
    stashPendingStripe({ kind: 'premium', donorId: user.id, handle: user.handle, creatorId: target })
    const result = await startPremiumCheckout({
      already,
      email: user?.email || '',
      reference: target,
    })
    setStatus(result.message)
    if (result.url) openSafeUrl(result.url)
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Premium" subtitle={`List price $${price}/month`} onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-3xl font-semibold text-white">${price}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Subscriber badge in chat when live chat exists</li>
          <li>Creator emotes the channel has added</li>
          <li>Payouts are not live — this does not invent a wallet balance</li>
        </ul>
        <p className="text-[11px] text-zinc-500">
          {configured
            ? (hasLink ? 'Card checkout is ready.' : 'Card checkout is not set up yet. Subscribe will not charge until it is.')
            : 'Card checkout is not set up on this site yet.'}
        </p>
        {already ? (
          <p className="text-sm text-white">You already have premium on this channel.</p>
        ) : (
          <button type="button" disabled={!isAuthenticated} onClick={pay} className="w-full h-11 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40">
            {isAuthenticated ? (hasLink ? `Pay $${price}/mo on Stripe` : `Subscribe $${price}/mo`) : 'Sign in to subscribe'}
          </button>
        )}
        {status && <p className="text-xs text-zinc-400">{status}</p>}
      </div>
    </div>
  )
}
