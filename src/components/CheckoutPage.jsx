import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getStripePublishableKey } from '../lib/stripeConfig'

export default function CheckoutPage() {
  const { user, isAuthenticated } = useAuth()
  const [price, setPrice] = useState('4.99')
  const key = typeof getStripePublishableKey === 'function' ? getStripePublishableKey() : ''

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto w-full">
      <h1 className="text-lg font-semibold text-zinc-100">Checkout</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-6">Simple membership payment. Creators set the price; platform takes checkout fees only when wired.</p>

      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <label className="block">
          <span className="text-xs text-zinc-400">Monthly price (USD)</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-zinc-500">$</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1 h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100"
            />
          </div>
        </label>
        <div className="rounded-xl bg-[#0b0b0f] border border-zinc-800 p-4 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>You keep</span>
            <span className="text-zinc-100 font-medium">100% of list price*</span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">*Stripe / processor fees apply when live. Test mode until backend Connect is enabled.</p>
        </div>
        <button
          type="button"
          disabled={!isAuthenticated}
          className="w-full h-11 rounded-lg bg-[#007acc] text-white text-sm font-medium hover:bg-[#0098ff] disabled:opacity-40"
        >
          {isAuthenticated ? `Pay $${price || '0'}` : 'Sign in to continue'}
        </button>
        <p className="text-[10px] text-zinc-600 text-center">
          Stripe key: {key ? 'loaded' : 'not set (VITE_STRIPE_PUBLISHABLE_KEY)'}
        </p>
        {user && <p className="text-[10px] text-zinc-600 text-center">Account: {user.email}</p>}
      </div>
    </div>
  )
}
