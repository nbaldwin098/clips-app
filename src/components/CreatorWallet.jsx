import { buildCheckout, getEmptyWalletSnapshot } from '../lib/financialLedger'
import { isStripeConfigured, stripeMode } from '../lib/stripeConfig'
import { DollarSign, Users, TrendingUp, CreditCard, Link2 } from 'lucide-react'

export default function CreatorWallet() {
  const subCheckout = buildCheckout(4.99)
  const wallet = getEmptyWalletSnapshot()
  const stripeReady = isStripeConfigured()
  const mode = stripeMode()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Creator wallet</h1>
      <p className="text-sm text-slate-500 mb-6">
        Real balances appear after Stripe Connect and live activity. Numbers below stay at zero until then.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <TrendingUp className="h-4 w-4" />
            Ad impressions (month)
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{wallet.adImpressions}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <DollarSign className="h-4 w-4" />
            Estimated ad revenue (90%)
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">${wallet.estimatedAdRevenue}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Users className="h-4 w-4" />
            Active subscribers
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{wallet.activeSubscribers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <CreditCard className="h-4 w-4" />
            Pending payout
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">${wallet.pendingPayout}</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-[#2C729B]" />
          <h2 className="text-sm font-semibold text-slate-900">Stripe Connect</h2>
        </div>
        {stripeReady ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              Publishable key detected ({mode} mode). Connect onboarding will attach payout accounts when the
              server endpoint is live.
            </p>
            <button
              type="button"
              className="h-10 px-4 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
              onClick={() => {
                alert(
                  'Stripe Connect onboarding requires the backend endpoint. Key is configured — wire POST /billing/connect next.'
                )
              }}
            >
              Connect payout account
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed">
            Add <code className="text-xs bg-slate-100 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> in
            Render environment variables (pk_test_… or pk_live_…). Keep the secret key on the server only —
            never in the frontend repo.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Ad revenue split (90 / 10)</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          90% of the monthly ad pool goes to creators by verified impression share. 10% platform. Follower
          count does not affect allocation.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Subscription checkout example</h2>
        <p className="text-sm text-slate-600 mb-4">
          Creator sets the price and receives 100% of it. Processing fee is added on top for the buyer
          (Stripe).
        </p>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Creator receives</span>
            <span className="font-medium">${subCheckout.creatorReceives.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Buyer processing fee</span>
            <span className="font-medium">${subCheckout.buyerFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="text-slate-700 font-medium">Total charged to buyer</span>
            <span className="font-semibold">${subCheckout.totalCharged.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
