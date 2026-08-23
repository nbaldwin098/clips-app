import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  getActivePromotion, isPromoDismissed, dismissPromotion, recordPromoClick, subscribePromos,
} from '../lib/promotions'

export default function PromoBanner({ onNavigate, onOpenWatch }) {
  const [promo, setPromo] = useState(() => getActivePromotion())
  const [tick, setTick] = useState(0)

  useEffect(() => subscribePromos(() => setTick((n) => n + 1)), [])
  useEffect(() => {
    setPromo(getActivePromotion())
  }, [tick])

  if (!promo || promo.placement === 'home') return null
  if (isPromoDismissed(promo.id)) return null

  const go = () => {
    recordPromoClick(promo.id)
    if (promo.destView === 'watch' && (promo.destId || promo.featureContentId)) {
      onOpenWatch?.(promo.destId || promo.featureContentId)
      return
    }
    onNavigate?.(promo.destView || 'home', promo.destId || '')
  }

  return (
    <div className="border-b border-[#2a2a34] bg-[#14141b]">
      <div className="max-w-[1200px] mx-auto px-3 py-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{promo.headline}</p>
          {promo.body ? <p className="text-[11px] text-zinc-400 truncate">{promo.body}</p> : null}
        </div>
        <button type="button" onClick={go} className="shrink-0 h-8 px-3 rounded-lg bg-white text-black text-xs font-bold">
          {promo.ctaLabel || 'Open'}
        </button>
        <button
          type="button"
          onClick={() => { dismissPromotion(promo.id); setTick((n) => n + 1) }}
          className="shrink-0 h-8 w-8 rounded-lg text-zinc-500 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 mx-auto" />
        </button>
      </div>
    </div>
  )
}
