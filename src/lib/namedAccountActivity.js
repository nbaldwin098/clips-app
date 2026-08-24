/**
 * Named people accounts keep using the catalog the way a viewer would:
 * scroll recommended / clips / pics, finish watches, sit in live lobbies,
 * and like. They never unlike, comment, or send live chat.
 * Each person picks a random surface and a random item so they are not
 * locked in the same order. When the Supabase job is actually writing
 * watches, this tab loop stops.
 */
import { lsGet, lsSet } from '../lib/storage'
import { NAMED_ACCOUNTS } from '../data/namedAccountsSeed'
import { getHomeFeed, getShortsFeed, recordContentView } from './contentService'
import { getPicsFeed } from './picsService'
import { ensureUpvote, recordView, addWatchSeconds, getUserVote } from './engagement'
import { recordInteraction, startSession } from './algorithmEngine'
import { recordWatchProgress } from './watchProgress'
import { notifyContentChanged } from './contentSync'

const VIEWED_KEY = 'named_activity_viewed'
const SESSION_KEY = 'named_activity_sessions'
const TICK_MS = 450

let timer = null
let catalogCache = { at: 0, items: [] }
let ticks = 0

function pick(list) {
  if (!list?.length) return null
  return list[Math.floor(Math.random() * list.length)]
}

function sessionUserId() {
  return String(lsGet('user', null)?.id || '')
}

function catalogItems() {
  const now = Date.now()
  if (now - catalogCache.at < 12_000 && catalogCache.items.length) return catalogCache.items
  const byId = new Map()
  for (const item of [...getHomeFeed(null), ...getShortsFeed(null), ...getPicsFeed()]) {
    if (item?.id && !byId.has(item.id)) byId.set(item.id, item)
  }
  catalogCache = { at: now, items: [...byId.values()] }
  return catalogCache.items
}

function splitCatalog(items) {
  return {
    video: items.filter((i) => i.type === 'video'),
    short: items.filter((i) => i.type === 'short'),
    pic: items.filter((i) => i.type === 'pic'),
  }
}

function viewedMap() {
  const raw = lsGet(VIEWED_KEY, {})
  return raw && typeof raw === 'object' ? raw : {}
}

function markViewed(userId, contentId) {
  const all = viewedMap()
  const mine = { ...(all[userId] || {}) }
  if (mine[contentId]) return false
  mine[contentId] = 1
  all[userId] = mine
  lsSet(VIEWED_KEY, all)
  return true
}

function ensureSession(userId) {
  const started = lsGet(SESSION_KEY, {}) || {}
  if (started[userId]) return
  startSession(userId)
  started[userId] = 1
  lsSet(SESSION_KEY, started)
}

function liveRows() {
  const board = lsGet('live_board', [])
  return Array.isArray(board) ? board.filter((row) => row?.isLive) : []
}

function sitInOneLive(userId, row) {
  if (!userId || !row?.userId) return
  const board = lsGet('live_board', [])
  if (!Array.isArray(board) || !board.length) return
  const next = board.map((entry) => {
    if (entry.userId !== row.userId || !entry.isLive) return entry
    const ids = Array.isArray(entry.watcherIds) ? entry.watcherIds : []
    if (ids.includes(userId)) return entry
    const watcherIds = [...ids, userId]
    return { ...entry, watcherIds, watchers: watcherIds.length }
  })
  lsSet('live_board', next)
}

function pickItemFor(account, pool, fallback) {
  const unliked = (pool || []).filter((item) => getUserVote(account.id, item.id) !== 'up')
  return pick(unliked.length ? unliked : (pool?.length ? pool : fallback))
}

function watchAndLike(account, item) {
  if (!account?.id || !item?.id) return
  if (item.creatorId === account.id || item.userId === account.id) return

  ensureSession(account.id)

  const firstView = markViewed(account.id, item.id)
  if (firstView) {
    recordView(item.id)
    recordContentView(item.id)
  }

  const duration = Number(item.durationSec) || (item.type === 'pic' ? 8 : 30)
  const ratio = item.type === 'pic' ? 1 : Math.min(1, 0.62 + Math.random() * 0.38)
  recordWatchProgress(account.id, {
    contentId: item.id,
    title: item.title,
    sourceUrl: item.mediaUrl || item.sourceUrl,
    watchRatio: ratio,
    durationSec: duration,
    positionSec: Math.round(ratio * duration),
    creatorId: item.creatorId || item.userId,
    handle: item.handle,
  })
  addWatchSeconds(item.creatorId || item.userId, Math.min(duration * ratio, 45))

  const eventType = item.type === 'short' ? 'loop' : 'complete'
  recordInteraction(account.id, {
    contentId: item.id,
    type: eventType,
    watchRatio: ratio,
    tags: item.tags || [],
    creatorId: item.creatorId || item.userId,
    title: item.title,
  })

  if (getUserVote(account.id, item.id) !== 'up') {
    ensureUpvote(account.id, item.id)
    recordInteraction(account.id, {
      contentId: item.id,
      type: 'upvote',
      tags: item.tags || [],
      creatorId: item.creatorId || item.userId,
      title: item.title,
    })
  }
}

function stepNamedActivity() {
  const skipId = sessionUserId()
  const people = NAMED_ACCOUNTS.filter((row) => row.id !== skipId)
  const items = catalogItems()
  const by = splitCatalog(items)
  const live = liveRows()
  if (!people.length) return

  const batch = 5 + Math.floor(Math.random() * 7)
  const used = new Set()

  for (let i = 0; i < batch; i += 1) {
    const account = pick(people)
    if (!account) continue
    const roll = Math.random()

    if (roll < 0.18 && live.length) {
      sitInOneLive(account.id, pick(live))
      continue
    }

    let pool = by.video
    if (roll < 0.42) pool = by.pic
    else if (roll < 0.72) pool = by.short

    const item = pickItemFor(account, pool, items)
    if (!item) {
      if (live.length) sitInOneLive(account.id, pick(live))
      continue
    }
    const key = `${account.id}:${item.id}`
    if (used.has(key)) continue
    used.add(key)
    watchAndLike(account, item)
    if (Math.random() < 0.35 && live.length) sitInOneLive(account.id, pick(live))
  }

  ticks += 1
  if (ticks % 6 === 0) notifyContentChanged()
}

export { stepNamedActivity }

export async function startNamedAccountActivity() {
  if (typeof window === 'undefined') return
  if (timer) return
  const tick = () => { stepNamedActivity() }
  tick()
  timer = window.setInterval(tick, TICK_MS)
}

export function stopNamedAccountActivity() {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}
