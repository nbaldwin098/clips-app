import { lsGet, lsSet } from './storage'

const KEY = 'clips_channel_staff'

export const DEFAULT_STAFF = {
  mods: [],
  vips: [],
  editors: [],
  rules: '',
  botsEnabled: true,
  botName: 'Desk bot',
  commands: [],
  timeouts: {},
  bans: {},
}

export function getChannelStaff(channelId) {
  if (!channelId) return { ...DEFAULT_STAFF }
  const all = lsGet(KEY, {}) || {}
  return { ...DEFAULT_STAFF, ...(all[channelId] || {}) }
}

export function setChannelStaff(channelId, partial) {
  if (!channelId) return null
  const all = lsGet(KEY, {}) || {}
  const next = { ...getChannelStaff(channelId), ...partial, updatedAt: new Date().toISOString() }
  all[channelId] = next
  lsSet(KEY, all)
  return next
}

export function addRole(channelId, role, entry) {
  const staff = getChannelStaff(channelId)
  const list = (staff[role] || []).filter((r) => r.handle !== entry.handle && r.userId !== entry.userId)
  list.push({ handle: String(entry.handle || '').replace(/^@/, ''), userId: entry.userId || '', at: new Date().toISOString() })
  return setChannelStaff(channelId, { [role]: list })
}

export function removeRole(channelId, role, handle) {
  const staff = getChannelStaff(channelId)
  const h = String(handle || '').replace(/^@/, '').toLowerCase()
  const list = (staff[role] || []).filter((r) => String(r.handle || '').toLowerCase() !== h)
  return setChannelStaff(channelId, { [role]: list })
}

export function isChannelMod(channelId, user) {
  if (!user?.id || !channelId) return false
  if (user.id === channelId) return true
  const staff = getChannelStaff(channelId)
  return (staff.mods || []).some((m) => m.userId === user.id || String(m.handle || '').toLowerCase() === String(user.handle || '').toLowerCase())
}

export function timeoutChatUser(channelId, userId, seconds) {
  const staff = getChannelStaff(channelId)
  const timeouts = { ...(staff.timeouts || {}) }
  timeouts[userId] = Date.now() + Math.max(10, Number(seconds) || 60) * 1000
  return setChannelStaff(channelId, { timeouts })
}

export function banChatUser(channelId, userId, banned = true) {
  const staff = getChannelStaff(channelId)
  const bans = { ...(staff.bans || {}) }
  if (banned) bans[userId] = true
  else delete bans[userId]
  return setChannelStaff(channelId, { bans })
}

export function addBotCommand(channelId, trigger, reply) {
  const staff = getChannelStaff(channelId)
  const t = String(trigger || '').trim().toLowerCase().replace(/^!*/, '!')
  if (!t.startsWith('!') || t.length < 2) return staff
  const commands = (staff.commands || []).filter((c) => c.trigger !== t)
  commands.push({ trigger: t, reply: String(reply || '').slice(0, 400), enabled: true })
  return setChannelStaff(channelId, { commands })
}

export function removeBotCommand(channelId, trigger) {
  const staff = getChannelStaff(channelId)
  const commands = (staff.commands || []).filter((c) => c.trigger !== trigger)
  return setChannelStaff(channelId, { commands })
}
