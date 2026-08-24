import { useMemo, useState } from 'react'
import ChannelAvatar from '../ChannelAvatar'
import {
  listAdminPeople, getEnforcement, adminUpdateProfile, banUser, unbanUser,
  suspendUser, limitUser, holdPayouts, holdAds, setFeatureFlags, addStrike,
  clearStrike, STATUS_LABEL, isProtectedAccount,
} from '../../lib/trustSafety'

const field = 'h-9 w-full rounded-lg border border-white/10 bg-black px-2.5 text-xs text-white'

function StatusPill({ status }) {
  const tone = {
    ok: 'bg-emerald-500/15 text-emerald-300',
    limited: 'bg-amber-500/15 text-amber-200',
    suspended: 'bg-orange-500/15 text-orange-200',
    banned: 'bg-red-500/15 text-red-300',
  }[status] || 'bg-white/10 text-zinc-300'
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone}`}>{STATUS_LABEL[status] || status}</span>
}

export default function AdminPeople() {
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)

  const people = useMemo(() => listAdminPeople({ query: q }), [q, tick])
  const selected = people.find((p) => p.id === selectedId) || (selectedId ? listAdminPeople({ query: selectedId }).find((p) => p.id === selectedId) : null)
  const enf = selected ? getEnforcement(selected.id) : null

  const [draft, setDraft] = useState(null)
  const open = (p) => {
    setSelectedId(p.id)
    setDraft({
      displayName: p.displayName || '',
      handle: p.handle || '',
      email: p.email || '',
      bio: p.bio || '',
      creatorStatus: p.creatorStatus || 'none',
    })
    setNote('')
    setErr('')
  }

  const saveProfile = () => {
    const res = adminUpdateProfile(selected.id, draft)
    if (!res.ok) setErr(res.error)
    else { setErr(''); refresh() }
  }

  const act = (fn) => {
    const res = fn()
    if (res && res.ok === false) setErr(res.error)
    else { setErr(''); refresh() }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-0">
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, @handle, email…"
            className="h-10 flex-1 rounded-lg border border-white/10 bg-black px-3 text-sm text-white placeholder:text-zinc-600"
          />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0b0b0d] text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Person</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Payouts</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {people.slice(0, 200).map((p) => {
                const row = getEnforcement(p.id)
                return (
                  <tr
                    key={p.id}
                    onClick={() => open(p)}
                    className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.04] ${selectedId === p.id ? 'bg-white/[0.06]' : ''}`}
                  >
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-2.5 min-w-0">
                        <ChannelAvatar src={p.avatarUrl} name={p.displayName} size={28} />
                        <span className="min-w-0">
                          <span className="block text-white truncate">{p.displayName || p.handle}</span>
                          <span className="block text-zinc-500 truncate">@{p.handle}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status={row.status} /></td>
                    <td className="px-3 py-2.5 text-zinc-400">{row.noPayout ? 'Held' : 'Open'}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{p.source || 'user'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {people.length === 0 && <p className="px-5 py-10 text-sm text-zinc-500">No people match.</p>}
        </div>
      </div>

      <aside className="w-[360px] shrink-0 border-l border-white/10 overflow-y-auto bg-[#0b0b0d] hidden lg:block">
        {!selected || !draft ? (
          <p className="p-6 text-sm text-zinc-500">Select a person to edit, ban, suspend, or hold payouts.</p>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white">{selected.displayName}</p>
              <p className="text-[11px] text-zinc-500">@{selected.handle} · {selected.email || 'no email'}</p>
              <div className="mt-2"><StatusPill status={enf.status} /></div>
            </div>
            {err ? <p className="text-xs text-red-400">{err}</p> : null}
            {isProtectedAccount(selected) ? (
              <p className="text-xs text-zinc-500">Library / owner accounts stay protected. You can still edit display fields for indexed users.</p>
            ) : null}

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Profile</p>
              <input className={field} value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} placeholder="Display name" />
              <input className={field} value={draft.handle} onChange={(e) => setDraft({ ...draft, handle: e.target.value })} placeholder="handle" />
              <input className={field} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="email" />
              <textarea className={`${field} h-20 py-2`} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Bio" />
              <select className={field} value={draft.creatorStatus} onChange={(e) => setDraft({ ...draft, creatorStatus: e.target.value })}>
                <option value="none">Viewer</option>
                <option value="pending">Pending creator</option>
                <option value="approved">Approved creator</option>
                <option value="rejected">Rejected</option>
              </select>
              <button type="button" onClick={saveProfile} className="h-9 w-full rounded-lg bg-white text-black text-xs font-semibold">Save profile</button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Enforcement</p>
              <textarea className={`${field} h-16 py-2`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (shown to the person)" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => act(() => suspendUser(selected.id, { days: 1, reason: note }))} className="h-8 rounded-lg border border-white/15 text-[11px] text-white">Suspend 1d</button>
                <button type="button" onClick={() => act(() => suspendUser(selected.id, { days: 7, reason: note }))} className="h-8 rounded-lg border border-white/15 text-[11px] text-white">Suspend 7d</button>
                <button type="button" onClick={() => act(() => suspendUser(selected.id, { days: 30, reason: note, readOnly: true }))} className="h-8 rounded-lg border border-white/15 text-[11px] text-white">Suspend 30d</button>
                <button type="button" onClick={() => act(() => limitUser(selected.id, note))} className="h-8 rounded-lg border border-white/15 text-[11px] text-white">Limit features</button>
                <button type="button" onClick={() => act(() => banUser(selected.id, note))} className="h-8 rounded-lg border border-red-500/40 text-[11px] text-red-300">Ban</button>
                <button type="button" onClick={() => act(() => unbanUser(selected.id))} className="h-8 rounded-lg border border-emerald-500/30 text-[11px] text-emerald-300">Restore</button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Money & features</p>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Hold payouts
                <input type="checkbox" checked={!!enf.noPayout} onChange={(e) => act(() => holdPayouts(selected.id, e.target.checked))} />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Hold ads / monetization
                <input type="checkbox" checked={!!enf.noAds} onChange={(e) => act(() => holdAds(selected.id, e.target.checked))} />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Block uploads
                <input type="checkbox" checked={!!enf.noPost} onChange={(e) => act(() => setFeatureFlags(selected.id, { noPost: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Block live
                <input type="checkbox" checked={!!enf.noLive} onChange={(e) => act(() => setFeatureFlags(selected.id, { noLive: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Block comments
                <input type="checkbox" checked={!!enf.noComment} onChange={(e) => act(() => setFeatureFlags(selected.id, { noComment: e.target.checked }))} />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Read-only (X-style)
                <input type="checkbox" checked={!!enf.readOnly} onChange={(e) => act(() => setFeatureFlags(selected.id, { readOnly: e.target.checked }))} />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Strikes (YouTube-style)</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => act(() => addStrike(selected.id, { kind: 'community', reason: note }))} className="h-8 rounded-lg border border-white/15 text-[11px] text-white">Community strike</button>
                <button type="button" onClick={() => act(() => addStrike(selected.id, { kind: 'copyright', reason: note }))} className="h-8 rounded-lg border border-white/15 text-[11px] text-white">Copyright strike</button>
              </div>
              <p className="text-[11px] text-zinc-500">1 strike limits uploads 7 days. 2 strikes 14 days. 3 active strikes bans the account. Strikes expire in 90 days.</p>
              {(enf.strikes || []).filter((s) => !s.cleared).map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg border border-white/10 p-2">
                  <p className="text-[11px] text-zinc-300">{s.kind} · {s.reason || 'no note'} · {s.at?.slice(0, 10)}</p>
                  <button type="button" className="text-[10px] text-white underline" onClick={() => act(() => clearStrike(selected.id, s.id))}>Clear</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
