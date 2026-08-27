import { useEffect, useMemo, useState } from 'react'
import { Search, Headphones, CreditCard, ShoppingBag } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  pullMarketplaceCatalog,
  cachedProducts,
  startMarketplaceCheckout,
  formatUsdFromCents,
} from '../lib/marketplaceSync'
import {
  productsWithDemo,
  listPaymentMethods,
  savePaymentMethod,
  removePaymentMethod,
  shouldPromptSavePayment,
  clearPaymentSavePrompt,
  markPaymentSavePrompt,
} from '../lib/paymentMethods'
import { redirectSafeUrl } from '../lib/safeUrl'
import { ownCheckoutConfigured } from '../lib/stripeCheckout'
import { membershipReturnPaid } from '../lib/stripeConfig'
import { cn } from '../lib/utils'

const TABS = [
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'support', label: 'Customer service', icon: Headphones },
  { id: 'payments', label: 'Payment methods', icon: CreditCard },
]

export default function ShopPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [tab, setTab] = useState('shop')
  const [products, setProducts] = useState(() => productsWithDemo(cachedProducts()))
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [methodsTick, setMethodsTick] = useState(0)
  const [savePrompt, setSavePrompt] = useState(false)
  const methods = useMemo(
    () => listPaymentMethods(user?.id),
    [user?.id, methodsTick],
  )

  useEffect(() => {
    pullMarketplaceCatalog().then((res) => {
      setProducts(productsWithDemo(res.products || cachedProducts()))
    }).catch(() => {
      setProducts(productsWithDemo(cachedProducts()))
    })
  }, [])

  useEffect(() => {
    if (!user?.id) return
    if (typeof window === 'undefined') return
    if (!membershipReturnPaid({}, window.location.search)) return
    markPaymentSavePrompt(user.id)
    setSavePrompt(true)
  }, [user?.id])

  useEffect(() => {
    if (user?.id && shouldPromptSavePayment(user.id)) setSavePrompt(true)
  }, [user?.id])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const hay = `${p.title || ''} ${p.description || ''} ${p.kind || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [products, query])

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
      markPaymentSavePrompt(user.id)
      redirectSafeUrl(res.url)
      return
    }
    // Demo products without Stripe: simulate paid + ask to save method
    if (String(p.id || '').startsWith('demo_')) {
      markPaymentSavePrompt(user.id)
      setSavePrompt(true)
      setNote('Demo checkout complete. Save a payment method for next time?')
      setTab('payments')
      return
    }
    setNote(res.error || 'Checkout could not start.')
  }

  const acceptSave = () => {
    if (!user?.id) return
    savePaymentMethod(user.id, {
      brand: 'Visa',
      last4: '4242',
      expMonth: 12,
      expYear: new Date().getFullYear() + 3,
      label: 'Visa •••• 4242',
    })
    clearPaymentSavePrompt(user.id)
    setSavePrompt(false)
    setMethodsTick((n) => n + 1)
    setNote('Payment method saved. Wallet and Shop share it.')
  }

  const declineSave = () => {
    if (user?.id) clearPaymentSavePrompt(user.id)
    setSavePrompt(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Shop</h1>
          <p className="text-xs text-zinc-500 mt-1">Creator merch and digital goods. Payment methods sync with Wallet.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('seller')}
          className="h-9 px-3 border border-zinc-700 text-xs text-white hover:bg-white hover:text-black"
        >
          Sell on calabi →
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5',
                tab === t.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {savePrompt ? (
        <div className="border border-sky-800/60 bg-sky-950/30 px-4 py-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-sky-100 flex-1 min-w-[12rem]">Save this payment method for Shop and Wallet?</p>
          <button type="button" onClick={acceptSave} className="h-9 px-3 bg-white text-black text-xs font-semibold">Save</button>
          <button type="button" onClick={declineSave} className="h-9 px-3 border border-zinc-600 text-xs text-zinc-200">Not now</button>
        </div>
      ) : null}

      {tab === 'shop' ? (
        <>
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="w-full h-10 pl-9 pr-3 border border-zinc-700 bg-[#0c0c10] text-sm text-white placeholder:text-zinc-500"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">No products match.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
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
                      disabled={!!busy || (!ownCheckoutConfigured() && !String(p.id).startsWith('demo_'))}
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
        </>
      ) : null}

      {tab === 'orders' ? (
        <div className="border border-zinc-800 bg-[#0c0c10] p-5 space-y-2">
          <p className="text-sm text-white font-medium">Orders</p>
          <p className="text-xs text-zinc-500">Paid shop orders appear here after Stripe returns. Coin pack history stays in Wallet → Orders.</p>
          <button type="button" onClick={() => onNavigate?.('wallet', '', { tab: 'orders' })} className="h-9 px-3 border border-zinc-700 text-xs text-zinc-200">
            Open Wallet orders
          </button>
        </div>
      ) : null}

      {tab === 'support' ? (
        <div className="border border-zinc-800 bg-[#0c0c10] p-5 space-y-3 max-w-xl">
          <p className="text-sm text-white font-medium">Customer service</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Shipping, refunds, and listing issues: email info@calabigroup.com or open Support from the footer.
            Include your order id and @handle.
          </p>
          <button type="button" onClick={() => onNavigate?.('support')} className="h-9 px-3 bg-white text-black text-xs font-semibold">
            Open Support
          </button>
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className="space-y-4 max-w-xl">
          <div className="border border-zinc-800 bg-[#0c0c10] p-5 space-y-3">
            <p className="text-sm text-white font-medium">Saved payment methods</p>
            <p className="text-xs text-zinc-500">Shared with Wallet. We only store brand + last four digits on this device.</p>
            {!isAuthenticated ? (
              <button type="button" onClick={() => onOpenAuth?.()} className="h-9 px-3 bg-white text-black text-xs font-semibold">Sign in</button>
            ) : !methods.length ? (
              <p className="text-xs text-zinc-500">No saved methods yet. After you pay, we ask if you want to save one.</p>
            ) : (
              <ul className="divide-y divide-zinc-800 border border-zinc-800">
                {methods.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-3">
                    <CreditCard className="h-4 w-4 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{m.label}</p>
                      <p className="text-[11px] text-zinc-500">Exp {m.expMonth}/{m.expYear}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removePaymentMethod(user.id, m.id)
                        setMethodsTick((n) => n + 1)
                      }}
                      className="text-[11px] text-zinc-400 hover:text-white"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => onNavigate?.('wallet')} className="text-xs text-sky-300 hover:text-sky-200">
              Manage in Wallet →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
