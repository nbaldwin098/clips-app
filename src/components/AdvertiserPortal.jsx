import { ArrowRight } from 'lucide-react'
import PageHeader from './PageHeader'

/**
 * Old advertiser-portal bookmarks land here.
 * Redirect people to the monetize explainer — no campaign UI.
 */
export default function AdvertiserPortal({ onNavigate }) {
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <PageHeader title="Advertiser portal" onBack={() => onNavigate?.('advertise')} />

      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">This portal is closed</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Brand ad campaigns are not available. Creators monetize with tips, premium membership,
          and Coins. Open Monetize for the full picture.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('advertise')}
            className="inline-flex items-center gap-1.5 h-10 px-4 bg-white text-black text-xs font-bold hover:bg-zinc-200"
          >
            Monetize on calabi <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('wallet')}
            className="inline-flex items-center gap-1.5 h-10 px-4 border border-zinc-700 text-xs text-zinc-200"
          >
            Open Coins
          </button>
        </div>
      </div>
    </div>
  )
}
