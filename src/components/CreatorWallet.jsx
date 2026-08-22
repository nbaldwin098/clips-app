import { buildCheckout } from '../lib/financialLedger'
import { DollarSign, Users, TrendingUp, CreditCard } from 'lucide-react'

export default function CreatorWallet() {
  const subCheckout = buildCheckout(4.99)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Creator wallet</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <TrendingUp className="h-4 w-4" />
            Ad impressions (month)
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <DollarSign className="h-4 w-4" />
            Estimated ad revenue (90%)
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">$0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Users className="h-4 w-4" />
            Active subscribers
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <CreditCard className="h-4 w-4" />
            Pending payout
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">$0</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Ad revenue split (90 / 10)</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Platform aggregates total ad revenue each month. 90% of the pool is distributed to creators
          in proportion to verified ad impressions. 10% is retained by the platform. Follower count
          does not affect the allocation. No impressions recorded yet.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Subscription checkout example</h2>
        <p className="text-sm text-slate-600 mb-4">
          Creator sets the price. 100% of that price is paid to the creator. A transparent processing
          fee is added on top and charged to the buyer.
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
