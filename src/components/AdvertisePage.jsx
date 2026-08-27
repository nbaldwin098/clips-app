import { Coins, Heart, Crown, ArrowRight } from 'lucide-react'
import { FEATURE_ADS, adsEnabled } from '../lib/featureFlags'
import PageHeader from './PageHeader'

/**
 * Monetization explainer — ads are not offered.
 * Soft brand tone; steers people to tips, premium, and Coins.
 */
export default function AdvertisePage({ onNavigate }) {
  if (FEATURE_ADS || adsEnabled()) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <PageHeader title="Advertise on calabi" onBack={() => onNavigate?.('home')} />
        <p className="text-sm text-zinc-400">Ad inventory is gated off until FEATURE_ADS is enabled.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader title="Monetize on calabi" onBack={() => onNavigate?.('home')} />

      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#181824] via-[#121218] to-[#0d0d12] p-6 sm:p-8 space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Earn with tips, membership, and Coins
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          calabi does not sell brand ad slots or pay RPM. Creators keep 80% of tips and
          premium memberships. Coins power chat cosmetics and viewer actions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Heart className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Tips</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Viewers tip on lives and posts. Creators keep 80%.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Crown className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Premium</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Paid livestream membership when Stripe checkout is live.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Coins className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Coins</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Buy packs for chat cosmetics. Orders shows purchase history.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate?.('wallet')}
          className="inline-flex items-center gap-1.5 h-10 px-4 bg-white text-black text-xs font-bold hover:bg-zinc-200"
        >
          Open Coins <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('help')}
          className="inline-flex items-center gap-1.5 h-10 px-4 border border-zinc-700 text-xs text-zinc-200 hover:text-white"
        >
          How it works
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('creator-apply')}
          className="inline-flex items-center gap-1.5 h-10 px-4 border border-zinc-700 text-xs text-zinc-200 hover:text-white"
        >
          Apply to earn
        </button>
      </div>
    </div>
  )
}
