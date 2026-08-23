import { useState } from 'react'
import {
  isAdminSession, adminLogin, adminLogout, listApplications, setApplicationStatus,
  listTickets, updateTicket, listIndexedUsers, listImports, listUserClips,
} from '../lib/moderation'
import { lsGet, lsSet } from '../lib/storage'

export default function AdminPortal() {
  const [authed, setAuthed] = useState(isAdminSession())
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('applications')
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  if (!authed) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <h1 className="text-lg font-semibold text-white">Admin portal</h1>
        <p className="text-xs text-zinc-500 mt-1 mb-4">Staff only. MVP code: clips-admin</p>
        <form onSubmit={(e) => { e.preventDefault(); if (adminLogin(code.trim())) { setAuthed(true); setErr('') } else setErr('Invalid code') }} className="space-y-3">
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-10 rounded-lg border border-zinc-800 bg-[#121218] px-3 text-sm text-zinc-100" placeholder="Admin code" />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button type="submit" className="w-full h-10 rounded-lg bg-white text-black text-sm">Enter</button>
        </form>
      </div>
    )
  }

  const apps = listApplications()
  const tickets = listTickets()
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

  return (
    <div className="p-4 md:p-6 max-w-[1100px] mx-auto">
      <div className="flex justify-between mb-4">
        <h1 className="text-lg font-semibold text-white">Admin portal</h1>
        <button type="button" onClick={() => { adminLogout(); setAuthed(false) }} className="text-xs text-zinc-500">Sign out admin</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {[['applications','Applications'],['tickets','Support'],['users','Users'],['content','Content'],['live','Live']].map(([id,label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`h-8 px-3 rounded-full text-xs ${tab===id?'bg-white text-black':'border border-zinc-800 text-zinc-400'}`}>{label}</button>
        ))}
      </div>
      {tab==='applications' && apps.map((a) => (
        <div key={a.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm mb-2">
          <p className="text-zinc-100">{a.displayName} @{a.handle} · {a.status}</p>
          <p className="text-xs text-zinc-500">{a.email}</p>
          <p className="text-xs text-zinc-400 mt-1">{a.about}</p>
          {a.status==='pending' && (
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => approve(a,'approved')} className="h-8 px-3 rounded-lg bg-white text-black text-xs">Approve</button>
              <button type="button" onClick={() => approve(a,'rejected')} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">Reject</button>
            </div>
          )}
        </div>
      ))}
      {tab==='tickets' && tickets.map((t) => (
        <div key={t.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm mb-2">
          <div className="flex justify-between"><span>{t.subject}</span>
            <select value={t.status} onChange={(e)=>{updateTicket(t.id,{status:e.target.value});refresh()}} className="text-xs bg-[#0b0b0f] border border-zinc-700 rounded px-2">
              <option value="open">open</option><option value="closed">closed</option>
            </select>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{t.body}</p>
        </div>
      ))}
      {tab==='users' && users.map((u) => (
        <div key={u.id} className="text-xs border-b border-zinc-800 py-2 text-zinc-400">{u.displayName} · {u.email} · @{u.handle} · {u.creatorStatus}</div>
      ))}
      {tab==='content' && (<>{imports.map(i=><div key={i.id} className="text-xs text-zinc-500 py-1">{i.title||i.url}</div>)}{clips.map(c=><div key={c.id} className="text-xs text-zinc-500 py-1">{c.title}</div>)}</>)}
      {tab==='live' && live.map((l)=><div key={l.userId+l.startedAt} className="text-xs py-1">{l.isLive?'LIVE':'ended'} · {l.title} · @{l.handle}</div>)}
    </div>
  )
}
