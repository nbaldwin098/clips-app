import { useState } from 'react'
import { Check, Copy, Link2, DollarSign, Upload, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'
import { buildCheckout } from '../lib/financialLedger'

const TIERS = [4.99, 9.99, 14.99]

export default function CreatorOnboarding({ onOpenImport, onDone, onNavigate }) {
  const { user, updateProfile, enableCreatorMode, switchMode } = useAuth()
  const [step, setStep] = useState(1)
  const [price, setPrice] = useState(
    () => lsGet('creator_sub_price', null)?.amount || 4.99
  )
  const [copied, setCopied] = useState(false)

  const handle = user?.handle || 'creator'
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?c=${encodeURIComponent(handle)}`
      : `https://clips.app/?c=${handle}`

  const checkout = buildCheckout(price)

  const savePrice = () => {
    lsSet('creator_sub_price', {
      amount: Number(price),
      currency: 'usd',
      updatedAt: new Date().toISOString(),
    })
    enableCreatorMode()
    switchMode('creator')
    updateProfile?.({ isCreator: true, subPrice: Number(price) })
    setStep(2)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="rounded-2xl border border-[#2C729B]/25 bg-white p-5 md:p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Creator setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">About 60 seconds · you keep 100% of the sub price</p>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 w-8 rounded-full ${step >= n ? 'bg-[#2C729B]' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <DollarSign className="h-4 w-4 text-[#2C729B]" />
            Set monthly membership price
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Fans pay this amount to you. Processing fee is added on top for them — not taken from your price.
          </p>
          <div className="flex flex-wrap gap-2">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPrice(t)}
                className={`h-10 px-4 rounded-xl text-sm font-medium border transition-colors ${
                  Number(price) === t
                    ? 'bg-[#2C729B] text-white border-[#2C729B]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#2C729B]/40'
                }`}
              >
                ${t.toFixed(2)}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>You receive</span>
              <span className="font-semibold text-slate-900">${checkout.creatorReceives.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Buyer fee (approx)</span>
              <span>${checkout.buyerFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
              <span>Buyer pays total</span>
              <span className="font-medium">${checkout.totalCharged.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={savePrice}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
          >
            Save price <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Link2 className="h-4 w-4 text-[#2C729B]" />
            Your share link
          </div>
          <p className="text-xs text-slate-500">
            Send this to fans. When accounts are on a real backend, it opens your channel.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Upload className="h-4 w-4 text-[#2C729B]" />
            Add your first clip
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Prefer Import: paste a TikTok / Shorts / Reels link. We store only the link + metadata.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenImport?.()
                onDone?.()
              }}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
            >
              Import first clip
            </button>
            <button
              type="button"
              onClick={() => {
                onDone?.()
                onNavigate?.('settings')
              }}
              className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Stream settings
            </button>
            <button type="button" onClick={() => onDone?.()} className="h-10 px-4 rounded-xl text-sm text-slate-500">
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
