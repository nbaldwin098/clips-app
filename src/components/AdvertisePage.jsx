import { Coins, Heart, Crown, ArrowRight } from 'lucide-react'
import PageHeader from './PageHeader'

export default function AdvertisePage({ onNavigate }) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader title="Monetize on calabi" onBack={() => onNavigate?.('home')} />

      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-6 sm:p-8 space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Earn with tips, membership, and Coins
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Creators keep 80% of tips and premium memberships. Coins power chat cosmetics.
          Brand campaigns can be drafted in the advertiser desk — they do not serve and they do not bill until we turn ads on.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Heart className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Tips</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">Viewers tip on lives and posts. Creators keep 80%.</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Crown className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Premium</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">Paid membership when Stripe checkout is live.</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <Coins className="h-5 w-5 text-white" />
          <h2 className="text-sm font-semibold text-white">Coins</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">Buy packs for chat cosmetics. Orders shows purchase history.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate?.('advertiser-portal')}
          className="inline-flex items-center gap-1.5 h-10 px-4 bg-white text-black text-xs font-bold hover:bg-zinc-200"
        >
          Open advertiser desk <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('wallet')}
          className="inline-flex items-center gap-1.5 h-10 px-4 border border-zinc-700 text-xs text-zinc-200"
        >
          Open Coins
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('creator-apply')}
          className="inline-flex items-center gap-1.5 h-10 px-4 border border-zinc-700 text-xs text-zinc-200"
        >
          Apply to earn
        </button>
      </div>
    </div>
  )
}
