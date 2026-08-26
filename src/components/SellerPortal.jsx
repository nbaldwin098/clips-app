import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  applyAsSeller,
  pullMySeller,
  listSellerProducts,
  upsertProduct,
  pullOrdersForUser,
  submitTracking,
  markDelivered,
  formatUsdFromCents,
} from '../lib/marketplaceSync'

export default function SellerPortal({ onOpenAuth, onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const [kind, setKind] = useState('creator')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [payoutEmail, setPayoutEmail] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [productKind, setProductKind] = useState('physical')
  const [price, setPrice] = useState('19.99')
  const [shipping, setShipping] = useState('5.00')

  const refresh = async () => {
    if (!user?.id) return
    const s = await pullMySeller(user.id)
    setSeller(s)
    if (s?.status === 'approved') {
      setProducts(await listSellerProducts(user.id))
    }
    const o = await pullOrdersForUser(user.id)
    setOrders((o.orders || []).filter((r) => r.sellerId === user.id))
  }

  useEffect(() => {
    refresh().catch(() => {})
  }, [user?.id])

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-white">Seller portal</h1>
        <p className="text-sm text-zinc-400 mt-2">Sign in with your cloud account to apply and manage listings.</p>
        <button type="button" onClick={onOpenAuth} className="mt-4 h-10 px-4 bg-white text-black text-sm font-semibold">Sign in</button>
      </div>
    )
  }

  const onApply = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await applyAsSeller({
      userId: user.id,
      kind,
      displayName: displayName || user.displayName || user.handle,
      bio,
      payoutEmail: payoutEmail || user.email,
    })
    setBusy(false)
    setNote(res.ok ? 'Application submitted to cloud. Staff will review in Admin.' : (res.error || 'Failed'))
    await refresh()
  }

  const onAddProduct = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await upsertProduct(user.id, {
      title,
      description,
      kind: productKind,
      priceCents: Math.round(Number(price) * 100),
      shippingCents: productKind === 'virtual' ? 0 : Math.round(Number(shipping) * 100),
    })
    setBusy(false)
    setNote(res.ok ? 'Product saved on cloud.' : (res.error || 'Failed'))
    if (res.ok) {
      setTitle('')
      setDescription('')
      await refresh()
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Seller portal</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Apply as a user, creator, or business. Listings and orders sync through Supabase — never this device alone.
        </p>
        <button type="button" onClick={() => onNavigate?.('shop')} className="mt-2 text-xs text-zinc-400 underline">Browse shop</button>
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {!seller ? (
        <form onSubmit={onApply} className="border border-zinc-800 bg-[#0c0c10] p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Apply to sell</p>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full h-10 border border-zinc-800 bg-black px-2 text-sm text-white">
            <option value="user">User</option>
            <option value="creator">Creator</option>
            <option value="business">Business</option>
          </select>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Store / display name" className="w-full h-10 border border-zinc-800 bg-black px-3 text-sm text-white" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="What you sell" className="w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-white" />
          <input value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} placeholder="Payout email" className="w-full h-10 border border-zinc-800 bg-black px-3 text-sm text-white" />
          <button type="submit" disabled={busy} className="h-10 px-4 bg-white text-black text-sm font-semibold">Submit application</button>
        </form>
      ) : (
        <div className="border border-zinc-800 bg-[#0c0c10] p-4 text-sm text-zinc-300">
          Status: <span className="text-white font-semibold">{seller.status}</span> · {seller.kind} · {seller.displayName}
          {seller.status === 'pending' ? <p className="text-xs text-zinc-500 mt-2">Waiting for admin approval.</p> : null}
        </div>
      )}

      {seller?.status === 'approved' ? (
        <>
          <form onSubmit={onAddProduct} className="border border-zinc-800 bg-[#0c0c10] p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Add product</p>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full h-10 border border-zinc-800 bg-black px-3 text-sm text-white" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description" className="w-full border border-zinc-800 bg-black px-3 py-2 text-sm text-white" />
            <select value={productKind} onChange={(e) => setProductKind(e.target.value)} className="w-full h-10 border border-zinc-800 bg-black px-2 text-sm text-white">
              <option value="physical">Physical</option>
              <option value="virtual">Virtual</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-500">Price (USD)
                <input value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full h-10 border border-zinc-800 bg-black px-2 text-sm text-white" />
              </label>
              {productKind === 'physical' ? (
                <label className="text-xs text-zinc-500">Shipping (USD)
                  <input value={shipping} onChange={(e) => setShipping(e.target.value)} className="mt-1 w-full h-10 border border-zinc-800 bg-black px-2 text-sm text-white" />
                </label>
              ) : null}
            </div>
            <button type="submit" disabled={busy} className="h-10 px-4 bg-white text-black text-sm font-semibold">Save product</button>
          </form>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Your listings</p>
            {products.length === 0 ? <p className="text-xs text-zinc-500">No products yet.</p> : products.map((p) => (
              <div key={p.id} className="border border-zinc-800 px-3 py-2 text-sm text-zinc-300 flex justify-between gap-2">
                <span>{p.title} · {p.kind}</span>
                <span className="text-white">{formatUsdFromCents(p.priceCents)}{p.shippingCents ? ` + ship ${formatUsdFromCents(p.shippingCents)}` : ''}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Orders</p>
            <p className="text-[11px] text-zinc-500">Physical: submit tracking. Funds release 7 days after delivered. Buyer has 7 days to contact support.</p>
            {orders.length === 0 ? <p className="text-xs text-zinc-500">No orders yet.</p> : orders.map((o) => (
              <OrderRow key={o.id} order={o} sellerId={user.id} onDone={refresh} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function OrderRow({ order, sellerId, onDone }) {
  const [tracking, setTracking] = useState(order.trackingNumber || '')
  const [msg, setMsg] = useState('')
  return (
    <div className="border border-zinc-800 px-3 py-3 text-xs text-zinc-400 space-y-2">
      <p className="text-sm text-white">{order.productTitle}</p>
      <p>{order.status} · total {formatUsdFromCents(order.totalCents)} · fee {formatUsdFromCents(order.platformFeeCents)}</p>
      {order.kind === 'physical' && (order.status === 'paid' || order.status === 'shipped') ? (
        <div className="flex flex-wrap gap-2">
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="h-9 flex-1 min-w-[10rem] border border-zinc-800 bg-black px-2 text-white" />
          <button
            type="button"
            className="h-9 px-3 bg-white text-black font-semibold"
            onClick={async () => {
              const res = await submitTracking(order.id, sellerId, { trackingNumber: tracking })
              setMsg(res.ok ? 'Tracking saved on cloud.' : (res.error || 'Failed'))
              onDone?.()
            }}
          >
            Submit tracking
          </button>
          {order.status === 'shipped' ? (
            <button
              type="button"
              className="h-9 px-3 border border-zinc-600 text-white"
              onClick={async () => {
                const res = await markDelivered(order.id, sellerId)
                setMsg(res.ok ? `Delivered. Release ${res.releaseAt?.slice(0, 10)}. Buyer dispute until ${res.disputeDeadline?.slice(0, 10)}.` : (res.error || 'Failed'))
                onDone?.()
              }}
            >
              Mark delivered
            </button>
          ) : null}
        </div>
      ) : null}
      {msg ? <p className="text-amber-400">{msg}</p> : null}
    </div>
  )
}
