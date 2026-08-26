import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getActivePool, startPool, contributeToPool, closePool } from '../lib/livePools'
import {
  enqueueChallenge,
  getActiveChallenge,
  startNextChallenge,
  contributeToChallenge,
  listChallengeQueue,
  ghostUsedThisHour,
  getChallengeDurationMs,
} from '../lib/liveChallenges'
import {
  getGroupStream,
  inviteToGroup,
  requestJoin,
  respondRequest,
  setGroupPrefs,
  GROUP_STREAM_WARN_AT,
  acceptsInvites,
  setAcceptInvites,
} from '../lib/groupStreams'
import { raidToStream } from '../lib/liveRaids'
import { listEscrow, markRequestFulfilled } from '../lib/donationEscrow'
import { VIEWER_ACTIONS, triggerViewerAction, listViewerActions } from '../lib/viewerActions'
import { getCalabiCashBalance } from '../lib/calabiCash'
import { getMultiStreamDest, setMultiStreamDest, queueAiHighlight } from '../lib/socialConnects'
import { getStreamFilter, setStreamFilter, STREAM_FILTERS } from '../lib/streamFilters'
import { lsGet } from '../lib/storage'

export default function LiveHostTools({ focusedStream, liveNow = [], onOpenCash }) {
  const { user, isAuthenticated } = useAuth()
  const hostId = focusedStream?.userId
  const isHost = Boolean(user?.id && hostId && user.id === hostId)
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)

  const [poolTitle, setPoolTitle] = useState('Pool challenge')
  const [poolTarget, setPoolTarget] = useState('500')
  const [poolPromise, setPoolPromise] = useState('')
  const [poolGift, setPoolGift] = useState('50')
  const [challengeTarget, setChallengeTarget] = useState('')
  const [challengeGift, setChallengeGift] = useState('100')
  const [inviteHandle, setInviteHandle] = useState('')
  const [note, setNote] = useState('')
  const [raidTo, setRaidTo] = useState('')

  const pool = hostId ? getActivePool(hostId) : null
  const challenge = getActiveChallenge()
  const group = hostId ? getGroupStream(hostId) : null
  const queue = listChallengeQueue()
  const escrow = isHost ? listEscrow({ creatorId: user?.id, limit: 8 }) : []
  const actions = hostId ? listViewerActions(hostId, 6) : []
  const cash = getCalabiCashBalance(user?.id)
  const multi = getMultiStreamDest(user?.id)
  const filter = getStreamFilter(user?.id)

  const othersLive = useMemo(
    () => (liveNow || []).filter((s) => s.userId && s.userId !== hostId && s.isLive),
    [liveNow, hostId],
  )

  useEffect(() => {
    const t = setInterval(refresh, 2000)
    return () => clearInterval(t)
  }, [])

  if (!hostId) return null

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0c0c10] p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Live tools</p>
          <p className="text-[11px] text-zinc-500">Pools · challenges · group · raids · Cash actions · multi-stream</p>
        </div>
        <button type="button" onClick={onOpenCash} className="text-xs text-zinc-300 underline">
          Cash: {cash}
        </button>
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {/* Pool */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-zinc-300">Pool challenge</p>
        {pool ? (
          <div className="text-xs text-zinc-400 space-y-2">
            <p className="text-white">{pool.title} — {pool.raisedUnits}/{pool.targetUnits} Cash ({pool.status})</p>
            {pool.promise ? <p>{pool.promise}</p> : null}
            <div className="flex flex-wrap gap-2">
              <input value={poolGift} onChange={(e) => setPoolGift(e.target.value)} className="h-8 w-20 rounded border border-zinc-700 bg-black px-2 text-white" />
              <button
                type="button"
                className="h-8 px-3 rounded bg-white text-black text-xs font-semibold"
                onClick={() => {
                  if (!isAuthenticated) return setNote('Sign in to contribute.')
                  const res = contributeToPool(hostId, user, poolGift)
                  setNote(res.ok ? 'Contributed.' : res.error)
                  refresh()
                }}
              >
                Add Cash
              </button>
              {isHost ? (
                <button type="button" className="h-8 px-3 rounded border border-zinc-700 text-xs" onClick={() => { closePool(hostId); refresh() }}>
                  Close pool
                </button>
              ) : null}
            </div>
          </div>
        ) : isHost ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={poolTitle} onChange={(e) => setPoolTitle(e.target.value)} placeholder="Title" className="h-9 rounded border border-zinc-700 bg-black px-2 text-sm text-white" />
            <input value={poolTarget} onChange={(e) => setPoolTarget(e.target.value)} placeholder="Target Cash" className="h-9 rounded border border-zinc-700 bg-black px-2 text-sm text-white" />
            <input value={poolPromise} onChange={(e) => setPoolPromise(e.target.value)} placeholder="When hit I will…" className="h-9 rounded border border-zinc-700 bg-black px-2 text-sm text-white sm:col-span-2" />
            <button
              type="button"
              className="h-9 rounded bg-white text-black text-xs font-semibold sm:col-span-2"
              onClick={() => {
                const res = startPool(hostId, { title: poolTitle, targetUnits: poolTarget, promise: poolPromise })
                setNote(res.ok ? 'Pool opened.' : res.error)
                refresh()
              }}
            >
              Start pool
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-600">No open pool.</p>
        )}
      </section>

      {/* Challenges / Ghost */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-zinc-300">Challenges & Ghost AI</p>
        <p className="text-[11px] text-zinc-500">
          3-minute matches. Ghost AI appears at most once per hour (random points). Queue vs other live streamers.
          {ghostUsedThisHour() ? ' Ghost already used this hour.' : ' Ghost available this hour.'}
        </p>
        {challenge?.status === 'live' ? (
          <div className="text-xs text-zinc-300 space-y-2">
            <p>
              {challenge.aHandle} {challenge.aScore} — {challenge.bScore} {challenge.bHandle}
              {' · '}{Math.max(0, Math.ceil((challenge.endsAt - Date.now()) / 1000))}s left
            </p>
            <div className="flex flex-wrap gap-2">
              <input value={challengeGift} onChange={(e) => setChallengeGift(e.target.value)} className="h-8 w-20 rounded border border-zinc-700 bg-black px-2" />
              <button type="button" className="h-8 px-2 rounded bg-white text-black text-xs" onClick={() => { const r = contributeToChallenge('a', user, challengeGift); setNote(r.ok ? 'Boosted A' : r.error); refresh() }}>Boost {challenge.aHandle}</button>
              {challenge.kind !== 'ghost' ? (
                <button type="button" className="h-8 px-2 rounded border border-zinc-600 text-xs" onClick={() => { const r = contributeToChallenge('b', user, challengeGift); setNote(r.ok ? 'Boosted B' : r.error); refresh() }}>Boost {challenge.bHandle}</button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <select value={challengeTarget} onChange={(e) => setChallengeTarget(e.target.value)} className="h-9 rounded border border-zinc-700 bg-black px-2 text-xs text-white">
              <option value="">Challenge a live streamer…</option>
              {othersLive.map((s) => (
                <option key={s.userId} value={s.userId}>@{s.handle || s.userId}</option>
              ))}
            </select>
            <button
              type="button"
              className="h-9 px-3 rounded border border-zinc-600 text-xs text-white"
              onClick={() => {
                if (!isAuthenticated || !isHost) return setNote('Host must queue challenges.')
                const t = othersLive.find((s) => s.userId === challengeTarget)
                if (!t) return setNote('Pick a target.')
                const r = enqueueChallenge({
                  challengerId: user.id,
                  challengerHandle: user.handle,
                  targetId: t.userId,
                  targetHandle: t.handle,
                })
                setNote(r.ok ? 'Queued.' : r.error)
                refresh()
              }}
            >
              Queue
            </button>
            {isHost ? (
              <button
                type="button"
                className="h-9 px-3 rounded bg-white text-black text-xs font-semibold"
                onClick={() => {
                  const r = startNextChallenge({
                    preferGhost: !ghostUsedThisHour() && Math.random() < 0.5,
                    hostCandidates: liveNow.filter((s) => s.isLive).map((s) => ({ userId: s.userId, handle: s.handle })),
                  })
                  setNote(r.ok ? `Started ${r.challenge.kind}` : r.error)
                  refresh()
                }}
              >
                Start next ({Math.round(getChallengeDurationMs() / 60000)}m)
              </button>
            ) : null}
          </div>
        )}
        {queue.length ? (
          <p className="text-[11px] text-zinc-600">Queue: {queue.map((q) => `@${q.challengerHandle}→@${q.targetHandle}`).join(', ')}</p>
        ) : null}
      </section>

      {/* Group */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-zinc-300">Group stream</p>
        <p className="text-[11px] text-zinc-500">
          No hard max. Warns past {GROUP_STREAM_WARN_AT} co-hosts (may crash). Optional combined chat, donations, auto revenue split, separate analytics keys.
        </p>
        {isHost ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
              {[
                ['allowRequests', 'Allow join requests'],
                ['combineChat', 'Combine chats'],
                ['combineDonations', 'Combine donations'],
                ['autoSplitRevenue', 'Auto-split revenue'],
              ].map(([k, label]) => {
                const g = group || { allowRequests: true, combineChat: true, combineDonations: true, autoSplitRevenue: true }
                const checked = g[k] !== false
                return (
                  <label key={k} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setGroupPrefs(hostId, { [k]: e.target.checked })
                        refresh()
                      }}
                    />
                    {label}
                  </label>
                )
              })}
            </div>
            <div className="flex gap-2">
              <input value={inviteHandle} onChange={(e) => setInviteHandle(e.target.value)} placeholder="user id to invite" className="h-8 flex-1 rounded border border-zinc-700 bg-black px-2 text-xs text-white" />
              <button
                type="button"
                className="h-8 px-3 rounded bg-white text-black text-xs"
                onClick={() => {
                  const r = inviteToGroup(hostId, user.handle, { userId: inviteHandle.trim(), handle: inviteHandle.trim() })
                  setNote(r.ok ? (r.warn ? `Invited (warn: >${GROUP_STREAM_WARN_AT})` : 'Invited') : r.error)
                  refresh()
                }}
              >
                Invite
              </button>
            </div>
            {(group?.pendingRequests || []).map((r) => (
              <div key={r.userId} className="flex gap-2 text-xs text-zinc-400">
                @{r.handle} requested
                <button type="button" className="underline" onClick={() => { respondRequest(hostId, r.userId, true); refresh() }}>Accept</button>
                <button type="button" className="underline" onClick={() => { respondRequest(hostId, r.userId, false); refresh() }}>Deny</button>
              </div>
            ))}
            <p className="text-[11px] text-zinc-600">Members: {(group?.members || []).map((m) => `@${m.handle}`).join(', ') || 'none'}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="h-8 px-3 rounded border border-zinc-600 text-xs"
              onClick={() => {
                if (!isAuthenticated) return setNote('Sign in')
                const r = requestJoin(hostId, user)
                setNote(r.ok ? 'Request sent' : r.error)
                refresh()
              }}
            >
              Request to join
            </button>
            <label className="flex items-center gap-1 text-[11px] text-zinc-400">
              <input
                type="checkbox"
                checked={acceptsInvites(user?.id)}
                onChange={(e) => { setAcceptInvites(user?.id, e.target.checked); refresh() }}
              />
              Accept invites
            </label>
          </div>
        )}
      </section>

      {/* Raid */}
      {isHost ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Raid</p>
          <div className="flex flex-wrap gap-2">
            <select value={raidTo} onChange={(e) => setRaidTo(e.target.value)} className="h-9 rounded border border-zinc-700 bg-black px-2 text-xs text-white">
              <option value="">Raid to…</option>
              {othersLive.map((s) => (
                <option key={s.userId} value={s.userId}>@{s.handle} · {s.watchers || 0}</option>
              ))}
            </select>
            <button
              type="button"
              className="h-9 px-3 rounded bg-white text-black text-xs font-semibold"
              onClick={() => {
                const to = othersLive.find((s) => s.userId === raidTo)
                const from = (lsGet('live_board', []) || []).find((s) => s.userId === hostId) || focusedStream
                const r = raidToStream({ from, to, watchers: from?.watchers || 0 })
                setNote(r.ok ? 'Raid sent' : r.error)
                refresh()
              }}
            >
              Send raid
            </button>
          </div>
        </section>
      ) : null}

      {/* Viewer actions */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-zinc-300">Interactive controls</p>
        <div className="flex flex-wrap gap-2">
          {VIEWER_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="h-8 px-2 rounded border border-zinc-700 text-[11px] text-zinc-200"
              onClick={() => {
                if (!isAuthenticated) return setNote('Sign in')
                const r = triggerViewerAction(hostId, user, a.id)
                setNote(r.ok ? `${a.label} queued` : r.error)
                refresh()
              }}
            >
              {a.label} · {a.cost}
            </button>
          ))}
        </div>
        {actions.length ? (
          <ul className="text-[11px] text-zinc-500 space-y-1">
            {actions.map((a) => (
              <li key={a.id}>@{a.fromHandle}: {a.label}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Escrow for host */}
      {isHost && escrow.length ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Request tips (escrow)</p>
          {escrow.map((r) => (
            <div key={r.id} className="text-[11px] text-zinc-400 flex flex-wrap gap-2 items-center">
              <span>{r.units} Cash · {r.status} · {r.requestText}</span>
              {r.status === 'held' ? (
                <button type="button" className="underline" onClick={() => { markRequestFulfilled(r.id, user.id); refresh() }}>Mark fulfilled</button>
              ) : null}
            </div>
          ))}
          <p className="text-[11px] text-zinc-600">Admin releases Cash after fulfillment.</p>
        </section>
      ) : null}

      {/* Multi-stream + filter (host) */}
      {isHost ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Multi-stream destinations</p>
          <p className="text-[11px] text-zinc-500">Broadcast to calabi + YouTube + TikTok at once when ingest/OAuth are connected. Unify chats in one UI.</p>
          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-300">
            {['calabi', 'youtube', 'tiktok', 'unifyChat'].map((k) => (
              <label key={k} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!multi[k]}
                  onChange={(e) => { setMultiStreamDest(user.id, { [k]: e.target.checked }); refresh() }}
                />
                {k}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="h-8 px-3 rounded border border-zinc-600 text-xs"
            onClick={() => {
              const r = queueAiHighlight({ userId: user.id, streamId: hostId, label: 'Auto clip' })
              setNote(r.ok ? 'AI clip queued for connected socials' : r.error)
            }}
          >
            AI clip → socials
          </button>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] text-zinc-500">Filter</span>
            <select
              value={filter.filterId}
              onChange={(e) => { setStreamFilter(user.id, { filterId: e.target.value }); refresh() }}
              className="h-8 rounded border border-zinc-700 bg-black px-2 text-xs text-white"
            >
              {STREAM_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[11px] text-zinc-400">
              <input
                type="checkbox"
                checked={!!filter.bodyAvatar}
                onChange={(e) => { setStreamFilter(user.id, { bodyAvatar: e.target.checked }); refresh() }}
              />
              Full-body AI avatar overlay
            </label>
          </div>
        </section>
      ) : null}
    </div>
  )
}
