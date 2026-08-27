import { Coins, Heart, Crown, ArrowRight } from 'lucide-react'
import { FEATURE_ADS, adsEnabled } from '../lib/featureFlags'
import PageHeader from './PageHeader'

/**
 * Ads are not offered. Route stays usable (not a 404) and steers
 * creators / brands toward tips, premium membership, and Coins.
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
      <PageHeader title="Ads are not offered" onBack={() => onNavigate?.('home')} />

      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-6 sm:p-8 space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          We do not sell ad inventory
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          There are no in-stream, clip, pic, or live ads on calabi. We do not run AdSense,
          brand campaigns, or an advertiser portal. Creators earn through tips, premium
          membership, and Coins — not ad RPM.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Heart className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Tips</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Viewers tip creators on lives and posts. Creators keep 80%.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Crown className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Premium</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Paid livestream membership when Stripe is connected. Same 80/20 split.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Coins className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Coins</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Buy Coins packs to tip and unlock viewer actions. No ad spend.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate?.('help')}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200"
        >
          How monetization works <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('checkout')}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-200 hover:text-white"
        >
          Buy Coins
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('creator-apply')}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-200 hover:text-white"
        >
          Creator earnings
        </button>
      </div>
    </div>
  )
}
