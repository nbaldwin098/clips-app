import { useState } from 'react'
import {
  LayoutDashboard, Users, Film, ShieldAlert, Wallet, Flag,
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
import { useAuth } from '../context/AuthContext'
import { ORG } from '../lib/orgConfig'
import { adminOverview, payoutsHeld } from '../lib/trustSafety'
import AdminPromos from './AdminPromos'
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
            Sign in as the platform owner, then enter the admin code.
          </p>
          <label className="block text-xs text-zinc-400 mb-1">Owner email or handle</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full h-10 rounded-lg bg-black border border-white/10 px-3 text-sm text-white mb-3"
            placeholder="owner@… or handle"
          />
          <label className="block text-xs text-zinc-400 mb-1">Admin code</label>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-10 rounded-lg bg-black border border-white/10 px-3 text-sm text-white mb-3"
          />
          {err ? <p className="text-xs text-red-400 mb-2">{err}</p> : null}
          <button
            type="button"
            onClick={async () => {
              setErr('')
              let u = user
              if (!isPlatformOwner(u) && identifier.trim()) {
                const res = await login?.(identifier.trim(), code.trim())
                if (res?.ok) u = res.user
              }
              const result = await adminLogin(code.trim(), u)
              if (!result.ok) {
                setErr(result.error || 'Access denied')
                return
              }
              setUnlocked(true)
            }}
            className="w-full h-10 rounded-lg bg-white text-black text-sm font-semibold"
          >
            Unlock
          </button>
        </div>
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
        <header className="h-14 shrink-0 border-b border-white/10 flex items-center justify-between px-5 bg-[#0b0b0d]">
          <p className="text-sm font-medium">{NAV.find((n) => n.id === tab)?.label || 'Admin'}</p>
          <button type="button" onClick={() => { adminLogout(); setUnlocked(false) }} className="text-xs text-zinc-500 hover:text-white">Close session</button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === 'overview' && (
            <div className="p-5 grid sm:grid-cols-3 gap-3">
              {Object.entries(stats || {}).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/10 bg-[#111113] p-4">
                  <p className="text-[10px] uppercase text-zinc-500">{k}</p>
                  <p className="text-xl font-semibold mt-1">{String(v)}</p>
                </div>
              ))}
              <div className="rounded-xl border border-white/10 bg-[#111113] p-4 sm:col-span-3">
                <p className="text-xs text-zinc-500">Payouts held: {payoutsHeld() ? 'yes' : 'no'}</p>
              </div>
            </div>
          )}
          {tab === 'people' && <div className="p-5"><AdminPeople onChange={refresh} /></div>}
          {tab === 'content' && <div className="p-5"><AdminContent onChange={refresh} /></div>}
          {tab === 'safety' && <div className="p-5"><AdminSafety onChange={refresh} /></div>}
          {tab === 'promos' && <div className="p-5"><AdminPromos /></div>}
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
            <div className="p-5 space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-[#111113] p-3">
                  <p className="text-sm font-medium">{t.subject || t.id}</p>
                  <p className="text-xs text-zinc-500">{t.status}</p>
                  <button type="button" className="mt-2 text-xs underline" onClick={() => { updateTicket(t.id, { status: 'closed' }); refresh() }}>Close</button>
                </div>
              ))}
              {!tickets.length ? <p className="text-sm text-zinc-500">No tickets</p> : null}
            </div>
          )}
          {tab === 'payouts' && (
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#111113] p-4 space-y-2">
                <p className="text-sm font-medium">Manual payout</p>
                <input value={payUser} onChange={(e) => setPayUser(e.target.value)} placeholder="User id" className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm" />
                <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder="Amount" className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm" />
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note" className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm" />
                <select value={payVia} onChange={(e) => setPayVia(e.target.value)} className="w-full h-9 rounded bg-black border border-white/10 px-2 text-sm">
                  <option value="paypal">PayPal</option>
                  <option value="bank">Bank</option>
                </select>
                <button
                  type="button"
                  className="h-9 px-3 rounded bg-white text-black text-sm font-semibold"
                  onClick={() => {
                    recordManualPayout({ userId: payUser, amount: Number(payAmt), note: payNote, via: payVia })
                    setPayUser(''); setPayAmt(''); setPayNote('')
                    refresh()
                  }}
                >
                  Record
                </button>
              </div>
              <div className="space-y-2">
                {balances.map((b) => (
                  <div key={b.userId} className="text-sm flex justify-between border border-white/10 rounded-lg px-3 py-2">
                    <span>{b.userId} {getPayoutContact(b.userId) || ''}</span>
                    <span>{b.balance}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {ledger.slice(0, 20).map((row) => (
                  <p key={row.id} className="text-xs text-zinc-500">{row.userId} · {row.amount} · {row.note}</p>
                ))}
              </div>
            </div>
          )}
          {tab === 'live' && (
            <div className="p-5 text-sm text-zinc-400">Live moderation tools live with stream data.</div>
          )}
        </div>
      </div>
    </div>
  )
}
