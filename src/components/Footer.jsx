import BrandMark from './BrandMark'
import { FEATURE_ADS } from '../lib/featureFlags'

export default function Footer({ onNavigate }) {
  const link = (label, view) => (
    <button
      key={label}
      type="button"
      onClick={() => onNavigate?.(view)}
      className="text-xs text-zinc-500 hover:text-white transition-colors"
    >
      {label}
    </button>
  )

  return (
    <footer className="border-t border-zinc-800 bg-[#000000] mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <BrandMark size={28} withWord />
            <p className="text-xs text-[#aaa] max-w-xs leading-relaxed mt-2">
              Video, clips, and pics. Follow is free. Premium membership is for livestream only. Pay only after Stripe.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2">
            {link('About', 'about')}
            {link('Create', 'create')}
            {FEATURE_ADS
              ? link('Advertise', 'advertise')
              : link('Monetize', 'advertise')}
            {link('Coins', 'wallet')}
            {link('Help', 'help')}
            {link('Support', 'support')}
            {link('Terms of Service', 'legal-tos')}
            {link('Privacy Policy', 'legal-privacy')}
            {link('Creator Agreement', 'legal-creator')}
            {link('Community Guidelines', 'legal-community')}
            {link('Copyright & DMCA', 'content-rules')}
          </div>
        </div>
        <p className="mt-8 text-[11px] text-zinc-600">
          © {new Date().getFullYear()} calabi
        </p>
      </div>
    </footer>
  )
}
