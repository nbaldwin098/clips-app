import { useState } from 'react'
import { buildCheckout } from '../../lib/financialLedger'

export default function MonetizationSettings() {
  const [tier1, setTier1] = useState(4.99)
  const [tier2, setTier2] = useState(9.99)
  const [tier3, setTier3] = useState(24.99)
  const example = buildCheckout(tier1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Monetization</h1>
        <p className="mt-1 text-sm text-slate-500">Subscription tiers, 90/10 ad pool, and payout routing.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Subscription tiers</h2>
        <p className="text-xs text-slate-500">100% of the listed price goes to you. Processing fee is charged on top to the buyer.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: 'Tier 1', value: tier1, set: setTier1 },
            { label: 'Tier 2', value: tier2, set: setTier2 },
            { label: 'Tier 3', value: tier3, set: setTier3 },
          ].map(t => (
            <label key={t.label} className="block rounded-lg border border-slate-200 p-3">
              <span className="text-xs font-medium text-slate-500">{t.label}</span>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-sm text-slate-500">$</span>
                <input type="number" step="0.01" min="1" value={t.value} onChange={e => t.set(Number(e.target.value))} className="w-full h-9 rounded border border-slate-200 px-2 text-sm" />
              </div>
            </label>
          ))}
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm space-y-1 max-w-sm">
          <div className="flex justify-between"><span className="text-slate-500">You receive</span><span className="font-medium">${example.creatorReceives.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Buyer fee</span><span className="font-medium">${example.buyerFee.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="font-medium">Buyer pays</span><span className="font-semibold">${example.totalCharged.toFixed(2)}</span></div>
        </div>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">90 / 10 Ad revenue pool</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Platform aggregates ad revenue monthly. 90% is distributed to creators by verified impression share.
          10% is retained by the platform. Follower count does not affect allocation.
        </p>
        <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
          No impressions recorded yet. Metrics appear after real traffic and ad delivery begin.
        </div>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Payout destination</h2>
        <p className="text-sm text-slate-500">Connect Stripe or bank details for withdrawals. Integration pending production keys.</p>
        <button className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">Connect payout method</button>
      </section>
    </div>
  )
}
