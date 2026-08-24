/**
 * Named people accounts keep using the catalog the way a viewer would:
 * scroll recommended / clips / pics, finish watches, sit in live lobbies,
 * and like. They never unlike, comment, or send live chat.
 * When Supabase is configured, public.run_named_activity (migration 0009)
 * is the job that keeps going. This browser loop is only the offline fallback.
 */
import { lsGet, lsSet } from '../lib/storage'
import { NAMED_ACCOUNTS } from '../data/namedAccountsSeed'
import { getHomeFeed, getShortsFeed, recordContentView } from './contentService'
import { getPicsFeed } from './picsService'
import { ensureUpvote, recordView, addWatchSeconds, getUserVote } from './engagement'
import { recordInteraction, startSession } from './algorithmEngine'
import { recordWatchProgress } from './watchProgress'
import { notifyContentChanged } from './contentSync'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const CURSOR_KEY = 'named_activity_cursor'
const VIEWED_KEY = 'named_activity_viewed'
const SESSION_KEY = 'named_activity_sessions'
const BATCH = 8
const TICK_MS = 450

let timer = null
let catalogCache = { at: 0, items: [] }
let ticks = 0

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

function sitInLiveLobbies(userId) {
  const board = lsGet('live_board', [])
  if (!Array.isArray(board) || !board.length) return
  let changed = false
  const next = board.map((row) => {
    if (!row?.isLive) return row
    const ids = Array.isArray(row.watcherIds) ? row.watcherIds : []
    if (ids.includes(userId)) return row
    changed = true
    const watcherIds = [...ids, userId]
    return { ...row, watcherIds, watchers: watcherIds.length }
  })
  if (changed) lsSet('live_board', next)
}

function watchAndLike(account, item) {
  if (!account?.id || !item?.id) return
  if (item.creatorId === account.id || item.userId === account.id) return

  ensureSession(account.id)
  sitInLiveLobbies(account.id)

  const firstView = markViewed(account.id, item.id)
  if (firstView) {
    recordView(item.id)
    recordContentView(item.id)
  }

  const duration = Number(item.durationSec) || (item.type === 'pic' ? 8 : 30)
  recordWatchProgress(account.id, {
    contentId: item.id,
    title: item.title,
    sourceUrl: item.mediaUrl || item.sourceUrl,
    watchRatio: 1,
    durationSec: duration,
    positionSec: duration,
    creatorId: item.creatorId || item.userId,
    handle: item.handle,
  })
  addWatchSeconds(item.creatorId || item.userId, Math.min(duration, 45))

  const eventType = item.type === 'short' ? 'loop' : 'complete'
  recordInteraction(account.id, {
    contentId: item.id,
    type: eventType,
    watchRatio: 1,
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
  const people = NAMED_ACCOUNTS
  const items = catalogItems()
  if (!people.length) return

  const skipId = sessionUserId()
  let cursor = Number(lsGet(CURSOR_KEY, 0)) || 0
  const nItems = Math.max(items.length, 1)

  for (let i = 0; i < BATCH; i += 1) {
    const account = people[cursor % people.length]
    const item = items.length ? items[Math.floor(cursor / people.length) % nItems] : null
    cursor += 1
    if (!account || account.id === skipId) continue
    if (item) watchAndLike(account, item)
    else sitInLiveLobbies(account.id)
  }

  lsSet(CURSOR_KEY, cursor)
  ticks += 1
  if (ticks % 6 === 0) notifyContentChanged()
}

export { stepNamedActivity }

async function namedCloudJobReady() {
  if (!isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error, count } = await sb.from('named_people').select('n', { count: 'exact', head: true })
    return !error && Number(count) > 0
  } catch {
    return false
  }
}

export async function startNamedAccountActivity() {
  if (typeof window === 'undefined') return
  if (timer) return
  if (await namedCloudJobReady()) return
  stepNamedActivity()
  timer = window.setInterval(stepNamedActivity, TICK_MS)
}

export function stopNamedAccountActivity() {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}
