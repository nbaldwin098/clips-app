import { useState } from 'react'
import { Upload, Radio, Film, Settings, Sparkles } from 'lucide-react'
import { ALGORITHM_META } from '../lib/algorithmEngine'
import { useAuth } from '../context/AuthContext'
import { lsGet } from '../lib/storage'
import CreatorOnboarding from './CreatorOnboarding'

export default function CreatorDashboard({ onOpenImport, onNavigate, onOpenUpload }) {
  const { user } = useAuth()
  const hasPrice = !!lsGet('creator_sub_price', null)?.amount
  const [showOnboarding, setShowOnboarding] = useState(!hasPrice)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Creator Studio</h1>
      <p className="text-sm text-slate-500 mb-6">
        Build fans for yourself — not for a homepage. Follow is free; memberships are optional and 100% of the list price is yours.
      </p>

      {showOnboarding && (
        <CreatorOnboarding
          onOpenImport={onOpenImport}
          onNavigate={onNavigate}
          onDone={() => setShowOnboarding(false)}
        />
      )}

      {!showOnboarding && hasPrice && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-[#EBF4FA]/50 px-4 py-3 text-sm text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <span>
            Membership: <strong>${Number(lsGet('creator_sub_price').amount).toFixed(2)}/mo</strong> ·
            you receive 100% of that price
          </span>
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="text-[#2C729B] text-xs font-medium hover:underline"
          >
            Edit setup
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onOpenImport}
          className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white text-left hover:border-[#2C729B]/40 hover:shadow-md transition-all card-lift"
        >
          <div className="h-10 w-10 rounded-xl bg-[#EBF4FA] flex items-center justify-center text-[#2C729B]">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Import Short (recommended)</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Paste a public link. Metadata + URL only. Source labeled; cross-posts allowed.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenUpload}
          className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white text-left hover:border-[#2C729B]/40 hover:shadow-md transition-all card-lift"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Upload file (optional)</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Only if you need a copy on Clips. Prefer Import to save time and cost.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('settings')}
          className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white text-left hover:border-[#2C729B]/40 hover:shadow-md transition-all card-lift"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Go live</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              RTMP key under Live / Settings. No fake viewer counts.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('wallet')}
          className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white text-left hover:border-[#2C729B]/40 hover:shadow-md transition-all card-lift"
        >
          <div className="h-10 w-10 rounded-xl bg-[#EBF4FA] flex items-center justify-center text-[#2C729B]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Wallet & Stripe</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Real payouts need free backend + secret key next.
            </p>
          </div>
        </button>
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[#2C729B]" />
          <h2 className="text-sm font-semibold text-slate-900">{ALGORITHM_META.name}</h2>
        </div>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          {ALGORITHM_META.principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      {user?.handle && (
        <p className="mt-6 text-xs text-slate-400">Signed in as @{user.handle}</p>
      )}
    </div>
  )
}
