import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { PREMIUM_PRICE, addPremiumSub } from '../lib/engagement'
import { isStripeConfigured, stripeMode } from '../lib/stripeConfig'
import PageHeader from './PageHeader'

export default function CheckoutPage({ onNavigate, creatorId }) {
  const { user, isAuthenticated } = useAuth()
  const [status, setStatus] = useState('')
  const target = creatorId || user?.id
  const mode = stripeMode()
  const configured = isStripeConfigured()

  const pay = async () => {
    if (!isAuthenticated) return
    setStatus('Processing…')
    addPremiumSub(user.id, target)
    if (configured) {
      setStatus(`Premium active (local). Stripe mode: ${mode}. Add serverless STRIPE_SECRET_KEY to charge cards.`)
    } else {
      setStatus(`Premium recorded at $${PREMIUM_PRICE}/mo on this device. Set VITE_STRIPE_PUBLISHABLE_KEY + server secret to charge.`)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Premium" onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-3xl font-semibold text-white">${PREMIUM_PRICE}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Subscriber badge in chat</li>
          <li>Creator emotes</li>
          <li>Support the channel</li>
        </ul>
        <button type="button" disabled={!isAuthenticated} onClick={pay} className="w-full h-11 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40">
          {isAuthenticated ? `Subscribe $${PREMIUM_PRICE}/mo` : 'Sign in to subscribe'}
        </button>
      </div>
    </div>
  )
}
