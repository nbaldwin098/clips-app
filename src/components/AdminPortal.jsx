import { useState } from 'react'
import {
  isAdminSession, adminLogin, adminLogout, listApplications, setApplicationStatus,
  listTickets, updateTicket, listIndexedUsers, listImports, listUserClips,
} from '../lib/moderation'
import {
  listAdApplications, approveAdApplication, rejectAdApplication,
  adsAreRunning, setAdsRunning, listAllCampaigns, saveAdvertiserCampaign,
} from '../lib/adEngine'
import {
  getPayoutSettings, setPayoutSettings, setCreatorRpm, listCreatorBalances,
  recordManualPayout, listPayoutLedger, getPayoutContact,
} from '../lib/payouts'
import { lsGet, lsSet } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { ORG, OPS_CHECKLIST, applicationsAreOpen, applicationsWindowLabel } from '../lib/orgConfig'
import AdminPromos from './AdminPromos'

const TABS = [
  ['ops', 'Overview'],
  ['payouts', 'Payouts'],
  ['ads', 'Ads'],
  ['promos', 'Promos'],
  ['applications', 'Creators'],
  ['tickets', 'Support'],
  ['users', 'Users'],
  ['content', 'Content'],
  ['live', 'Live'],
]

function Pill({ on, children }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${on ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
      {children}
    </span>
  )
}

export default function AdminPortal() {
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const authed = unlocked || isAdminSession(user)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('ops')
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  const [rpm, setRpm] = useState(() => getPayoutSettings().rpmPerThousand)
  const [payUser, setPayUser] = useState('')
  const [payAmt, setPayAmt] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payVia, setPayVia] = useState('paypal')

  if (!authed) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <h1 className="text-lg font-semibold text-white">Admin portal</h1>
        <p className="text-xs text-zinc-500 mt-1 mb-4">
          Sign in as @{ORG.ownerHandle} ({OWNER_HINT}), then enter the admin code.
        </p>
        <form onSubmit={async (e) => {
          e.preventDefault()
          const result = await adminLogin(code.trim(), user)
          if (result?.ok) { setUnlocked(true); setErr('') }
          else setErr(result?.error || 'Invalid code')
        }} className="space-y-3">
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-10 rounded-lg border border-zinc-800 bg-[#121218] px-3 text-sm text-zinc-100" placeholder="Admin code" />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button type="submit" className="w-full h-10 rounded-lg bg-white text-black text-sm">Enter</button>
        </form>
      </div>
    )
  }

  const apps = listApplications()
  const pendingApps = apps.filter((a) => a.status === 'pending')
  const adApps = listAdApplications()
  const tickets = listTickets()
  const openTickets = tickets.filter((t) => t.status === 'open')
  const users = listIndexedUsers()
  const imports = listImports()
  const clips = listUserClips()
  const live = lsGet('live_board', [])
  const campaigns = listAllCampaigns()
  const balances = listCreatorBalances()
  const ledger = listPayoutLedger()
  const adsOn = adsAreRunning()

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

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Admin</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Ads {adsOn ? 'ON' : 'off'} · ${getPayoutSettings().rpmPerThousand}/1k views · pending creators {pendingApps.length} · tickets {openTickets.length}
          </p>
        </div>
        <button type="button" onClick={() => { adminLogout(); setUnlocked(false) }} className="text-xs text-zinc-500">Sign out admin</button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`h-8 px-3 rounded-full text-xs ${tab === id ? 'bg-white text-black' : 'border border-zinc-800 text-zinc-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'ops' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
            <p className="text-sm font-medium text-white">Snapshot</p>
            <p className="text-xs text-zinc-400">Users {users.length} · catalog {imports.length} · live lobby {live.filter((l) => l.isLive).length}</p>
            <p className="text-xs text-zinc-500">Creator apps {applicationsWindowLabel()} · {applicationsAreOpen() ? 'open' : 'closed'}</p>
            <ul className="text-xs text-zinc-400 space-y-1 pt-2">
              <li>Support {ORG.supportEmail}</li>
              <li>Copyright {ORG.copyrightEmail}</li>
              <li>Owner @{ORG.ownerHandle}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
            <p className="text-sm font-medium text-white mb-2">Checklist</p>
            <ul className="space-y-2">
              {OPS_CHECKLIST.map((item) => (
                <li key={item} className="flex gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-600">☐</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
            <p className="text-sm font-medium text-white">Rate</p>
            <p className="text-xs text-zinc-500">Creators earn this many USD per 1,000 views. You send the money yourself. Mark it sent here so their wallet matches.</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-zinc-400">USD / 1,000 views
                <input type="number" min="0" step="0.01" value={rpm} onChange={(e) => setRpm(e.target.value)} className="mt-1 block w-32 h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
              </label>
              <button type="button" className="h-10 px-4 rounded-lg bg-white text-black text-xs font-semibold" onClick={() => { setPayoutSettings({ rpmPerThousand: rpm }); refresh() }}>Save rate</button>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
            <p className="text-sm font-medium text-white">Send a payout</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <select value={payUser} onChange={(e) => setPayUser(e.target.value)} className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white">
                <option value="">Creator</option>
                {balances.map((b) => (
                  <option key={b.userId} value={b.userId}>@{b.handle || b.userId} · pending ${b.pending.toFixed(2)}</option>
                ))}
              </select>
              <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder="Amount USD" className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
              <select value={payVia} onChange={(e) => setPayVia(e.target.value)} className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white">
                <option value="paypal">PayPal</option>
                <option value="venmo">Venmo</option>
                <option value="cashapp">Cash App</option>
                <option value="wire">Wire / bank</option>
                <option value="other">Other</option>
              </select>
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note" className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
            </div>
            {payUser ? <p className="text-[11px] text-zinc-500">Pay to: {JSON.stringify(getPayoutContact(payUser))}</p> : null}
            {err ? <p className="text-xs text-red-400">{err}</p> : null}
            <button type="button" onClick={sendPay} className="h-10 px-4 rounded-lg bg-white text-black text-xs font-semibold">Mark sent</button>
          </div>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#121218] text-zinc-500">
                <tr>
                  <th className="p-2 font-medium">Creator</th>
                  <th className="p-2 font-medium">Views</th>
                  <th className="p-2 font-medium">RPM</th>
                  <th className="p-2 font-medium">Earned</th>
                  <th className="p-2 font-medium">Paid</th>
                  <th className="p-2 font-medium">Pending</th>
                  <th className="p-2 font-medium">Override RPM</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.userId} className="border-t border-zinc-800 text-zinc-300">
                    <td className="p-2">@{b.handle || '—'}</td>
                    <td className="p-2">{b.views}</td>
                    <td className="p-2">${b.rpm}</td>
                    <td className="p-2">${b.earned.toFixed(2)}</td>
                    <td className="p-2">${b.paid.toFixed(2)}</td>
                    <td className="p-2 text-white">${b.pending.toFixed(2)}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={b.rpm}
                        className="w-20 h-8 rounded border border-zinc-800 bg-black px-2"
                        onBlur={(e) => { setCreatorRpm(b.userId, e.target.value); refresh() }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-sm text-white mb-2">Ledger</p>
            {ledger.length === 0 ? <p className="text-xs text-zinc-500">No payouts marked yet.</p> : ledger.map((r) => (
              <p key={r.id} className="text-xs text-zinc-400 py-1 border-b border-zinc-900">${r.amount.toFixed(2)} · @{r.handle} · {r.sentVia} · {r.at?.slice(0, 10)} · {r.note}</p>
            ))}
          </div>
        </div>
      )}

      {tab === 'ads' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Site ads</p>
              <p className="text-xs text-zinc-500">Off means watch and clips never show preroll, even if a campaign is scheduled.</p>
            </div>
            <button
              type="button"
              onClick={() => { setAdsRunning(!adsOn); refresh() }}
              className={`h-10 px-4 rounded-lg text-xs font-semibold ${adsOn ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-300'}`}
            >
              {adsOn ? 'Ads are ON' : 'Ads are off'}
            </button>
          </div>
          <p className="text-sm text-white">Applications</p>
          {adApps.length === 0 ? (
            <p className="text-xs text-zinc-500">No advertisement applications yet.</p>
          ) : (
            adApps.map((a) => (
              <div key={a.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white">{a.businessName}</span>
                    <span className="ml-2 text-xs text-zinc-400">{a.contactName} ({a.email})</span>
                  </div>
                  <Pill on={a.status === 'approved'}>{a.status}</Pill>
                </div>
                <p className="text-xs text-zinc-400">{a.website} · {a.monthlyBudget} · {a.targetAudience}</p>
                {a.campaignGoals ? <p className="text-xs text-zinc-300">"{a.campaignGoals}"</p> : null}
                {a.status === 'approved' && a.account && (
                  <div className="p-3 rounded-lg bg-black border border-zinc-800 text-xs text-zinc-300 space-y-1">
                    <p className="font-semibold text-white">Portal login (show this once)</p>
                    <p>Username <code className="text-white">{a.account.username}</code></p>
                    <p>Password <code className="text-white">{a.account.password}</code></p>
                  </div>
                )}
                {a.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={async () => { await approveAdApplication(a.id); refresh() }} className="h-8 px-4 rounded-lg bg-white text-black text-xs font-bold">Approve</button>
                    <button type="button" onClick={() => { rejectAdApplication(a.id); refresh() }} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">Reject</button>
                  </div>
                )}
              </div>
            ))
          )}
          <p className="text-sm text-white pt-2">Campaigns</p>
          {campaigns.length === 0 ? <p className="text-xs text-zinc-500">No campaigns. Approve a brand, then schedule here.</p> : campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-xs space-y-2">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-white">{c.headline} · {c.businessName}</p>
                <Pill on={c.status === 'active'}>{c.status}</Pill>
              </div>
              <p className="text-zinc-500">{c.impressions || 0} impressions · {c.clicks || 0} clicks</p>
              <div className="grid sm:grid-cols-4 gap-2">
                <select
                  value={c.status}
                  onChange={(e) => { saveAdvertiserCampaign({ ...c, status: e.target.value }); refresh() }}
                  className="h-9 rounded-lg border border-zinc-800 bg-black px-2 text-white"
                >
                  <option value="draft">draft</option>
                  <option value="scheduled">scheduled</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="ended">ended</option>
                </select>
                <label className="text-zinc-500">Start
                  <input type="datetime-local" defaultValue={c.startsAt ? c.startsAt.slice(0, 16) : ''} onBlur={(e) => { saveAdvertiserCampaign({ ...c, startsAt: e.target.value ? new Date(e.target.value).toISOString() : '' }); refresh() }} className="mt-1 block w-full h-9 rounded-lg border border-zinc-800 bg-black px-2 text-white" />
                </label>
                <label className="text-zinc-500">End
                  <input type="datetime-local" defaultValue={c.endsAt ? c.endsAt.slice(0, 16) : ''} onBlur={(e) => { saveAdvertiserCampaign({ ...c, endsAt: e.target.value ? new Date(e.target.value).toISOString() : '' }); refresh() }} className="mt-1 block w-full h-9 rounded-lg border border-zinc-800 bg-black px-2 text-white" />
                </label>
                <input defaultValue={c.targetUrl || ''} placeholder="https link" onBlur={(e) => { try { saveAdvertiserCampaign({ ...c, targetUrl: e.target.value }); refresh() } catch {} }} className="h-9 self-end rounded-lg border border-zinc-800 bg-black px-2 text-white" />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'promos' && <AdminPromos />}

      {tab === 'applications' && (
        apps.length === 0 ? <p className="text-xs text-zinc-500">No applications yet.</p> :
        apps.map((a) => (
          <div key={a.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm mb-2">
            <p className="text-zinc-100">{a.displayName || a.name} @{a.handle} · {a.status}</p>
            <p className="text-xs text-zinc-500">{a.email} {a.phone ? `· ${a.phone}` : ''}</p>
            <p className="text-xs text-zinc-400 mt-1">{a.about || a.bio}</p>
            {a.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => approve(a, 'approved')} className="h-8 px-3 rounded-lg bg-white text-black text-xs">Approve</button>
                <button type="button" onClick={() => approve(a, 'rejected')} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">Reject</button>
              </div>
            )}
          </div>
        ))
      )}

      {tab === 'tickets' && (
        tickets.length === 0 ? <p className="text-xs text-zinc-500">No tickets.</p> :
        tickets.map((t) => (
          <div key={t.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm mb-2">
            <div className="flex justify-between"><span>{t.subject}</span>
              <select value={t.status} onChange={(e) => { updateTicket(t.id, { status: e.target.value }); refresh() }} className="text-xs bg-black border border-zinc-700 rounded px-2">
                <option value="open">open</option><option value="closed">closed</option>
              </select>
            </div>
            <p className="text-xs text-zinc-400 mt-1">{t.body}</p>
          </div>
        ))
      )}
      {tab === 'users' && users.map((u) => (
        <div key={u.id} className="text-xs border-b border-zinc-800 py-2 text-zinc-400">{u.displayName} · {u.email} · @{u.handle} · {u.creatorStatus}</div>
      ))}
      {tab === 'content' && (<>{imports.map((i) => <div key={i.id} className="text-xs text-zinc-500 py-1">{i.title || i.url}</div>)}{clips.map((c) => <div key={c.id} className="text-xs text-zinc-500 py-1">{c.title}</div>)}</>)}
      {tab === 'live' && (live.length === 0 ? <p className="text-xs text-zinc-500">No live board entries.</p> : live.map((l) => <div key={l.userId + l.startedAt} className="text-xs py-1">{l.isLive ? 'LIVE' : 'ended'} · {l.title} · @{l.handle}</div>))}
    </div>
  )
}

const OWNER_HINT = 'cs1@calabi.local'
