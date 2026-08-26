/**
 * Streamer vs streamer challenges + hourly Ghost AI.
 * - Queue of challenges between live groups (2+).
 * - One Ghost AI matchup per hour (random host, random ghost points).
 * - Each challenge lasts 3 minutes; donations (Cash) fill the score.
 */

import { lsGet, lsSet } from './storage'
import { postLiveChat } from './engagement'
import { spendCalabiCash, creditCalabiCash, creatorCashShare } from './calabiCash'
import { CREATOR_REV_SHARE } from './revenueSplit'

const QUEUE = 'live_challenge_queue'
const ACTIVE = 'live_challenge_active'
const GHOST_HOUR = 'live_ghost_hour'
const DURATION_MS = 3 * 60 * 1000

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getChallengeDurationMs() {
  return DURATION_MS
}

export function listChallengeQueue() {
  return lsGet(QUEUE, []) || []
}

export function getActiveChallenge() {
  const c = lsGet(ACTIVE, null)
  if (!c) return null
  if (c.endsAt && Date.now() > c.endsAt && c.status === 'live') {
    return settleChallenge(c)
  }
  return c
}

export function enqueueChallenge({ challengerId, challengerHandle, targetId, targetHandle }) {
  if (!challengerId || !targetId) return { ok: false, error: 'Need both sides.' }
  if (challengerId === targetId) return { ok: false, error: 'Cannot challenge yourself.' }
  const q = listChallengeQueue()
  if (q.some((r) => r.challengerId === challengerId || r.targetId === challengerId)) {
    return { ok: false, error: 'Already in queue.' }
  }
  const row = {
    id: `chq_${Date.now().toString(36)}`,
    challengerId,
    challengerHandle: challengerHandle || 'streamer',
    targetId,
    targetHandle: targetHandle || 'streamer',
    at: new Date().toISOString(),
  }
  q.push(row)
  lsSet(QUEUE, q.slice(-40))
  return { ok: true, row }
}

export function cancelQueueEntry(id, actorId) {
  const q = listChallengeQueue().filter((r) => !(r.id === id && (r.challengerId === actorId || r.targetId === actorId)))
  lsSet(QUEUE, q)
  return { ok: true }
}

function ghostHourKey() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
}

export function ghostUsedThisHour() {
  return lsGet(GHOST_HOUR, '') === ghostHourKey()
}

function markGhostHour() {
  lsSet(GHOST_HOUR, ghostHourKey())
}

/** Start next queued challenge; optionally force Ghost once/hour. */
export function startNextChallenge({ preferGhost = false, hostCandidates = [] } = {}) {
  if (getActiveChallenge()?.status === 'live') return { ok: false, error: 'A challenge is already live.' }
  const useGhost = (preferGhost || Math.random() < 0.35) && !ghostUsedThisHour()
  if (useGhost && hostCandidates.length) {
    const host = hostCandidates[randInt(0, hostCandidates.length - 1)]
    const ghostPoints = randInt(200, 2500)
    const challenge = {
      id: `chg_${Date.now().toString(36)}`,
      kind: 'ghost',
      aId: host.userId,
      aHandle: host.handle || 'host',
      aScore: 0,
      bId: 'ghost_ai',
      bHandle: 'Ghost AI',
      bScore: ghostPoints,
      ghostPoints,
      status: 'live',
      startedAt: Date.now(),
      endsAt: Date.now() + DURATION_MS,
    }
    markGhostHour()
    lsSet(ACTIVE, challenge)
    announce(challenge, `Ghost AI challenge! Beat ${ghostPoints} Cash in 3 minutes.`)
    return { ok: true, challenge }
  }
  const q = listChallengeQueue()
  const next = q.shift()
  if (!next) return { ok: false, error: 'Queue empty.' }
  lsSet(QUEUE, q)
  const challenge = {
    id: `chg_${Date.now().toString(36)}`,
    kind: 'pvp',
    aId: next.challengerId,
    aHandle: next.challengerHandle,
    aScore: 0,
    bId: next.targetId,
    bHandle: next.targetHandle,
    bScore: 0,
    status: 'live',
    startedAt: Date.now(),
    endsAt: Date.now() + DURATION_MS,
  }
  lsSet(ACTIVE, challenge)
  announce(challenge, `${challenge.aHandle} vs ${challenge.bHandle} — 3 minutes!`)
  return { ok: true, challenge }
}

function announce(challenge, text) {
  for (const id of [challenge.aId, challenge.bId]) {
    if (!id || id === 'ghost_ai') continue
    postLiveChat(id, {
      userId: 'system:challenge',
      handle: 'calabi',
      kind: 'system',
      text,
    })
  }
}

export function contributeToChallenge(side, donor, units) {
  const c = getActiveChallenge()
  if (!c || c.status !== 'live') return { ok: false, error: 'No live challenge.' }
  if (!donor?.id) return { ok: false, error: 'Sign in.' }
  const n = Math.floor(Number(units) || 0)
  if (n < 1) return { ok: false, error: 'Enter Cash.' }
  const spent = spendCalabiCash(donor.id, n, { kind: 'challenge', note: c.id, targetId: side })
  if (!spent.ok) return spent
  if (side === 'a') c.aScore += n
  else c.bScore += n
  const share = creatorCashShare(n, CREATOR_REV_SHARE)
  const hostId = side === 'a' ? c.aId : c.bId
  if (hostId && hostId !== 'ghost_ai') {
    creditCalabiCash(hostId, share.creator, { kind: 'challenge_earn', note: c.id })
  }
  lsSet(ACTIVE, c)
  if (Date.now() > c.endsAt) return { ok: true, challenge: settleChallenge(c) }
  return { ok: true, challenge: c }
}

export function settleChallenge(raw) {
  const c = { ...raw, status: 'settled', settledAt: Date.now() }
  if (c.kind === 'ghost') {
    const beat = c.aScore >= c.bScore
    c.winnerId = beat ? c.aId : 'ghost_ai'
    if (beat) {
      const bonus = Math.floor(c.ghostPoints * 0.5)
      creditCalabiCash(c.aId, bonus, { kind: 'ghost_win', note: 'Ghost AI defeated' })
      postLiveChat(c.aId, {
        userId: 'system:challenge',
        handle: 'calabi',
        kind: 'system',
        text: `Ghost defeated! You keep your score plus ${bonus} bonus Cash.`,
      })
    } else {
      postLiveChat(c.aId, {
        userId: 'system:challenge',
        handle: 'calabi',
        kind: 'system',
        text: `Ghost wins this round (${c.aScore} vs ${c.bScore}).`,
      })
    }
  } else {
    c.winnerId = c.aScore === c.bScore ? '' : (c.aScore > c.bScore ? c.aId : c.bId)
    const text = c.winnerId
      ? `Challenge over — winner @${c.winnerId === c.aId ? c.aHandle : c.bHandle} (${c.aScore}–${c.bScore})`
      : `Challenge tied ${c.aScore}–${c.bScore}`
    announce(c, text)
  }
  lsSet(ACTIVE, c)
  return c
}

export function clearSettledChallenge() {
  const c = lsGet(ACTIVE, null)
  if (c?.status === 'settled') lsSet(ACTIVE, null)
}
