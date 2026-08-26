import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  pullMarketplaceCatalog,
  cachedProducts,
  startMarketplaceCheckout,
  calcPlatformFeeCents,
  PLATFORM_FEE_EXPLAINER,
  formatUsdFromCents,
} from '../lib/marketplaceSync'
import { redirectSafeUrl } from '../lib/safeUrl'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'

export default function ShopPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [products, setProducts] = useState(() => cachedProducts())
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [feeOpen, setFeeOpen] = useState(null)

  useEffect(() => {
    pullMarketplaceCatalog().then((res) => {
      if (res.products) setProducts(res.products)
    }).catch(() => {})
  }, [])

  const buy = async (p) => {
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    setBusy(p.id)
    setNote('')
    const res = await startMarketplaceCheckout({ buyer: user, product: p })
    setBusy('')
    if (res.url) {
      redirectSafeUrl(res.url)
      return
    }
    setNote(res.error || 'Checkout could not start.')
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Shop</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Physical and virtual products from creators and businesses. Paid with Stripe. Orders live in the cloud.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('seller')}
          className="mt-3 h-9 px-3 border border-zinc-700 text-xs text-white hover:bg-white hover:text-black"
        >
          Sell on calabi →
        </button>
      </div>

      {!ownCheckoutConfigured() ? (
        <p className="text-xs text-amber-400">
          Own Stripe Checkout needs Supabase env vars + the create-checkout-session Edge Function deployed.
        </p>
      ) : null}

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">No listings yet. Approved sellers add products in Seller portal.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const fee = calcPlatformFeeCents(p.priceCents + (p.kind === 'virtual' ? 0 : p.shippingCents))
            const ship = p.kind === 'virtual' ? 0 : p.shippingCents
            const total = p.priceCents + ship + fee
            return (
              <div key={p.id} className="border border-zinc-800 bg-[#0c0c10] p-4 flex flex-col">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-full h-36 object-cover mb-3 bg-zinc-900" />
                ) : (
                  <div className="w-full h-36 mb-3 bg-zinc-900 flex items-center justify-center text-xs text-zinc-600">
                    {p.kind === 'virtual' ? 'Virtual' : 'Physical'}
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{p.kind}</p>
                <p className="text-sm font-semibold text-white mt-1">{p.title}</p>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.description}</p>
                <div className="mt-auto pt-3 space-y-1 text-xs text-zinc-400">
                  <p>Item {formatUsdFromCents(p.priceCents)}</p>
                  {ship > 0 ? <p>Shipping {formatUsdFromCents(ship)}</p> : null}
                  <p className="flex items-center gap-1">
                    Platform fee {formatUsdFromCents(fee)}
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[10px] text-white"
                      title={PLATFORM_FEE_EXPLAINER}
                      onClick={() => setFeeOpen(feeOpen === p.id ? null : p.id)}
                      aria-label="Platform fee info"
                    >
                      ?
                    </button>
                  </p>
                  {feeOpen === p.id ? (
                    <p className="text-[11px] text-sky-300/90 leading-relaxed">{PLATFORM_FEE_EXPLAINER}</p>
                  ) : null}
                  <p className="text-sm font-semibold text-white pt-1">Total {formatUsdFromCents(total)}</p>
                </div>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => buy(p)}
                  className="mt-3 h-10 w-full bg-white text-black text-sm font-semibold disabled:opacity-50"
                >
                  {busy === p.id ? 'Opening Stripe…' : 'Buy with Stripe'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
