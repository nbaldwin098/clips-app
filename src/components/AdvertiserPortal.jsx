import { useEffect, useState } from 'react'
import { Megaphone, Plus, Wallet, LayoutDashboard, Pencil, Home } from 'lucide-react'
import { lsGet, lsSet } from '../lib/storage'

const PLACEMENTS = [
  { id: 'home', label: 'Home feed', hint: 'Between recommended rows. Off until ads are enabled.' },
  { id: 'live', label: 'Live lobby', hint: 'Never covers the stream. Tiny PiP if a break runs.' },
  { id: 'watch', label: 'Watch', hint: 'Pre-roll only when ads are on. Skip stays honest.' },
]

function Card({ title, children, onClick }) {
  const inner = (
    <>
      {title ? <h2 className="px-4 pt-3.5 text-[13px] font-semibold text-zinc-100">{title}</h2> : null}
      <div className="p-4 pt-3">{children}</div>
    </>
  )
  const cls = 'rounded-xl border border-white/10 bg-[#141414] text-left w-full'
  if (onClick) {
    return <button type="button" onClick={onClick} className={`${cls} hover:bg-[#1a1a1a]`}>{inner}</button>
  }
  return <section className={cls}>{inner}</section>
}

export default function AdvertiserPortal() {
  const [tab, setTab] = useState('home')
  const [name, setName] = useState('')
  const [placement, setPlacement] = useState('home')
  const [budget, setBudget] = useState('')
  const [brand, setBrand] = useState(() => lsGet('calabi_ad_brand', ''))
  const [campaigns, setCampaigns] = useState(() => lsGet('calabi_ad_campaigns', []))
  const [note, setNote] = useState('')

  useEffect(() => { lsSet('calabi_ad_campaigns', campaigns) }, [campaigns])
  useEffect(() => { lsSet('calabi_ad_brand', brand) }, [brand])

  const nav = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'create', label: 'New campaign', icon: Plus },
    { id: 'list', label: 'Drafts', icon: Megaphone },
    { id: 'places', label: 'Placements', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing', icon: Wallet },
    { id: 'brand', label: 'Brand', icon: Pencil },
  ]

  const saveDraft = (e) => {
    e.preventDefault()
    const n = String(name || '').trim()
    if (!n) return
    setCampaigns((c) => [
      { id: String(Date.now()), name: n, placement, budget: budget || '0', status: 'draft' },
      ...c,
    ])
    setName('')
    setBudget('')
    setNote('Draft saved. Nothing is billed. Public ads are not serving.')
    setTab('list')
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0b0b0b] text-zinc-200 flex" data-dash="calabi">
      <aside className="hidden sm:flex w-52 shrink-0 flex-col border-r border-white/10 bg-[#0e0e12] py-4">
        <nav className="space-y-0.5 px-2">
          {nav.map((item) => {
            const Icon = item.icon
            const on = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2 h-9 px-3 text-sm rounded-lg ${on ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="sm:hidden border-b border-white/10 px-3 py-2">
          <select value={tab} onChange={(e) => setTab(e.target.value)} className="w-full h-10 border border-white/10 bg-black px-2 text-sm rounded-lg">
            {nav.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
          {tab === 'home' ? (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight text-zinc-100">Advertise</h1>
              <p className="text-[13px] text-zinc-500">Draft campaigns. Spend stays $0. The public site does not inject ads until we turn that on.</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card onClick={() => setTab('billing')}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Spend</p>
                  <p className="mt-2 text-[28px] font-semibold tabular-nums">$0.00</p>
                </Card>
                <Card onClick={() => setTab('list')}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Drafts</p>
                  <p className="mt-2 text-[28px] font-semibold tabular-nums">{campaigns.length}</p>
                </Card>
                <Card>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Impressions</p>
                  <p className="mt-2 text-[28px] font-semibold tabular-nums">0</p>
                </Card>
                <Card>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Clicks</p>
                  <p className="mt-2 text-[28px] font-semibold tabular-nums">0</p>
                </Card>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <Card title="New campaign" onClick={() => setTab('create')}>
                  <p className="text-[13px] text-zinc-500">Name, placement, budget. Saved as a draft only.</p>
                </Card>
                <Card title="Placements" onClick={() => setTab('places')}>
                  <p className="text-[13px] text-zinc-500">Home, Live, Watch — black, never over a live PiP.</p>
                </Card>
                <Card title="Billing" onClick={() => setTab('billing')}>
                  <p className="text-[13px] text-zinc-500">No card on file.</p>
                </Card>
              </div>
            </>
          ) : null}

          {tab === 'create' ? (
            <form className="max-w-lg space-y-3" onSubmit={saveDraft}>
              <h1 className="text-[26px] font-semibold">New campaign</h1>
              <Card>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-zinc-500">Name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm" placeholder="Spring drop" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-zinc-500">Placement</span>
                    <select value={placement} onChange={(e) => setPlacement(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm">
                      {PLACEMENTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-zinc-500">Daily budget (USD)</span>
                    <input value={budget} onChange={(e) => setBudget(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm" placeholder="0" />
                  </label>
                  <button type="submit" className="h-10 px-4 rounded-lg bg-white text-black text-sm font-semibold">Save draft</button>
                  {note ? <p className="text-xs text-zinc-500">{note}</p> : null}
                </div>
              </Card>
            </form>
          ) : null}

          {tab === 'list' ? (
            <div className="max-w-lg space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-[26px] font-semibold">Drafts</h1>
                <button type="button" onClick={() => setTab('create')} className="h-10 px-3 rounded-lg border border-white/10 text-sm">New</button>
              </div>
              <Card>
                {campaigns.length === 0 ? (
                  <p className="text-[13px] text-zinc-500">No drafts.</p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {campaigns.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                        <span>{c.name} · {c.placement} · ${c.budget}/day · {c.status}</span>
                        <button type="button" className="text-xs text-zinc-500" onClick={() => setCampaigns((x) => x.filter((r) => r.id !== c.id))}>Delete</button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          ) : null}

          {tab === 'places' ? (
            <div className="max-w-lg space-y-3">
              <h1 className="text-[26px] font-semibold">Placements</h1>
              {PLACEMENTS.map((p) => (
                <Card key={p.id} title={p.label}>
                  <p className="text-[13px] text-zinc-500">{p.hint}</p>
                </Card>
              ))}
            </div>
          ) : null}

          {tab === 'billing' ? (
            <div className="max-w-lg space-y-3">
              <h1 className="text-[26px] font-semibold">Billing</h1>
              <Card>
                <p className="text-[32px] font-semibold tabular-nums">$0.00</p>
                <p className="mt-2 text-[13px] text-zinc-500">No charges. Connect Stripe when ads go live — not before.</p>
              </Card>
            </div>
          ) : null}

          {tab === 'brand' ? (
            <div className="max-w-lg space-y-3">
              <h1 className="text-[26px] font-semibold">Brand</h1>
              <Card>
                <label className="block">
                  <span className="mb-1 block text-xs text-zinc-500">Advertiser name</span>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm" placeholder="Your brand" />
                </label>
                <p className="mt-2 text-xs text-zinc-500">Saved on this device.</p>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
