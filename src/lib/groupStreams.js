/**
 * Group streams — co-hosts, invites, join requests, combined chat/donations.
 * Soft warn past GROUP_STREAM_WARN_AT co-hosts (no hard max).
 */

import { lsGet, lsSet } from './storage'
import { postLiveChat } from './engagement'

export const GROUP_STREAM_WARN_AT = 6

const KEY = 'group_streams'

function all() {
  return lsGet(KEY, {}) || {}
}

function save(map) {
  lsSet(KEY, map)
}

export function getGroupStream(hostId) {
  if (!hostId) return null
  return all()[hostId] || null
}

function ensure(hostId, hostHandle) {
  const map = all()
  if (!map[hostId]) {
    map[hostId] = {
      hostId,
      hostHandle: hostHandle || '',
      members: [],
      pendingInvites: [],
      pendingRequests: [],
      allowRequests: true,
      combineChat: true,
      combineDonations: true,
      autoSplitRevenue: true,
      updatedAt: new Date().toISOString(),
    }
    save(map)
  }
  return map[hostId]
}

export function setGroupPrefs(hostId, patch = {}) {
  if (!hostId) return { ok: false }
  const map = all()
  const g = ensure(hostId)
  Object.assign(g, {
    allowRequests: patch.allowRequests ?? g.allowRequests,
    combineChat: patch.combineChat ?? g.combineChat,
    combineDonations: patch.combineDonations ?? g.combineDonations,
    autoSplitRevenue: patch.autoSplitRevenue ?? g.autoSplitRevenue,
    updatedAt: new Date().toISOString(),
  })
  map[hostId] = g
  save(map)
  return { ok: true, group: g }
}

export function inviteToGroup(hostId, hostHandle, target) {
  if (!hostId || !target?.userId) return { ok: false, error: 'Need a user.' }
  if (target.userId === hostId) return { ok: false, error: 'Cannot invite yourself.' }
  const g = ensure(hostId, hostHandle)
  if (g.members.some((m) => m.userId === target.userId)) return { ok: false, error: 'Already in group.' }
  if (g.pendingInvites.some((m) => m.userId === target.userId)) return { ok: false, error: 'Invite pending.' }
  g.pendingInvites.push({
    userId: target.userId,
    handle: target.handle || '',
    at: new Date().toISOString(),
  })
  const map = all()
  map[hostId] = g
  save(map)
  const warn = g.members.length + 1 >= GROUP_STREAM_WARN_AT
  return { ok: true, group: g, warn }
}

export function respondInvite(hostId, userId, accept) {
  const map = all()
  const g = map[hostId]
  if (!g) return { ok: false, error: 'No group.' }
  const inv = g.pendingInvites.find((m) => m.userId === userId)
  if (!inv) return { ok: false, error: 'No invite.' }
  g.pendingInvites = g.pendingInvites.filter((m) => m.userId !== userId)
  if (accept) {
    g.members.push({ ...inv, joinedAt: new Date().toISOString(), analyticsKey: `${hostId}:${userId}` })
    postLiveChat(hostId, {
      userId: 'system:group',
      handle: 'calabi',
      kind: 'system',
      text: `@${inv.handle || 'user'} joined the group stream`,
    })
  }
  map[hostId] = g
  save(map)
  const warn = g.members.length >= GROUP_STREAM_WARN_AT
  return { ok: true, group: g, warn }
}

export function requestJoin(hostId, user) {
  if (!hostId || !user?.id) return { ok: false, error: 'Sign in.' }
  const g = ensure(hostId)
  if (!g.allowRequests) return { ok: false, error: 'Host turned off join requests.' }
  if (user.id === hostId) return { ok: false, error: 'You are the host.' }
  if (g.members.some((m) => m.userId === user.id)) return { ok: false, error: 'Already in group.' }
  if (g.pendingRequests.some((m) => m.userId === user.id)) return { ok: false, error: 'Request pending.' }
  g.pendingRequests.push({
    userId: user.id,
    handle: user.handle || '',
    at: new Date().toISOString(),
  })
  const map = all()
  map[hostId] = g
  save(map)
  return { ok: true, group: g }
}

export function respondRequest(hostId, userId, accept) {
  const map = all()
  const g = map[hostId]
  if (!g) return { ok: false }
  const req = g.pendingRequests.find((m) => m.userId === userId)
  if (!req) return { ok: false, error: 'No request.' }
  g.pendingRequests = g.pendingRequests.filter((m) => m.userId !== userId)
  if (accept) {
    g.members.push({ ...req, joinedAt: new Date().toISOString(), analyticsKey: `${hostId}:${userId}` })
  }
  map[hostId] = g
  save(map)
  return { ok: true, group: g, warn: g.members.length >= GROUP_STREAM_WARN_AT }
}

/** Viewer preference: decline future invites (stored per user). */
export function setAcceptInvites(userId, accept) {
  if (!userId) return
  const prefs = lsGet('group_invite_prefs', {}) || {}
  prefs[userId] = !!accept
  lsSet('group_invite_prefs', prefs)
}

export function acceptsInvites(userId) {
  if (!userId) return true
  const prefs = lsGet('group_invite_prefs', {}) || {}
  return prefs[userId] !== false
}

export function removeMember(hostId, userId) {
  const map = all()
  const g = map[hostId]
  if (!g) return { ok: false }
  g.members = g.members.filter((m) => m.userId !== userId)
  map[hostId] = g
  save(map)
  return { ok: true, group: g }
}

/** Even split of Cash units among host + members when autoSplitRevenue. */
export function splitGroupCash(hostId, units) {
  const g = getGroupStream(hostId)
  const n = Math.floor(Number(units) || 0)
  if (!g?.autoSplitRevenue || !g.members?.length) {
    return [{ userId: hostId, units: n }]
  }
  const people = [hostId, ...g.members.map((m) => m.userId)]
  const each = Math.floor(n / people.length)
  const rem = n - each * people.length
  return people.map((userId, i) => ({ userId, units: each + (i === 0 ? rem : 0) }))
}
