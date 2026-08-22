import { useAuth } from '../context/AuthContext'
import { PREMIUM_PRICE, addPremiumSub } from '../lib/engagement'
import { getStripePublishableKey } from '../lib/stripeConfig'
import PageHeader from './PageHeader'

export default function CheckoutPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const key = typeof getStripePublishableKey === 'function' ? getStripePublishableKey() : ''
  const pay = () => {
    if (!isAuthenticated) return
    addPremiumSub(user.id, user.id)
    alert(`Premium at $${PREMIUM_PRICE}/mo recorded (Stripe when Connect is live).`)
  }
  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Premium" subtitle={`Fixed $${PREMIUM_PRICE}/month — not customizable`} onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <p className="text-3xl font-semibold text-[#007ACC]">${PREMIUM_PRICE}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Subscriber badge in chat</li>
          <li>Creator emotes</li>
          <li>Support the channel</li>
        </ul>
        <button type="button" disabled={!isAuthenticated} onClick={pay} className="w-full h-11 rounded-lg bg-[#007ACC] text-white text-sm font-medium disabled:opacity-40">
          {isAuthenticated ? `Subscribe $${PREMIUM_PRICE}/mo` : 'Sign in to subscribe'}
        </button>
        <p className="text-[10px] text-zinc-600 text-center">Stripe key: {key ? 'loaded' : 'not set'}</p>
      </div>
    </div>
  )
}
