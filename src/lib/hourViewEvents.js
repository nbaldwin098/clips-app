import { lsGet, lsSet } from './storage'
import { lastHourRange } from './hourWindow'

const EVENTS_KEY = 'clips_hour_view_events'
const MAX_EVENTS_PER_ID = 400
const KEEP_MS = 26 * 60 * 60 * 1000

export function recordHourView(contentId, at = Date.now()) {
  if (!contentId) return
  const all = lsGet(EVENTS_KEY, {}) || {}
  const keepAfter = at - KEEP_MS
  const next = (all[contentId] || []).filter((t) => Number(t) >= keepAfter)
  next.push(at)
  all[contentId] = next.slice(-MAX_EVENTS_PER_ID)
  lsSet(EVENTS_KEY, all)
}

export function hourViewCount(contentId, start, end) {
  if (!contentId) return 0
  const list = (lsGet(EVENTS_KEY, {}) || {})[contentId] || []
  let n = 0
  for (const t of list) {
    const ts = Number(t)
    if (ts >= start && ts < end) n += 1
  }
  return n
}

export function hourViewsInCurrentLookback(contentId, now = Date.now()) {
  const { start, end } = lastHourRange(now)
  return hourViewCount(contentId, start, end)
}
