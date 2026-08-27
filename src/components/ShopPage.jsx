import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  pullMarketplaceCatalog,
  cachedProducts,
  startMarketplaceCheckout,
  formatUsdFromCents,
} from '../lib/marketplaceSync'
import { redirectSafeUrl } from '../lib/safeUrl'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'

export default function ShopPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [products, setProducts] = useState(() => cachedProducts())
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')

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
        <button
          type="button"
          onClick={() => onNavigate?.('seller')}
          className="mt-3 h-9 px-3 border border-zinc-700 text-xs text-white hover:bg-white hover:text-black"
        >
          Sell on calabi →
        </button>
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">No listings yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const ship = p.kind === 'virtual' ? 0 : p.shippingCents
            const list = p.priceCents + ship
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
                  <p className="text-sm font-semibold text-white">{formatUsdFromCents(list)}</p>
                  {ship > 0 ? <p>Includes shipping {formatUsdFromCents(ship)}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={!!busy || !ownCheckoutConfigured()}
                  onClick={() => buy(p)}
                  className="mt-3 h-10 w-full bg-white text-black text-sm font-semibold disabled:opacity-50"
                >
                  {busy === p.id ? 'Opening…' : 'Buy'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
