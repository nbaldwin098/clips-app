/**
 * Watch progress + library history for link-based clips.
 * Local always works; when Supabase is configured, same account resumes on any device.
 */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const HIST_PREF_KEY = 'clips_watch_history_enabled'
function isWatchHistoryEnabled() {
  return lsGet(HIST_PREF_KEY, true) !== false
}

const PROGRESS_KEY = 'clips_watch_progress'
const CONTINUE_KEY = 'clips_continue_watching'

function userMap(userId) {
  const all = lsGet(PROGRESS_KEY, {}) || {}
  return all[userId] || {}
}
function saveUserMap(userId, map) {
  const all = lsGet(PROGRESS_KEY, {}) || {}
  all[userId] = map
  lsSet(PROGRESS_KEY, all)
}

export function recordWatchProgress(userId, {
  contentId, title, sourceUrl, watchRatio = 0, durationSec = 0, positionSec = 0, creatorId = null, handle = null,
}) {
  if (!userId || !contentId || !isWatchHistoryEnabled()) return null
  const ratio = Math.max(0, Math.min(1, Number(watchRatio) || 0))
  const map = userMap(userId)
  const prev = map[contentId] || {}
  const row = {
    contentId,
    title: title || prev.title || contentId,
    sourceUrl: sourceUrl || prev.sourceUrl || '',
    watchRatio: Math.max(ratio, prev.watchRatio || 0),
    lastRatio: ratio,
    durationSec: durationSec || prev.durationSec || 0,
    positionSec: positionSec || (durationSec ? ratio * durationSec : prev.positionSec || 0),
    creatorId: creatorId || prev.creatorId,
    handle: handle || prev.handle,
    updatedAt: new Date().toISOString(),
    completed: ratio >= 0.92,
  }
  map[contentId] = row
  const ordered = Object.values(map).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 300)
  const next = {}
  for (const r of ordered) next[r.contentId] = r
  saveUserMap(userId, next)
  const cont = lsGet(CONTINUE_KEY, {}) || {}
  const list = (cont[userId] || []).filter((id) => id !== contentId)
  if (!row.completed && ratio > 0.05) list.unshift(contentId)
  cont[userId] = list.slice(0, 40)
  lsSet(CONTINUE_KEY, cont)
  syncProgressToCloud(row)
  return row
}

export function getWatchProgress(userId, contentId) {
  if (!userId || !contentId) return null
  return userMap(userId)[contentId] || null
}

export function listWatchHistoryDetailed(userId) {
  if (!userId) return []
  return Object.values(userMap(userId)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

/** Finished videos and clips the user can rewatch from the library. */
export function listWatchAgain(userId) {
  if (!userId) return []
  return listWatchHistoryDetailed(userId).filter((row) => row.completed || (row.watchRatio || 0) >= 0.92)
}

export function listContinueWatching(userId) {
  if (!userId) return []
  const ids = (lsGet(CONTINUE_KEY, {}) || {})[userId] || []
  const map = userMap(userId)
  return ids.map((id) => map[id]).filter(Boolean).filter((r) => !r.completed && (r.lastRatio || r.watchRatio) > 0.05)
}

export function clearWatchProgress(userId) {
  if (!userId) return
  const all = lsGet(PROGRESS_KEY, {}) || {}
  all[userId] = {}
  lsSet(PROGRESS_KEY, all)
  const cont = lsGet(CONTINUE_KEY, {}) || {}
  cont[userId] = []
  lsSet(CONTINUE_KEY, cont)
}

export function percentLabel(ratio) {
  return `${Math.max(0, Math.min(100, Math.round((Number(ratio) || 0) * 100)))}%`
}

async function syncProgressToCloud(row) {
  if (!isSupabaseConfigured()) return
  try {
    const sb = await getSupabase()
    if (!sb) return
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('watch_progress').upsert({
      user_id: user.id,
      content_id: row.contentId,
      title: row.title,
      source_url: row.sourceUrl,
      watch_ratio: row.watchRatio,
      last_ratio: row.lastRatio,
      position_sec: row.positionSec,
      duration_sec: row.durationSec,
      completed: row.completed,
      updated_at: row.updatedAt,
    }, { onConflict: 'user_id,content_id' })
  } catch {}
}

export async function pullWatchProgressFromCloud(localUserId) {
  if (!isSupabaseConfigured()) return listWatchHistoryDetailed(localUserId)
  try {
    const sb = await getSupabase()
    if (!sb) return listWatchHistoryDetailed(localUserId)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return listWatchHistoryDetailed(localUserId)
    const { data, error } = await sb.from('watch_progress').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(300)
    if (error || !data) return listWatchHistoryDetailed(localUserId)
    const map = userMap(localUserId)
    for (const r of data) {
      map[r.content_id] = {
        contentId: r.content_id, title: r.title, sourceUrl: r.source_url,
        watchRatio: r.watch_ratio, lastRatio: r.last_ratio, positionSec: r.position_sec,
        durationSec: r.duration_sec, completed: r.completed, updatedAt: r.updated_at,
      }
    }
    saveUserMap(localUserId, map)
    return listWatchHistoryDetailed(localUserId)
  } catch {
    return listWatchHistoryDetailed(localUserId)
  }
}
