/**
 * Live ads: viewers get the video VAST tag 30s after they open a stream.
 * Creators run / schedule mid-stream ads on zone 6010934.
 */
import { lsGet, lsSet } from './storage'
import { isChannelMod } from './channelStaff'

export const LIVE_VIEWER_AD_DELAY_SEC = 30
/** Minimum gap between mid-stream commercial breaks (!ad, Run ad, repeat timers). */
export const LIVE_AD_COOLDOWN_SEC = 300
export const EXOCLICK_LIVE_CREATOR_ZONE = '6010934'
export const EXOCLICK_LIVE_CREATOR_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idz=6010934'

const KEY = 'clips_live_ads'

export function getLiveAdState(channelId) {
  if (!channelId) {
    return { intervalSec: 0, schedules: [], cue: null, autoFrom: 0 }
  }
  const all = lsGet(KEY, {}) || {}
  const row = all[channelId] || {}
  return {
    intervalSec: Math.max(0, Number(row.intervalSec) || 0),
    schedules: Array.isArray(row.schedules) ? row.schedules : [],
    cue: row.cue || null,
    autoFrom: Number(row.autoFrom) || 0,
    lastCueAt: Number(row.lastCueAt) || 0,
    updatedAt: row.updatedAt || '',
  }
}

export function setLiveAdState(channelId, partial) {
  if (!channelId) return null
  const all = lsGet(KEY, {}) || {}
  const next = { ...getLiveAdState(channelId), ...partial, updatedAt: new Date().toISOString() }
  all[channelId] = next
  lsSet(KEY, all)
  return next
}

function stampLiveBoard(channelId, cue) {
  const board = lsGet('live_board', []) || []
  lsSet('live_board', board.map((b) => (b.userId === channelId ? { ...b, adCue: cue } : b)))
  const state = lsGet(`live_state_${channelId}`, null)
  if (state?.isLive) lsSet(`live_state_${channelId}`, { ...state, adCue: cue })
}

export function liveAdLockedUntil(channelId, now = Date.now()) {
  const last = Number(getLiveAdState(channelId).lastCueAt || 0)
  if (!last) return 0
  return last + LIVE_AD_COOLDOWN_SEC * 1000
}

export function liveAdCooldownRemaining(channelId, now = Date.now()) {
  return Math.max(0, liveAdLockedUntil(channelId, now) - now)
}

export function clampLiveAdIntervalSec(sec) {
  const n = Math.max(0, Number(sec) || 0)
  if (!n) return 0
  return Math.max(LIVE_AD_COOLDOWN_SEC, n)
}

export function cueLiveAd(channelId, zone = 'live-creator', now = Date.now()) {
  if (!channelId) return { ok: false, error: 'No live channel.' }
  const waitMs = liveAdCooldownRemaining(channelId, now)
  if (waitMs > 0) {
    const waitSec = Math.ceil(waitMs / 1000)
    return {
      ok: false,
      waitSec,
      error: `Wait ${formatWait(waitSec)} between commercial breaks (minimum 5 minutes).`,
    }
  }
  const cue = {
    id: `cue-${now}-${Math.random().toString(36).slice(2, 7)}`,
    at: now,
    zone,
  }
  setLiveAdState(channelId, { cue, lastCueAt: now })
  stampLiveBoard(channelId, cue)
  return { ok: true, cue }
}

export function readLiveAdCue(channelId) {
  if (!channelId) return null
  const board = (lsGet('live_board', []) || []).find((b) => b.userId === channelId)
  return board?.adCue || getLiveAdState(channelId).cue || null
}

export function scheduleLiveAd(channelId, atMs) {
  const t = Number(atMs)
  if (!channelId || !t) return { ok: false, error: 'Pick a time.' }
  const now = Date.now()
  const earliest = Math.max(now + 5000, liveAdLockedUntil(channelId, now))
  const at = Math.max(t, earliest)
  if (at < now + 5000) return { ok: false, error: 'Schedule at least 5 seconds ahead.' }
  const schedules = [...getLiveAdState(channelId).schedules, { id: `sch-${at}`, at }]
    .filter((s) => s.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, 20)
  setLiveAdState(channelId, { schedules })
  return { ok: true, at }
}

export function cancelLiveAdSchedule(channelId, id) {
  const schedules = getLiveAdState(channelId).schedules.filter((s) => s.id !== id)
  setLiveAdState(channelId, { schedules })
  return schedules
}

export function setLiveAdInterval(channelId, sec) {
  const n = clampLiveAdIntervalSec(sec)
  setLiveAdState(channelId, { intervalSec: n, autoFrom: n ? Date.now() : 0 })
  return n
}

export function consumeDueSchedule(channelId, now = Date.now()) {
  if (liveAdCooldownRemaining(channelId, now) > 0) return false
  const st = getLiveAdState(channelId)
  const due = (st.schedules || []).filter((s) => s.at <= now)
  if (!due.length) return false
  const rest = st.schedules.filter((s) => s.at > now)
  const cued = cueLiveAd(channelId, 'live-creator', now)
  if (!cued.ok) return false
  setLiveAdState(channelId, { schedules: rest, cue: cued.cue, lastCueAt: now })
  return true
}

export function consumeDueInterval(channelId, now = Date.now()) {
  if (liveAdCooldownRemaining(channelId, now) > 0) return false
  const st = getLiveAdState(channelId)
  const interval = clampLiveAdIntervalSec(st.intervalSec)
  if (!interval || !st.autoFrom) return false
  if (now - st.autoFrom < interval * 1000) return false
  const cued = cueLiveAd(channelId, 'live-creator', now)
  if (!cued.ok) return false
  setLiveAdState(channelId, { intervalSec: interval, autoFrom: now, cue: cued.cue, lastCueAt: now })
  return true
}

export function parseLooseDuration(raw) {
  const t = String(raw || '').trim().toLowerCase()
  const m = t.match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/)
  if (!m) return 0
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return 0
  const u = m[2] || 'm'
  if (u.startsWith('s')) return Math.max(10, n)
  if (u.startsWith('h')) return n * 3600
  return n * 60
}

export function parseAdSlash(text) {
  const parts = String(text || '').trim().split(/\s+/).filter(Boolean)
  const cmd = (parts[0] || '').toLowerCase()
  if (cmd === '!ads') return { action: 'status' }
  if (cmd !== '!ad') return null
  if (parts.length === 1 || /^now$/i.test(parts[1])) return { action: 'now' }
  if (/^off$/i.test(parts[1])) return { action: 'off' }
  if (/^help$/i.test(parts[1])) return { action: 'help' }
  if (/^every$/i.test(parts[1])) {
    const sec = parseLooseDuration(parts.slice(2).join(' '))
    return sec ? { action: 'interval', sec } : { action: 'help' }
  }
  const sec = parseLooseDuration(parts.slice(1).join(' '))
  if (sec) return { action: 'schedule', sec }
  return { action: 'help' }
}

function formatWait(sec) {
  if (sec < 90) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}m`
  return `${Math.round(sec / 3600)}h`
}

export function liveAdStatusText(channelId) {
  const st = getLiveAdState(channelId)
  const bits = []
  if (st.intervalSec) bits.push(`repeats every ${formatWait(st.intervalSec)}`)
  else bits.push('repeat is off')
  const upcoming = (st.schedules || []).filter((s) => s.at > Date.now())
  if (upcoming.length) bits.push(`${upcoming.length} scheduled`)
  const wait = liveAdCooldownRemaining(channelId)
  if (wait > 0) bits.push(`next break in ${formatWait(wait / 1000)}`)
  return `Live ads: ${bits.join(' · ')}. Minimum 5 minutes between breaks. !ad now · !ad 5m · !ad every 15m · !ad off`
}

export function applyAdSlash(channelId, user, text) {
  const parsed = parseAdSlash(text)
  if (!parsed) return { ok: false }
  if (!channelId) return { ok: false, error: 'No live channel.' }
  if (!isChannelMod(channelId, user)) {
    return { ok: false, error: 'Only the creator or a mod can run ads.' }
  }
  if (parsed.action === 'help' || parsed.action === 'status') {
    return { ok: true, botReply: liveAdStatusText(channelId) }
  }
  if (parsed.action === 'now') {
    const cued = cueLiveAd(channelId, 'live-creator')
    if (!cued.ok) return { ok: false, botReply: cued.error }
    return { ok: true, botReply: 'Playing a mid-stream ad now. Next break in 5 minutes.' }
  }
  if (parsed.action === 'off') {
    setLiveAdInterval(channelId, 0)
    return { ok: true, botReply: 'Stopped repeating live ads.' }
  }
  if (parsed.action === 'interval') {
    const sec = clampLiveAdIntervalSec(parsed.sec)
    setLiveAdInterval(channelId, sec)
    const note = parsed.sec < LIVE_AD_COOLDOWN_SEC ? ' (raised to the 5 minute minimum)' : ''
    return { ok: true, botReply: `Repeating a mid-stream ad every ${formatWait(sec)}.${note}` }
  }
  if (parsed.action === 'schedule') {
    const at = Date.now() + parsed.sec * 1000
    const res = scheduleLiveAd(channelId, at)
    if (!res.ok) return { ok: false, botReply: res.error || 'Could not schedule.' }
    const waitSec = Math.max(1, Math.round((res.at - Date.now()) / 1000))
    return { ok: true, botReply: `Ad scheduled in ${formatWait(waitSec)}.` }
  }
  return { ok: false }
}
