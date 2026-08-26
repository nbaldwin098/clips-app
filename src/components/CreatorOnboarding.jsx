import { useState } from 'react'
import { Check, Copy, Link2, DollarSign, Upload, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { setMembershipPrice } from '../lib/engagement'
import { buildCheckout } from '../lib/financialLedger'

const TIERS = [4.99, 9.99, 14.99]

export default function CreatorOnboarding({ onOpenUpload, onDone, onNavigate }) {
  const { user, saveProfile, enableCreatorMode, switchMode } = useAuth()
  const [step, setStep] = useState(1)
  const [price, setPrice] = useState(4.99)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const handle = user?.handle || 'creator'
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${encodeURIComponent(handle)}`
      : `https://calabi.us/profile/${handle}`

  const checkout = buildCheckout(price)

  const savePrice = async () => {
    setBusy(true)
    try {
      if (user?.id) setMembershipPrice(user.id, Number(price))
      enableCreatorMode()
      switchMode('creator')
      await saveProfile?.({})
      setStep(2)
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 md:p-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Welcome to calabi</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Creator setup · about 60 seconds</p>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 w-8 rounded-full ${step >= n ? 'bg-white' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <DollarSign className="h-4 w-4 text-white" />
            Set monthly membership price
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Fans pay this for premium on your live chat. Processing fee is added on top for them — not taken from your price.
          </p>
          <div className="flex flex-wrap gap-2">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPrice(t)}
                className={`h-10 px-4 rounded-xl text-sm font-medium border transition-colors ${
                  Number(price) === t
                    ? 'bg-white text-black border-white'
                    : 'bg-[#0c0c10] text-zinc-300 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                ${t.toFixed(2)}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-[#0c0c10] border border-zinc-800 p-3 text-xs text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>You receive</span>
              <span className="font-semibold text-white">${checkout.creatorReceives.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Buyer fee (approx)</span>
              <span>${checkout.buyerFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1">
              <span>Buyer pays total</span>
              <span className="font-medium text-white">${checkout.totalCharged.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={savePrice}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
          >
            Save price <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Link2 className="h-4 w-4 text-white" />
            Your share link
          </div>
          <p className="text-xs text-zinc-500">
            Send this to fans. It opens your calabi profile.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 h-10 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-zinc-300"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-zinc-700 text-sm font-medium text-white hover:bg-[#18181f]"
            >
              {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Upload className="h-4 w-4 text-white" />
            Add your first post
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Upload a clip, video, or pic you made — originals only.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenUpload?.('video')
                onDone?.()
              }}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200"
            >
              Upload first post
            </button>
            <button
              type="button"
              onClick={() => {
                onDone?.()
                onNavigate?.('dashboard', 'stream')
              }}
              className="h-10 px-4 rounded-xl border border-zinc-700 text-sm font-medium text-white hover:bg-[#18181f]"
            >
              Stream settings
            </button>
            <button type="button" onClick={() => onDone?.()} className="h-10 px-4 rounded-xl text-sm text-zinc-500 hover:text-white">
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
