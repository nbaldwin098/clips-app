/**
 * Live ads: viewers get the video VAST tag 30s after they open a stream.
 * Creators set 1–5 automated ads/hour in settings and run manual breaks while live.
 */
import { lsGet, lsSet } from './storage'
import { isChannelMod } from './channelStaff'
import { AD_ZONES, vastUrlFor } from './adZones.js'

export const LIVE_VIEWER_AD_DELAY_SEC = 30
export const LIVE_SNOOZE_SEC = 300
export const LIVE_HOURLY_AD_CAP_SEC = 6 * 60
export const LIVE_ADS_PER_HOUR_MIN = 1
export const LIVE_ADS_PER_HOUR_MAX = 5
export const MANUAL_AD_BREAKS = [60, 90, 180]
export const EXOCLICK_LIVE_CREATOR_ZONE = AD_ZONES.liveCreator.id
export const EXOCLICK_LIVE_CREATOR_VAST_URL = vastUrlFor('liveCreator')

/** @deprecated manual ads use manualAdCooldownSec */
export const LIVE_AD_COOLDOWN_SEC = 300

const KEY = 'clips_live_ads'

export function clampLiveAdsPerHour(n) {
  const v = Math.round(Number(n) || 0)
  if (v <= 0) return 0
  return Math.max(LIVE_ADS_PER_HOUR_MIN, Math.min(LIVE_ADS_PER_HOUR_MAX, v))
}

export function liveAdIntervalFromPerHour(perHour) {
  const n = clampLiveAdsPerHour(perHour)
  if (!n) return 0
  return Math.floor(3600 / n)
}

export function clampManualBreakSec(sec) {
  const n = Math.round(Number(sec) || 0)
  if (MANUAL_AD_BREAKS.includes(n)) return n
  if (n <= 60) return 60
  if (n <= 90) return 90
  return 180
}

/** Cooldown after a manual break — matches 60s→1.5m, 90s→4.5m, 180s→9m */
export function manualAdCooldownSec(breakSec) {
  const s = clampManualBreakSec(breakSec)
  const mult = s <= 60 ? 1.5 : 3
  return Math.round(s * mult)
}

function resolveAdsPerHour(row = {}) {
  if (row.adsPerHour != null && row.adsPerHour !== '') {
    return clampLiveAdsPerHour(row.adsPerHour)
  }
  const interval = Math.max(0, Number(row.intervalSec) || 0)
  if (!interval) return 0
  return clampLiveAdsPerHour(Math.round(3600 / interval))
}

function trimAdLog(log = [], now = Date.now()) {
  const cutoff = now - 2 * 3600000
  return (Array.isArray(log) ? log : [])
    .filter((e) => e?.at >= cutoff)
    .slice(-120)
}

export function getLiveAdState(channelId) {
  if (!channelId) {
    return {
      adsPerHour: 0,
      intervalSec: 0,
      schedules: [],
      cue: null,
      autoFrom: 0,
      lastCueAt: 0,
      snoozeUntil: 0,
      manualLockedUntil: 0,
      adTimeLog: [],
    }
  }
  const all = lsGet(KEY, {}) || {}
  const row = all[channelId] || {}
  const adsPerHour = resolveAdsPerHour(row)
  return {
    adsPerHour,
    intervalSec: liveAdIntervalFromPerHour(adsPerHour),
    schedules: Array.isArray(row.schedules) ? row.schedules : [],
    cue: row.cue || null,
    autoFrom: Number(row.autoFrom) || 0,
    lastCueAt: Number(row.lastCueAt) || 0,
    snoozeUntil: Number(row.snoozeUntil) || 0,
    manualLockedUntil: Number(row.manualLockedUntil) || 0,
    adTimeLog: trimAdLog(row.adTimeLog),
    updatedAt: row.updatedAt || '',
  }
}

export function setLiveAdState(channelId, partial) {
  if (!channelId) return null
  const all = lsGet(KEY, {}) || {}
  const prev = all[channelId] || {}
  const merged = { ...getLiveAdState(channelId), ...partial }
  if (partial?.adTimeLog) merged.adTimeLog = trimAdLog(partial.adTimeLog)
  const next = { ...merged, updatedAt: new Date().toISOString() }
  all[channelId] = { ...prev, ...next }
  lsSet(KEY, all)
  return next
}

function stampLiveBoard(channelId, cue) {
  const board = lsGet('live_board', []) || []
  lsSet('live_board', board.map((b) => (b.userId === channelId ? { ...b, adCue: cue || null } : b)))
  const state = lsGet(`live_state_${channelId}`, null)
  if (state?.isLive) lsSet(`live_state_${channelId}`, { ...state, adCue: cue || null })
}

export function liveAdsSnoozed(channelId, now = Date.now()) {
  return Number(getLiveAdState(channelId).snoozeUntil || 0) > now
}

export function snoozeLiveAds(channelId, now = Date.now()) {
  if (!channelId) return null
  const until = now + LIVE_SNOOZE_SEC * 1000
  setLiveAdState(channelId, { snoozeUntil: until })
  return until
}

export function liveAdTimeUsedInHour(channelId, now = Date.now(), kinds = ['manual', 'auto']) {
  const log = getLiveAdState(channelId).adTimeLog || []
  const cutoff = now - 3600000
  return log
    .filter((e) => e?.at >= cutoff && kinds.includes(e.kind))
    .reduce((sum, e) => sum + (Number(e.sec) || 0), 0)
}

export function manualAdCooldownRemaining(channelId, now = Date.now()) {
  return Math.max(0, Number(getLiveAdState(channelId).manualLockedUntil || 0) - now)
}

export function canPlayLiveAd(channelId, { breakSec = 60, kind = 'manual', now = Date.now() } = {}) {
  if (!channelId) return { ok: false, error: 'No live channel.' }
  if (liveAdsSnoozed(channelId, now)) {
    return { ok: false, error: `Ads snoozed for ${formatWait(Math.ceil((getLiveAdState(channelId).snoozeUntil - now) / 1000))}.` }
  }
  if (kind === 'manual' || kind === 'auto') {
    const used = liveAdTimeUsedInHour(channelId, now)
    const need = kind === 'manual' ? clampManualBreakSec(breakSec) : 60
    if (used + need > LIVE_HOURLY_AD_CAP_SEC) {
      return { ok: false, error: 'Hourly ad cap reached (6 minutes of ads per hour).' }
    }
  }
  if (kind === 'manual') {
    const waitMs = manualAdCooldownRemaining(channelId, now)
    if (waitMs > 0) {
      return { ok: false, error: `Wait ${formatWait(Math.ceil(waitMs / 1000))} after the last manual ad.` }
    }
  }
  return { ok: true }
}

function normalizeCueOpts(zoneOrOpts, arg3) {
  let zone = 'live-creator'
  let opts = {}
  if (typeof zoneOrOpts === 'string') {
    zone = zoneOrOpts
    opts = typeof arg3 === 'number' ? { now: arg3 } : (arg3 || {})
  } else if (zoneOrOpts && typeof zoneOrOpts === 'object') {
    opts = zoneOrOpts
    zone = opts.zone || 'live-creator'
  }
  const now = opts.now ?? Date.now()
  const kind = opts.kind ?? (zone === 'live-creator' ? 'manual' : 'viewer')
  const breakSec = clampManualBreakSec(opts.breakSec ?? 60)
  return { zone, kind, breakSec, now }
}

export function cueLiveAd(channelId, zoneOrOpts = 'live-creator', arg3 = {}) {
  if (!channelId) return { ok: false, error: 'No live channel.' }
  const { zone, kind, breakSec, now } = normalizeCueOpts(zoneOrOpts, arg3)
  const gate = canPlayLiveAd(channelId, { breakSec, kind, now })
  if (!gate.ok) return { ok: false, error: gate.error }

  const cue = {
    id: `cue-${now}-${Math.random().toString(36).slice(2, 7)}`,
    at: now,
    zone,
    kind,
    breakSec,
  }
  setLiveAdState(channelId, { cue, lastCueAt: now })
  stampLiveBoard(channelId, cue)
  return { ok: true, cue }
}

export function finishLiveAd(channelId, { playedSec = 0, breakSec = 60, kind = 'manual' } = {}) {
  if (!channelId) return
  const now = Date.now()
  const sec = Math.max(0, Math.round(Number(playedSec) || 0))
  const planned = clampManualBreakSec(breakSec)
  const st = getLiveAdState(channelId)
  const countsTowardCap = kind === 'manual' || kind === 'auto'
  const log = countsTowardCap
    ? trimAdLog([...(st.adTimeLog || []), { at: now, sec: sec || planned, kind }], now)
    : st.adTimeLog

  const partial = { adTimeLog: log, cue: null }

  if (kind === 'manual') {
    partial.manualLockedUntil = now + manualAdCooldownSec(planned) * 1000
    if (st.adsPerHour) partial.autoFrom = now
  } else if (kind === 'auto' && st.adsPerHour) {
    partial.autoFrom = now
  }

  setLiveAdState(channelId, partial)
  stampLiveBoard(channelId, null)
}

export function readLiveAdCue(channelId) {
  if (!channelId) return null
  const board = (lsGet('live_board', []) || []).find((b) => b.userId === channelId)
  return board?.adCue || getLiveAdState(channelId).cue || null
}

export function scheduleLiveAd(channelId, atMs, breakSec = 60) {
  const t = Number(atMs)
  if (!channelId || !t) return { ok: false, error: 'Pick a time.' }
  const now = Date.now()
  if (t < now + 5000) return { ok: false, error: 'Schedule at least 5 seconds ahead.' }
  const schedules = [...getLiveAdState(channelId).schedules, {
    id: `sch-${t}`,
    at: t,
    breakSec: clampManualBreakSec(breakSec),
  }]
    .filter((s) => s.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, 20)
  setLiveAdState(channelId, { schedules })
  return { ok: true, at: t }
}

export function cancelLiveAdSchedule(channelId, id) {
  const schedules = getLiveAdState(channelId).schedules.filter((s) => s.id !== id)
  setLiveAdState(channelId, { schedules })
  return schedules
}

export function setLiveAdsPerHour(channelId, perHour) {
  const adsPerHour = clampLiveAdsPerHour(perHour)
  const intervalSec = liveAdIntervalFromPerHour(adsPerHour)
  setLiveAdState(channelId, {
    adsPerHour,
    intervalSec,
    autoFrom: adsPerHour ? Date.now() : 0,
  })
  return adsPerHour
}

/** @deprecated use setLiveAdsPerHour */
export function setLiveAdInterval(channelId, sec) {
  const n = Math.max(0, Number(sec) || 0)
  if (!n) return setLiveAdsPerHour(channelId, 0)
  return setLiveAdsPerHour(channelId, Math.round(3600 / n))
}

export function consumeDueSchedule(channelId, now = Date.now()) {
  if (liveAdsSnoozed(channelId, now)) return false
  const st = getLiveAdState(channelId)
  const due = (st.schedules || []).filter((s) => s.at <= now)
  if (!due.length) return false
  const next = due[0]
  const rest = st.schedules.filter((s) => s.at > now)
  setLiveAdState(channelId, { schedules: rest })
  const cued = cueLiveAd(channelId, 'live-creator', {
    now,
    kind: 'manual',
    breakSec: next.breakSec || 60,
  })
  return cued.ok
}

export function consumeDueInterval(channelId, now = Date.now()) {
  if (liveAdsSnoozed(channelId, now)) return false
  const st = getLiveAdState(channelId)
  const interval = liveAdIntervalFromPerHour(st.adsPerHour)
  if (!interval || !st.autoFrom) return false
  if (now - st.autoFrom < interval * 1000) return false
  const cued = cueLiveAd(channelId, 'live-creator', { now, kind: 'auto', breakSec: 60 })
  return cued.ok
}

/** @deprecated manual ads use manualAdCooldownRemaining */
export function liveAdLockedUntil() {
  return 0
}

/** @deprecated manual ads use manualAdCooldownRemaining */
export function liveAdCooldownRemaining(channelId, now = Date.now()) {
  return manualAdCooldownRemaining(channelId, now)
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
  if (/^snooze$/i.test(parts[1])) return { action: 'snooze' }
  if (parts.length === 1 || /^now$/i.test(parts[1])) {
    const sec = parseLooseDuration(parts[2] || '60s') || 60
    return { action: 'manual', breakSec: clampManualBreakSec(sec) }
  }
  if (/^off$/i.test(parts[1])) return { action: 'off' }
  if (/^help$/i.test(parts[1])) return { action: 'help' }
  if (/^every$/i.test(parts[1])) {
    const rest = parts.slice(2).join(' ')
    const perHourMatch = rest.match(/^(\d+)\s*(?:\/\s*h(?:our)?s?|per\s*hour|ph)?$/i)
    if (perHourMatch) return { action: 'perHour', perHour: Number(perHourMatch[1]) }
    const sec = parseLooseDuration(rest)
    return sec ? { action: 'interval', sec } : { action: 'help' }
  }
  const sec = parseLooseDuration(parts.slice(1).join(' '))
  if (sec) return { action: 'schedule', sec, breakSec: clampManualBreakSec(sec) }
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
  if (st.adsPerHour) {
    const gap = liveAdIntervalFromPerHour(st.adsPerHour)
    bits.push(`auto ${st.adsPerHour}/hour (~${formatWait(gap)})`)
  } else bits.push('auto off')
  const used = liveAdTimeUsedInHour(channelId)
  bits.push(`${Math.round(used / 60)}m/${LIVE_HOURLY_AD_CAP_SEC / 60}m this hour`)
  if (liveAdsSnoozed(channelId)) bits.push('snoozed')
  const manualWait = manualAdCooldownRemaining(channelId)
  if (manualWait > 0) bits.push(`manual cooldown ${formatWait(manualWait / 1000)}`)
  const upcoming = (st.schedules || []).filter((s) => s.at > Date.now())
  if (upcoming.length) bits.push(`${upcoming.length} scheduled`)
  return `Live ads: ${bits.join(' · ')}. !ad now · !ad 90s · !ad snooze · !ad 3/h · !ad off`
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
  if (parsed.action === 'snooze') {
    snoozeLiveAds(channelId)
    return { ok: true, botReply: `All ads snoozed for ${LIVE_SNOOZE_SEC / 60} minutes.` }
  }
  if (parsed.action === 'manual') {
    const cued = cueLiveAd(channelId, 'live-creator', { kind: 'manual', breakSec: parsed.breakSec })
    if (!cued.ok) return { ok: false, botReply: cued.error }
    const cd = manualAdCooldownSec(parsed.breakSec)
    return { ok: true, botReply: `Manual ${parsed.breakSec}s ad queued. Cooldown after it ends: ${formatWait(cd)}.` }
  }
  if (parsed.action === 'off') {
    setLiveAdsPerHour(channelId, 0)
    return { ok: true, botReply: 'Stopped automated live ads.' }
  }
  if (parsed.action === 'perHour') {
    const n = setLiveAdsPerHour(channelId, parsed.perHour)
    if (!n) return { ok: false, botReply: `Pick ${LIVE_ADS_PER_HOUR_MIN}–${LIVE_ADS_PER_HOUR_MAX} automated ads per hour.` }
    const gap = liveAdIntervalFromPerHour(n)
    return { ok: true, botReply: `Automated ${n}/hour (~every ${formatWait(gap)}). Manual ads still available while live.` }
  }
  if (parsed.action === 'interval') {
    const perHour = clampLiveAdsPerHour(Math.round(3600 / Math.max(parsed.sec, 60)))
    const n = setLiveAdsPerHour(channelId, perHour)
    const gap = liveAdIntervalFromPerHour(n)
    return { ok: true, botReply: `Automated ${n}/hour (~every ${formatWait(gap)}).` }
  }
  if (parsed.action === 'schedule') {
    const at = Date.now() + parsed.sec * 1000
    const res = scheduleLiveAd(channelId, at, parsed.breakSec || 60)
    if (!res.ok) return { ok: false, botReply: res.error || 'Could not schedule.' }
    const waitSec = Math.max(1, Math.round((res.at - Date.now()) / 1000))
    return { ok: true, botReply: `Manual ad scheduled in ${formatWait(waitSec)}.` }
  }
  return { ok: false }
}
