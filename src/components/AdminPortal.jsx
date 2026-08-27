import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Film, ShieldAlert, Wallet, Flag,
  Radio, LifeBuoy, Settings, ClipboardList, ShoppingBag, BarChart3, Newspaper,
  Landmark,
} from 'lucide-react'
import {
  isAdminSession, adminLogin, listApplications, setApplicationStatus,
  listTickets, updateTicket, isPlatformOwner,
} from '../lib/moderation'
import { pullSupportTickets } from '../lib/supportSync'
import {
  listPendingSellerApps, setSellerStatus, pullMarketplaceCatalog, cachedProducts,
  formatUsdFromCents,
} from '../lib/marketplaceSync'
import {
  listCreatorBalances,
  recordManualPayout, listPayoutLedger, getPayoutContact,
} from '../lib/payouts'
import { useAuth } from '../context/AuthContext'
import { ORG } from '../lib/orgConfig'
import { adminOverview, payoutsHeld } from '../lib/trustSafety'
import AdminPromos from './AdminPromos'
import AdminNews from './AdminNews'
import AdminSetup from './AdminSetup'
import AdminPeople from './admin/AdminPeople'
import AdminContent from './admin/AdminContent'
import AdminSafety from './admin/AdminSafety'
import AdminWithdrawPanel from './admin/AdminWithdrawPanel'
import AdminFinancePanel from './admin/AdminFinancePanel'
import { listEscrow, adminReleaseEscrow, adminRefundEscrow } from '../lib/donationEscrow'
import { getCreatorAnalytics } from '../lib/engagement'
import { syncPublicEngagementFromCloud } from '../lib/graphSync'

function AdminEscrowPanel({ onChange }) {
  const rows = listEscrow({ limit: 40 })
  return (
    <div className="rounded-xl border border-white/10 bg-[#111113] p-4 space-y-2">
      <p className="text-sm font-medium text-white">Donation request escrow</p>
      <p className="text-[11px] text-zinc-500">Release Cash after the streamer fulfills the request. 80% to creator.</p>
      {!rows.length ? <p className="text-xs text-zinc-600">No escrow rows.</p> : null}
      {rows.map((r) => (
        <div key={r.id} className="text-xs text-zinc-400 border border-white/5 rounded-lg px-3 py-2 space-y-1">
          <p>{r.units} Cash · @{r.donorHandle} → {r.creatorId} · {r.status}</p>
          <p className="text-zinc-500">{r.requestText}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="underline text-white"
              onClick={() => { adminReleaseEscrow(r.id); onChange?.() }}
            >
              Release
            </button>
            <button
              type="button"
              className="underline"
              onClick={() => { adminRefundEscrow(r.id); onChange?.() }}
            >
              Refund
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'admin', 'cs', 'mod'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['owner', 'admin', 'cs'] },
  { id: 'tickets', label: 'Support desk', icon: LifeBuoy, roles: ['owner', 'admin', 'cs', 'mod'] },
  { id: 'people', label: 'People', icon: Users, roles: ['owner', 'admin', 'cs'] },
  { id: 'content', label: 'Content', icon: Film, roles: ['owner', 'admin', 'mod'] },
  { id: 'safety', label: 'Safety', icon: ShieldAlert, roles: ['owner', 'admin', 'mod'] },
  { id: 'shop', label: 'Marketplace', icon: ShoppingBag, roles: ['owner', 'admin', 'cs'] },
  { id: 'finance', label: 'Finance', icon: Landmark, roles: ['owner', 'admin'] },
  { id: 'payouts', label: 'Payouts', icon: Wallet, roles: ['owner', 'admin'] },
  { id: 'promos', label: 'Promos', icon: Flag, roles: ['owner', 'admin'] },
  { id: 'news', label: 'News', icon: Newspaper, roles: ['owner', 'admin'] },
  { id: 'live', label: 'Live', icon: Radio, roles: ['owner', 'admin', 'mod'] },
  { id: 'applications', label: 'Creator apps', icon: ClipboardList, roles: ['owner', 'admin', 'cs'] },
  { id: 'setup', label: 'Setup', icon: Settings, roles: ['owner', 'admin'] },
]

const ADMIN_UNLOCK_KEY = 'clips_admin_ui_unlocked'

const ADMIN_TAB_IDS = new Set(NAV.map((n) => n.id))

export default function AdminPortal({ initialTab = '' }) {
  const { user, login } = useAuth()
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1' } catch { return false }
  })
  const [identifier, setIdentifier] = useState('kiddnixk@gmail.com')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const authed = unlocked || isAdminSession(user) || isPlatformOwner(user)
  const startTab = ADMIN_TAB_IDS.has(String(initialTab || '')) ? String(initialTab) : 'overview'
  const [tab, setTab] = useState(startTab)
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  useEffect(() => {
    if (ADMIN_TAB_IDS.has(String(initialTab || ''))) setTab(String(initialTab))
  }, [initialTab])
  const [payMsg, setPayMsg] = useState('')
  const [sellerApps, setSellerApps] = useState([])
  const [shopProducts, setShopProducts] = useState([])

  useEffect(() => {
    if (!authed) return
    pullSupportTickets().then(() => refresh()).catch(() => {})
    syncPublicEngagementFromCloud().catch(() => {})
    listPendingSellerApps().then(setSellerApps).catch(() => {})
    pullMarketplaceCatalog().then((r) => setShopProducts(r.products || cachedProducts())).catch(() => {})
  }, [authed])

  const [payUser, setPayUser] = useState('')
  const [payAmt, setPayAmt] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payVia, setPayVia] = useState('paypal')

  const markUnlocked = () => {
    try { sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1') } catch {}
    setUnlocked(true)
  }

  const onUnlock = async (e) => {
    e?.preventDefault?.()
    setErr('')
    setBusy(true)
    try {
      let u = user
      if (!isPlatformOwner(u)) {
        const id = identifier.trim()
        const pass = password
        if (!id || !pass) {
          setErr('Enter kiddnixk@gmail.com (or kiddnixk) and your cloud password, then press Unlock.')
          return
        }
        if (String(pass).trim().length < 6) {
          setErr('Password must be at least 6 characters.')
          return
        }
        const next = await Promise.race([
          login({ email: id, password: pass }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sign-in timed out. Check your connection and try again.')), 20000)),
        ])
        u = next || null
      }
      if (!u) {
        setErr('Sign-in failed. Use Forgot password on the main site sign-in if needed.')
        return
      }
      if (!isPlatformOwner(u)) {
        setErr('Signed in, but that account is not the owner. Use kiddnixk@gmail.com / kiddnixk.')
        return
      }
      const result = await adminLogin(String(code || '').trim(), u)
      if (!result.ok) {
        setErr(result.error || 'Access denied')
        return
      }
      markUnlocked()
    } catch (ex) {
      setErr(ex?.message || 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center bg-[#09090b] p-4">
        <form
          onSubmit={onUnlock}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111113] p-6"
        >
          <h1 className="text-lg font-semibold text-white">Admin</h1>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            Sign in as <span className="text-zinc-300">kiddnixk</span> with your Supabase cloud password.
            {user ? (
              <span className="block mt-1 text-zinc-600">
                Currently signed in as @{user.handle || 'user'} — switch to the owner account below.
              </span>
            ) : null}
          </p>
          <label className="block text-xs text-zinc-400 mb-1">Owner email or handle</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full h-10 rounded-lg bg-black border border-white/10 px-3 text-sm text-white mb-3"
            placeholder="kiddnixk@gmail.com"
            autoComplete="username"
            disabled={busy}
          />
          <label className="block text-xs text-zinc-400 mb-1">Cloud password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 rounded-lg bg-black border border-white/10 px-3 text-sm text-white mb-3"
            placeholder="Your Supabase Auth password"
            autoComplete="current-password"
            disabled={busy}
          />
          <label className="block text-xs text-zinc-400 mb-1">Admin code (optional)</label>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-10 rounded-lg bg-black border border-white/10 px-3 text-sm text-white mb-3"
            placeholder="Usually leave blank"
            autoComplete="off"
            disabled={busy}
          />
          {err ? <p className="text-xs text-red-400 mb-2 whitespace-pre-wrap">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-10 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Unlock'}
          </button>
          <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
            If password fails: main Sign in → Forgot password for kiddnixk@gmail.com
            (or cs1@calabi.us), then come back here.
          </p>
        </form>
      </div>
    )
  }

  const stats = adminOverview()
  const apps = listApplications()
  const tickets = listTickets()
  const balances = listCreatorBalances()
  const ledger = listPayoutLedger()

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#09090b] text-white flex">
      <aside className="w-52 shrink-0 border-r border-white/10 bg-[#0b0b0d] py-4">
        <p className="px-4 text-[10px] uppercase tracking-wider text-zinc-500 mb-2">{ORG.productName} admin</p>
        <nav className="space-y-0.5 px-2">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2 h-9 px-3 rounded-lg text-sm ${
                  active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 border-b border-white/10 flex items-center px-5 bg-[#0b0b0d]">
          <div>
            <p className="text-sm font-medium">{NAV.find((n) => n.id === tab)?.label || 'Admin'}</p>
            <p className="text-[10px] text-zinc-500">CS / mod desk · cloud data · {ORG.productName}</p>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === 'overview' && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-500">Queue snapshot for CS: open tickets, seller apps, creator applications.</p>
              <div className="grid sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#111113] p-4">
                  <p className="text-[10px] uppercase text-zinc-500">Open tickets</p>
                  <p className="text-xl font-semibold mt-1">{tickets.filter((t) => t.status !== 'closed').length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#111113] p-4">
                  <p className="text-[10px] uppercase text-zinc-500">Seller apps</p>
                  <p className="text-xl font-semibold mt-1">{sellerApps.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#111113] p-4">
                  <p className="text-[10px] uppercase text-zinc-500">Creator apps</p>
                  <p className="text-xl font-semibold mt-1">{apps.filter((a) => a.status === 'pending').length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#111113] p-4">
                  <p className="text-[10px] uppercase text-zinc-500">Shop listings</p>
                  <p className="text-xl font-semibold mt-1">{shopProducts.length}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {Object.entries(stats || {}).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/10 bg-[#111113] p-4">
                    <p className="text-[10px] uppercase text-zinc-500">{k}</p>
                    <p className="text-xl font-semibold mt-1">{String(v)}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-[#111113] p-4">
                <p className="text-xs text-zinc-500">Payouts held: {payoutsHeld() ? 'yes' : 'no'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="h-9 px-3 bg-white text-black text-xs font-semibold" onClick={() => setTab('tickets')}>Open support desk</button>
                <button type="button" className="h-9 px-3 border border-white/20 text-xs" onClick={() => setTab('shop')}>Marketplace</button>
                <button type="button" className="h-9 px-3 border border-white/20 text-xs" onClick={() => setTab('analytics')}>Analytics</button>
              </div>
            </div>
          )}
          {tab === 'analytics' && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-500">Platform engagement snapshot (cloud tallies when synced).</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {Object.entries(stats || {}).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/10 bg-[#111113] p-4">
                    <p className="text-[10px] uppercase text-zinc-500">{k}</p>
                    <p className="text-xl font-semibold mt-1">{String(v)}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-[#111113] p-4 text-xs text-zinc-400">
                Creator analytics sample (signed-in owner):{' '}
                {(() => {
                  const a = user?.id ? getCreatorAnalytics(user.id) : null
                  if (!a) return 'sign in as owner to see your channel sample'
                  return `${a.subscribers || 0} followers · ${a.premiumSubs || 0} premium · views/likes from cloud tallies`
                })()}
              </div>
            </div>
          )}
          {tab === 'shop' && (
            <div className="p-5 space-y-4">
              <p className="text-sm font-medium text-white">Seller applications</p>
              {!sellerApps.length ? <p className="text-sm text-zinc-500">No pending seller apps.</p> : sellerApps.map((s) => (
                <div key={s.userId} className="rounded-xl border border-white/10 bg-[#111113] p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{s.displayName || s.userId}</p>
                    <p className="text-xs text-zinc-500">{s.kind} · {s.payoutEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs px-2 py-1 rounded bg-white text-black" onClick={async () => { await setSellerStatus(s.userId, 'approved'); setSellerApps(await listPendingSellerApps()); refresh() }}>Approve</button>
                    <button type="button" className="text-xs px-2 py-1 rounded border border-white/20" onClick={async () => { await setSellerStatus(s.userId, 'rejected'); setSellerApps(await listPendingSellerApps()); refresh() }}>Reject</button>
                  </div>
                </div>
              ))}
              <p className="text-sm font-medium text-white pt-2">Active listings ({shopProducts.length})</p>
              {shopProducts.slice(0, 20).map((p) => (
                <div key={p.id} className="text-xs text-zinc-400 border border-white/5 rounded-lg px-3 py-2 flex justify-between">
                  <span>{p.title} · {p.kind}</span>
                  <span>{formatUsdFromCents(p.priceCents)}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'people' && <div className="p-5"><AdminPeople onChange={refresh} /></div>}
          {tab === 'content' && <div className="p-5"><AdminContent onChange={refresh} /></div>}
          {tab === 'safety' && <div className="p-5"><AdminSafety onChange={refresh} /></div>}
          {tab === 'promos' && <div className="p-5"><AdminPromos /></div>}
          {tab === 'news' && <div className="p-5"><AdminNews /></div>}
          {tab === 'setup' && <div className="p-5"><AdminSetup /></div>}
          {tab === 'applications' && (
            <div className="p-5 space-y-2">
              {apps.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-[#111113] p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{a.handle || a.email || a.id}</p>
                    <p className="text-xs text-zinc-500">{a.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs px-2 py-1 rounded bg-white text-black" onClick={() => { setApplicationStatus(a.id, 'approved'); refresh() }}>Approve</button>
                    <button type="button" className="text-xs px-2 py-1 rounded border border-white/20" onClick={() => { setApplicationStatus(a.id, 'rejected'); refresh() }}>Reject</button>
                  </div>
                </div>
              ))}
              {!apps.length ? <p className="text-sm text-zinc-500">No applications</p> : null}
            </div>
          )}
          {tab === 'tickets' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-zinc-400">Support tickets from /support (cloud). Assign, prioritize, close.</p>
                <button type="button" className="text-xs underline" onClick={() => pullSupportTickets().then(() => refresh())}>Refresh</button>
              </div>
              {tickets.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-[#111113] p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{t.subject || t.id}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        @{t.handle || 'user'} · {t.email || '—'} · {t.status} · {String(t.createdAt || '').slice(0, 16)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="text-xs px-2 py-1 rounded border border-white/20" onClick={() => { updateTicket(t.id, { status: 'in_progress' }); refresh() }}>In progress</button>
                      <button type="button" className="text-xs px-2 py-1 rounded bg-white text-black" onClick={() => { updateTicket(t.id, { status: 'closed' }); refresh() }}>Close</button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 whitespace-pre-wrap">{t.body}</p>
                </div>
              ))}
              {!tickets.length ? <p className="text-sm text-zinc-500">No tickets in cloud yet. Run migration 0018, then users submit from Support.</p> : null}
            </div>
          )}
          {tab === 'finance' && <AdminFinancePanel />}
          {tab === 'payouts' && (
            <div className="p-5 space-y-4">
              <p className="text-[11px] text-zinc-500">
                Creators request payouts from Studio → Earnings. Pay them outside Stripe, then mark paid here.
                Manual record below is for hand ledgers / storage notes. For every card charge + fee, open Finance.
              </p>
              <AdminWithdrawPanel />
              <AdminEscrowPanel onChange={refresh} />
              <div className="rounded-xl border border-white/10 bg-[#111113] p-4 space-y-2">
                <p className="text-sm font-medium">Manual payout record</p>
                <input value={payUser} onChange={(e) => setPayUser(e.target.value)} placeholder="User id" className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm" />
                <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder="Gross amount (before storage)" className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm" />
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note" className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm" />
                <select value={payVia} onChange={(e) => setPayVia(e.target.value)} className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm">
                  <option value="paypal">PayPal</option>
                  <option value="bank">Bank</option>
                </select>
                {payMsg ? <p className="text-xs text-zinc-400">{payMsg}</p> : null}
                <button
                  type="button"
                  className="h-9 px-3 rounded bg-white text-black text-sm font-semibold"
                  onClick={() => {
                    const res = recordManualPayout({
                      userId: payUser,
                      amount: Number(payAmt),
                      note: payNote,
                      sentVia: payVia,
                      handle: payUser,
                    })
                    setPayMsg(res?.message || res?.error || '')
                    if (res?.ok) {
                      setPayUser('')
                      setPayAmt('')
                      setPayNote('')
                    }
                    refresh()
                  }}
                >
                  Record
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400">Creators (storage admin-only)</p>
                {balances.map((b) => (
                  <div key={b.userId} className="text-sm border border-white/10 rounded-lg px-3 py-2 space-y-0.5">
                    <div className="flex justify-between gap-2">
                      <span className="truncate">@{b.handle || b.userId}</span>
                      <span className="text-zinc-400">paid ${Number(b.paid || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Storage {b.storageBytesLabel || '0 B'} · ~${Number(b.storageMonthlyUsd || 0).toFixed(2)}/mo
                      {Number(b.storageDueUsd) > 0 ? ` · due $${Number(b.storageDueUsd).toFixed(2)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">Ledger</p>
                {ledger.slice(0, 30).map((row) => (
                  <p key={row.id} className="text-xs text-zinc-500">
                    {row.handle || row.userId}
                    {' · '}
                    {row.kind === 'storage' ? 'storage' : 'paid'}
                    {' $'}{Number(row.amount || 0).toFixed(2)}
                    {row.storageDeducted ? ` (storage −$${Number(row.storageDeducted).toFixed(2)})` : ''}
                    {row.note ? ` · ${row.note}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}
          {tab === 'live' && (
            <div className="p-5 space-y-3 text-sm text-zinc-400">
              <p>Live tools: pools, challenges, Ghost AI (max 1/hour), group streams, and raids run on creator devices.</p>
              <AdminEscrowPanel onChange={refresh} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
