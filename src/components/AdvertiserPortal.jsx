import { MegaphoneOff, ArrowRight } from 'lucide-react'
import { FEATURE_ADS } from '../lib/featureFlags'
import PageHeader from './PageHeader'

/**
 * Advertiser portal is retired. No login, no campaign create.
 * Keep the route usable with an honest empty state.
 */
export default function AdvertiserPortal({ onNavigate }) {
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <PageHeader title="Advertiser portal" onBack={() => onNavigate?.('advertise')} />

      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 text-white flex items-center justify-center">
          <MegaphoneOff className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">Ads are not offered</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {FEATURE_ADS
              ? 'Campaign tools are unavailable until ad inventory ships.'
              : 'There is no advertiser login and you cannot create campaigns. Monetization on calabi is tips, premium membership, and Coins — not brand ads.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onNavigate?.('help')}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200"
          >
            Monetization help <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('checkout')}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-zinc-700 text-xs text-zinc-200"
          >
            Buy Coins
          </button>
        </div>
      </div>
    </div>
  )
}
