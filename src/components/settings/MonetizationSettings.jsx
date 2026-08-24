import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMembershipPrice, setMembershipPrice } from '../../lib/engagement'
import { adsAreRunning } from '../../lib/adEngine'

export default function MonetizationSettings({ onNavigate }) {
  const { user } = useAuth()
  const approved = user?.creatorStatus === 'approved'
  const [price, setPrice] = useState(() => getMembershipPrice(user?.id))

  useEffect(() => {
    if (!user?.id) return
    setMembershipPrice(user.id, price)
  }, [user?.id, price])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Monetization</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Subscribe is free for anyone. To charge for a post, set a price when you upload. Stripe still has its own Payment Link amount. Views do not pay a dollar rate. Payouts to your bank are not live.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Membership list price</h2>
        <p className="text-[11px] text-zinc-500">Saved as you type.</p>
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
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Earn</h2>
        <p className="text-sm text-zinc-500">
          Anyone can create. You have to apply to earn. Site ads are {adsAreRunning() ? 'on' : 'off'}. There is no ad share in earnings until a pool exists.
        </p>
        {!approved ? (
          <button type="button" onClick={() => onNavigate?.('creator-apply')} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
            Apply to earn
          </button>
        ) : (
          <p className="text-sm text-zinc-500">You are approved. Save where to send money on Wallet. Stripe Connect is not connected, so there is no withdraw button.</p>
        )}
      </section>
    </div>
  )
}
