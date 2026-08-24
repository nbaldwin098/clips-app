import BrandMark from './BrandMark'

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
            <div className="mb-2">
            <BrandMark size={28} />
            </div>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Video, clips, and pics. Follow the creator. Pay only after Stripe.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2">
            {link('About', 'about')}
            {link('Create', 'creator-apply')}
            {link('Advertise', 'advertise')}
            {link('Help', 'help')}
            {link('Terms of Service', 'legal-tos')}
            {link('Privacy Policy', 'legal-privacy')}
            {link('Creator Agreement', 'legal-creator')}
            {link('Community Guidelines', 'legal-community')}
            {link('Copyright & DMCA', 'help')}
          </div>
        </div>
        <p className="mt-8 text-[11px] text-zinc-600">
          © {new Date().getFullYear()} Clips. No fabricated content.
        </p>
      </div>
    </footer>
  )
}
