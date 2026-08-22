export default function Footer({ onNavigate }) {
  const link = (label, view) => (
    <button
      key={label}
      onClick={() => onNavigate?.(view)}
      className="text-xs text-slate-500 hover:text-[#2C729B] transition-colors"
    >
      {label}
    </button>
  )

  return (
    <footer className="border-t border-slate-200/80 bg-white mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-[#2C729B] text-white text-xs font-bold flex items-center justify-center">
                C
              </div>
              <span className="font-semibold text-slate-900">Clips</span>
            </div>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Shorts, live, and long-form. Meritocratic discovery. Creators keep 100% of subscriptions.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2">
            {link('About', 'about')}
            {link('Help', 'help')}
            {link('Terms of Service', 'legal-tos')}
            {link('Privacy Policy', 'legal-privacy')}
            {link('Creator Agreement', 'legal-creator')}
            {link('Community Guidelines', 'legal-community')}
            {link('Copyright & DMCA', 'settings')}
          </div>
        </div>
        <p className="mt-8 text-[11px] text-slate-400">
          © {new Date().getFullYear()} Clips. Bootstrapped MVP. No fabricated content.
        </p>
      </div>
    </footer>
  )
}
