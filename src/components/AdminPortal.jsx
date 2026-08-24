import { useState } from 'react'
import {
  LayoutDashboard, Users, Film, ShieldAlert, Wallet, Megaphone, Flag,
  Radio, LifeBuoy, Settings, ClipboardList,
} from 'lucide-react'
import {
  isAdminSession, adminLogin, adminLogout, listApplications, setApplicationStatus,
  listTickets, updateTicket, isPlatformOwner,
} from '../lib/moderation'
import {
  listCreatorBalances,
  recordManualPayout, listPayoutLedger, getPayoutContact,
} from '../lib/payouts'
import { lsGet, lsSet } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { ORG } from '../lib/orgConfig'
import { adminOverview, payoutsHeld } from '../lib/trustSafety'
import AdminPromos from './AdminPromos'
import AdminAds from './AdminAds'
import AdminSetup from './AdminSetup'
import AdminPeople from './admin/AdminPeople'
import AdminContent from './admin/AdminContent'
import AdminSafety from './admin/AdminSafety'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'people', label: 'People', icon: Users },
  { id: 'content', label: 'Content', icon: Film },
  { id: 'safety', label: 'Safety', icon: ShieldAlert },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'ads', label: 'Ads', icon: Megaphone },
  { id: 'promos', label: 'Promos', icon: Flag },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'applications', label: 'Applications', icon: ClipboardList },
  { id: 'tickets', label: 'Support', icon: LifeBuoy },
  { id: 'setup', label: 'Setup', icon: Settings },
]

export default function AdminPortal() {
  const { user, login } = useAuth()
  const [unlocked, setUnlocked] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const authed = unlocked || isAdminSession(user) || isPlatformOwner(user)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('people')
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  const [payUser, setPayUser] = useState('')
  const [payAmt, setPayAmt] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payVia, setPayVia] = useState('paypal')

  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center bg-[#09090b]">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111113] p-6">
          <h1 className="text-lg font-semibold text-white">Admin</h1>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            Sign in as cs1 with the same password you use on the site.
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault()
            setErr('')
            try {
              let u = user
              if (!u) {
                u = await login({
                  email: (identifier || 'cs1').trim(),
                  password: code,
                  mode: 'signin',
                })
              }
              if (isPlatformOwner(u)) {
                await adminLogin(code, u)
                setUnlocked(true)
                return
              }
              const result = await adminLogin(code.trim(), u)
              if (result?.ok) { setUnlocked(true); setErr('') }
              else setErr(result?.error || 'Wrong password.')
            } catch (e2) {
              setErr(e2?.message || 'Wrong password.')
            }
          }} className="space-y-3">
            {!user ? (
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-zinc-100"
                placeholder="cs1"
                autoCapitalize="none"
                autoCorrect="off"
              />
            ) : null}
            <input type="password" value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-zinc-100" placeholder="Password" />
            {err && <p className="text-xs text-red-400">{err}</p>}
            <button type="submit" className="w-full h-10 rounded-lg bg-white text-black text-sm font-semibold">Enter</button>
          </form>
        </div>
      </div>
    )
  }

  const apps = listApplications()
  const tickets = listTickets()
  const live = lsGet('live_board', [])
  const balances = listCreatorBalances()
  const ledger = listPayoutLedger()
  const stats = adminOverview()

  const approve = (app, status) => {
    setApplicationStatus(app.id, status)
    const u = lsGet('user', null)
    if (u && u.id === app.userId) lsSet('user', { ...u, creatorStatus: status, isCreator: status === 'approved' })
    refresh()
  }

  const sendPay = () => {
    const row = balances.find((b) => b.userId === payUser)
    const res = recordManualPayout({
      userId: payUser,
      handle: row?.handle,
      amount: payAmt,
      note: payNote,
      sentVia: payVia,
    })
    if (res.ok) {
      setPayAmt('')
      setPayNote('')
      refresh()
    } else {
      setErr(res.error)
    }
  }

  const navBtn = (item) => {
    const Icon = item.icon
    const on = tab === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setTab(item.id)}
        className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] ${on ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </button>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#09090b] text-zinc-200 flex">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#0b0b0d]">
        <div className="px-4 h-14 flex items-center border-b border-white/10">
          <p className="text-sm font-semibold text-white">Trust & Safety</p>
        </div>
        <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
          {NAV.map(navBtn)}
        </nav>
        <div className="p-3 border-t border-white/10 text-[10px] text-zinc-600">
          Ads always on · {ORG.domain}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 border-b border-white/10 flex items-center justify-between px-5 bg-[#0b0b0d]">
          <div>
            <p className="text-sm font-semibold text-white">{NAV.find((n) => n.id === tab)?.label}</p>
            <p className="text-[11px] text-zinc-500">{stats.people} people · {stats.banned} banned · {stats.holds} payout holds</p>
          </div>
          <button type="button" onClick={() => { adminLogout(); setUnlocked(false) }} className="text-xs text-zinc-500 hover:text-white">Close session</button>
        </header>
        <div className="md:hidden flex gap-1 overflow-x-auto p-2 border-b border-white/10">
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`h-8 px-3 rounded-full text-[11px] shrink-0 ${tab === item.id ? 'bg-white text-black' : 'border border-white/10 text-zinc-400'}`}>
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['People', stats.people],
              ['Banned', stats.banned],
              ['Suspended', stats.suspended],
              ['Payout holds', stats.holds],
              ['Posts', stats.posts],
              ['Open tickets', tickets.filter((t) => t.status === 'open').length],
              ['Live lobbies', live.filter((l) => l.isLive).length],
              ['Ads', 'Always on'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#111113] p-4">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'people' && <AdminPeople />}
        {tab === 'content' && <AdminContent />}
        {tab === 'safety' && <AdminSafety />}
        {tab === 'ads' && <div className="p-5 overflow-y-auto"><AdminAds /></div>}
        {tab === 'promos' && <div className="p-5 overflow-y-auto"><AdminPromos /></div>}
        {tab === 'setup' && <div className="p-5 overflow-y-auto"><AdminSetup /></div>}

        {tab === 'payouts' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-4 space-y-3">
              <p className="text-sm font-medium text-white">Mark a payout sent</p>
              <p className="text-xs text-zinc-500">Views do not set a dollar rate. Pay people who applied and were approved. Hold payouts on People if you need to freeze an account.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <select value={payUser} onChange={(e) => setPayUser(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white">
                  <option value="">Creator</option>
                  {balances.map((b) => (
                    <option key={b.userId} value={b.userId}>@{b.handle || b.userId} · ${b.paid.toFixed(2)} paid{payoutsHeld(b.userId) ? ' · HELD' : ''}</option>
                  ))}
                </select>
                <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder="Amount USD" className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white" />
                <select value={payVia} onChange={(e) => setPayVia(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white">
                  <option value="paypal">PayPal</option>
                  <option value="venmo">Venmo</option>
                  <option value="cashapp">Cash App</option>
                  <option value="wire">Wire / bank</option>
                  <option value="other">Other</option>
                </select>
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note" className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white" />
              </div>
              {payUser ? <p className="text-[11px] text-zinc-500">Pay to: {JSON.stringify(getPayoutContact(payUser))}</p> : null}
              {err ? <p className="text-xs text-red-400">{err}</p> : null}
              <button type="button" onClick={sendPay} className="h-10 px-4 rounded-lg bg-white text-black text-xs font-semibold">Mark sent</button>
            </div>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111113] text-zinc-500">
                  <tr>
                    <th className="p-2 font-medium">Creator</th>
                    <th className="p-2 font-medium">Views</th>
                    <th className="p-2 font-medium">Paid</th>
                    <th className="p-2 font-medium">Hold</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.userId} className="border-t border-white/10 text-zinc-300">
                      <td className="p-2">@{b.handle || '—'}</td>
                      <td className="p-2">{b.views}</td>
                      <td className="p-2 text-white">${b.paid.toFixed(2)}</td>
                      <td className="p-2">{payoutsHeld(b.userId) ? 'Held' : 'Open'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-sm text-white mb-2">Ledger</p>
              {ledger.length === 0 ? <p className="text-xs text-zinc-500">No payouts marked yet.</p> : ledger.map((r) => (
                <p key={r.id} className="text-xs text-zinc-400 py-1 border-b border-white/5">${r.amount.toFixed(2)} · @{r.handle} · {r.sentVia} · {r.at?.slice(0, 10)} · {r.note}</p>
              ))}
            </div>
          </div>
        )}

        {tab === 'applications' && (
          <div className="p-5 overflow-y-auto">
            {apps.length === 0 ? <p className="text-xs text-zinc-500">No applications yet.</p> :
              apps.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-[#111113] p-4 text-sm mb-2">
                  <p className="text-zinc-100">{a.displayName || a.name} @{a.handle} · {a.status}</p>
                  <p className="text-xs text-zinc-500">{a.email}</p>
                  {a.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => approve(a, 'approved')} className="h-8 px-3 rounded-lg bg-white text-black text-xs">Approve</button>
                      <button type="button" onClick={() => approve(a, 'rejected')} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">Reject</button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {tab === 'tickets' && (
          <div className="p-5 overflow-y-auto">
            {tickets.length === 0 ? <p className="text-xs text-zinc-500">No tickets.</p> :
              tickets.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-[#111113] p-4 text-sm mb-2">
                  <div className="flex justify-between"><span>{t.subject}</span>
                    <select value={t.status} onChange={(e) => { updateTicket(t.id, { status: e.target.value }); refresh() }} className="text-xs bg-black border border-white/10 rounded px-2">
                      <option value="open">open</option><option value="closed">closed</option>
                    </select>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{t.body}</p>
                </div>
              ))}
          </div>
        )}

        {tab === 'live' && (
          <div className="p-5 overflow-y-auto">
            {live.length === 0 ? <p className="text-xs text-zinc-500">No live board entries.</p> : live.map((l) => (
              <div key={l.userId + l.startedAt} className="text-xs py-2 border-b border-white/5">{l.isLive ? 'LIVE' : 'ended'} · {l.title} · @{l.handle}</div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
