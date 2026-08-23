import { useAuth } from '../context/AuthContext'
import { isStripeConfigured, stripeMode } from '../lib/stripeConfig'
import PageHeader from './PageHeader'

export default function CreatorWallet({ onNavigate }) {
  const { user } = useAuth()
  const configured = isStripeConfigured()

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Wallet" subtitle="Payouts need Stripe Connect" onBack={() => onNavigate?.('dashboard')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        {configured ? (
          <>
            <p className="text-sm text-zinc-200">Stripe publishable key is set ({stripeMode()}).</p>
            <p className="text-xs text-zinc-500">
              Connect Express and a payouts endpoint are not live. This page will not invent a balance. {user?.email}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-200">Stripe is not connected.</p>
            <p className="text-xs text-zinc-500">
              There is no payout balance to show. Set VITE_STRIPE_PUBLISHABLE_KEY and Stripe Connect before taking or sending money. {user?.email}
            </p>
          </>
        )}
        <button type="button" disabled className="w-full h-10 rounded-lg bg-white/20 text-zinc-400 text-sm">
          Withdraw unavailable
        </button>
        <button type="button" onClick={() => onNavigate?.('checkout')} className="w-full h-10 rounded-lg border border-zinc-700 text-white text-sm">
          Membership checkout
        </button>
      </div>
    </div>
  )
}
