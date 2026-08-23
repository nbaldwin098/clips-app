import { useState } from 'react'
import {
  isAdminSession, adminLogin, adminLogout, listApplications, setApplicationStatus,
  listTickets, updateTicket, listIndexedUsers, listImports, listUserClips,
} from '../lib/moderation'
import { listAdApplications, approveAdApplication, rejectAdApplication } from '../lib/adEngine'
import { lsGet, lsSet } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { ORG, OPS_CHECKLIST, applicationsAreOpen, applicationsWindowLabel } from '../lib/orgConfig'

export default function AdminPortal() {
  const { user } = useAuth()
  const [authed, setAuthed] = useState(isAdminSession())
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('ops')
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  if (!authed) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <h1 className="text-lg font-semibold text-white">Admin portal</h1>
        <p className="text-xs text-zinc-500 mt-1 mb-4">Staff only. Sign in as @{ORG.ownerHandle} and enter the admin code (Render: VITE_ADMIN_CODE).</p>
        <form onSubmit={(e) => {
          e.preventDefault()
          const result = adminLogin(code.trim(), user)
          if (result?.ok) { setAuthed(true); setErr('') }
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

  const approve = (app, status) => {
    setApplicationStatus(app.id, status)
    const u = lsGet('user', null)
    if (u && u.id === app.userId) lsSet('user', { ...u, creatorStatus: status, isCreator: status === 'approved' })
    refresh()
  }

  const handleApproveAd = (appId) => {
    approveAdApplication(appId)
    refresh()
  }

  const handleRejectAd = (appId) => {
    rejectAdApplication(appId)
    refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-[1100px] mx-auto">
      <div className="flex justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-white">Admin portal</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Apps window: {applicationsWindowLabel()} · {applicationsAreOpen() ? 'OPEN' : 'closed'} · pending creators: {pendingApps.length} · open tickets: {openTickets.length}
          </p>
        </div>
        <button type="button" onClick={() => { adminLogout(); setAuthed(false) }} className="text-xs text-zinc-500">Sign out admin</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {[['ops','Ops'],['applications','Creator Apps'],['ads','Ad Apps'],['tickets','Support'],['users','Users'],['content','Content'],['live','Live']].map(([id,label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`h-8 px-3 rounded-full text-xs ${tab===id?'bg-white text-black':'border border-zinc-800 text-zinc-400'}`}>{label}</button>
        ))}
      </div>

      {tab === 'ops' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm text-zinc-300 space-y-2">
            <p className="font-medium text-white">Organization snapshot</p>
            <p className="text-xs text-zinc-500">Contacts (set real MX on domain; override with VITE_SUPPORT_EMAIL etc.)</p>
            <ul className="text-xs space-y-1">
              <li>Support: {ORG.supportEmail}</li>
              <li>Copyright: {ORG.copyrightEmail}</li>
              <li>Privacy: {ORG.privacyEmail}</li>
              <li>Owner handle: @{ORG.ownerHandle}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
            <p className="text-sm font-medium text-white mb-2">Weekly ops checklist</p>
            <ul className="space-y-2">
              {OPS_CHECKLIST.map((item) => (
                <li key={item} className="flex gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-600">☐</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-200/90">
            Change admin code via Render env <code className="text-white">VITE_ADMIN_CODE</code> before inviting staff. Never commit secrets to GitHub.
          </div>
        </div>
      )}

      {tab==='ads' && (
        <div className="space-y-3">
          {adApps.length === 0 ? (
            <p className="text-xs text-zinc-500">No advertisement applications yet.</p>
          ) : (
            adApps.map((a) => (
              <div key={a.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white text-base">{a.businessName}</span>
                    <span className="ml-2 text-xs text-zinc-400">by {a.contactName} ({a.email})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    a.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    a.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{a.website} · Budget: {a.monthlyBudget} · Target: {a.targetAudience}</p>
                {a.campaignGoals && <p className="text-xs text-zinc-300 italic">"{a.campaignGoals}"</p>}
                {a.status === 'approved' && a.account && (
                  <div className="p-3 rounded-lg bg-[#0e0e14] border border-zinc-800 text-xs text-zinc-300 space-y-1">
                    <p className="font-semibold text-white">Generated Portal Login Credentials:</p>
                    <p>Username: <code className="bg-white/10 px-1.5 py-0.5 rounded text-white">{a.account.username}</code></p>
                    <p>Password: <code className="bg-white/10 px-1.5 py-0.5 rounded text-white">{a.account.password}</code></p>
                  </div>
                )}
                {a.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => handleApproveAd(a.id)} className="h-8 px-4 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200">
                      Approve & Create Portal Account
                    </button>
                    <button type="button" onClick={() => handleRejectAd(a.id)} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      {tab==='applications' && (
        apps.length === 0 ? <p className="text-xs text-zinc-500">No applications yet.</p> :
        apps.map((a) => (
        <div key={a.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm mb-2">
          <p className="text-zinc-100">{a.displayName || a.name} @{a.handle} · {a.status}</p>
          <p className="text-xs text-zinc-500">{a.email} {a.phone ? `· ${a.phone}` : ''}</p>
          <p className="text-xs text-zinc-400 mt-1">{a.about || a.bio}</p>
          {a.status==='pending' && (
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => approve(a,'approved')} className="h-8 px-3 rounded-lg bg-white text-black text-xs">Approve</button>
              <button type="button" onClick={() => approve(a,'rejected')} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">Reject</button>
            </div>
          )}
        </div>
      )))}
      {tab==='tickets' && (
        tickets.length === 0 ? <p className="text-xs text-zinc-500">No tickets.</p> :
        tickets.map((t) => (
        <div key={t.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm mb-2">
          <div className="flex justify-between"><span>{t.subject}</span>
            <select value={t.status} onChange={(e)=>{updateTicket(t.id,{status:e.target.value});refresh()}} className="text-xs bg-[#0b0b0f] border border-zinc-700 rounded px-2">
              <option value="open">open</option><option value="closed">closed</option>
            </select>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{t.body}</p>
        </div>
      )))}
      {tab==='users' && users.map((u) => (
        <div key={u.id} className="text-xs border-b border-zinc-800 py-2 text-zinc-400">{u.displayName} · {u.email} · @{u.handle} · {u.creatorStatus}</div>
      ))}
      {tab==='content' && (<>{imports.map(i=><div key={i.id} className="text-xs text-zinc-500 py-1">{i.title||i.url}</div>)}{clips.map(c=><div key={c.id} className="text-xs text-zinc-500 py-1">{c.title}</div>)}</>)}
      {tab==='live' && (live.length === 0 ? <p className="text-xs text-zinc-500">No live board entries.</p> : live.map((l)=><div key={l.userId+l.startedAt} className="text-xs py-1">{l.isLive?'LIVE':'ended'} · {l.title} · @{l.handle}</div>))}
    </div>
  )
}
