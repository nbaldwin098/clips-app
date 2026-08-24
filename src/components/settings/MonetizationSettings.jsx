import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMembershipPrice, setMembershipPrice } from '../../lib/engagement'
import { creatorBalance } from '../../lib/payouts'
import { adsAreRunning } from '../../lib/adEngine'

export default function MonetizationSettings() {
  const { user } = useAuth()
  const [price, setPrice] = useState(() => getMembershipPrice(user?.id))
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Monetization</h1>
        <p className="mt-1 text-sm text-zinc-500">
          List price is what checkout shows. Stripe still has its own Payment Link amount. Payouts to your bank are not live.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Membership list price</h2>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-400">USD per month ($1–$50)</span>
          <input
            type="number"
            min="1"
            max="50"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100"
          />
        </label>
        <button
          type="button"
          className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium"
          onClick={() => {
            if (user?.id) setPrice(setMembershipPrice(user.id, price))
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }}
        >
          {saved ? 'Saved' : 'Save list price'}
        </button>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">View RPM</h2>
        <p className="text-sm text-zinc-500">
          ${creatorBalance(user?.id, user?.handle).rpm} per 1,000 views (set in Admin). Wallet shows earned and pending. Payouts are marked sent by hand — not Stripe Connect.
        </p>
        <p className="text-sm text-zinc-500">
          Site ads are {adsAreRunning() ? 'on' : 'off'}. There is no ad share in earnings until a pool exists.
        </p>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Payouts</h2>
        <p className="text-sm text-zinc-500">
          Save where to send money on Wallet. Stripe Connect is not connected, so there is no withdraw button.
        </p>
      </section>
    </div>
  )
}
