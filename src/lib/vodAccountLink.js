/**
 * Link a second account to the VOD channel by verifying that account's email with a code.
 */
import { lsGet, lsSet } from './storage'
import { listIndexedUsers } from './moderation'
import { setVodChannel, vodChannelId } from './vods'

const PENDING_KEY = 'calabi.vod.link.pending.v1'
const LINKED_KEY = 'calabi.vod.linked.v1'

function code6() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function getLinkedVodAccount(ownerUserId) {
  if (!ownerUserId) return null
  return (lsGet(LINKED_KEY, {}) || {})[ownerUserId] || null
}

export function startVodAccountLink(ownerUserId, email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!ownerUserId) return { ok: false, error: 'Sign in required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: 'Enter a valid email.' }
  }
  const users = listIndexedUsers() || []
  const match = users.find((u) => String(u.email || '').toLowerCase() === normalized)
  if (!match?.id) {
    return { ok: false, error: 'No calabi account uses that email.' }
  }
  if (match.id === ownerUserId) {
    return { ok: false, error: 'Use a different account’s email.' }
  }
  const code = code6()
  const all = lsGet(PENDING_KEY, {}) || {}
  all[ownerUserId] = {
    email: normalized,
    targetUserId: match.id,
    targetHandle: match.handle || '',
    code,
    sentAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  }
  lsSet(PENDING_KEY, all)
  // Dev/demo: code is returned so the creator can complete verify without mail infra.
  return {
    ok: true,
    email: normalized,
    targetHandle: match.handle || '',
    demoCode: code,
    message: `Code sent to ${normalized}. Enter it to link @${match.handle || 'account'}.`,
  }
}

export function confirmVodAccountLink(ownerUserId, code, owner = {}) {
  if (!ownerUserId) return { ok: false, error: 'Sign in required.' }
  const pending = (lsGet(PENDING_KEY, {}) || {})[ownerUserId]
  if (!pending) return { ok: false, error: 'Request a code first.' }
  if (Date.parse(pending.expiresAt) < Date.now()) {
    return { ok: false, error: 'Code expired. Request a new one.' }
  }
  if (String(code || '').trim() !== String(pending.code)) {
    return { ok: false, error: 'Wrong code.' }
  }
  const linked = {
    userId: pending.targetUserId,
    handle: pending.targetHandle,
    email: pending.email,
    linkedAt: new Date().toISOString(),
  }
  const allLinked = lsGet(LINKED_KEY, {}) || {}
  allLinked[ownerUserId] = linked
  lsSet(LINKED_KEY, allLinked)

  const pendingAll = lsGet(PENDING_KEY, {}) || {}
  delete pendingAll[ownerUserId]
  lsSet(PENDING_KEY, pendingAll)

  setVodChannel(
    ownerUserId,
    {
      enabled: true,
      handle: linked.handle || `vods_${String(owner.handle || 'creator').slice(0, 12)}`,
      autoPublish: true,
      visibility: 'public',
      linkedUserId: linked.userId,
      linkedEmail: linked.email,
    },
    owner
  )

  return {
    ok: true,
    linked,
    channelId: vodChannelId(ownerUserId),
    message: `Linked @${linked.handle || linked.email} as your VOD account.`,
  }
}

export function unlinkVodAccount(ownerUserId) {
  if (!ownerUserId) return { ok: false }
  const all = lsGet(LINKED_KEY, {}) || {}
  delete all[ownerUserId]
  lsSet(LINKED_KEY, all)
  setVodChannel(ownerUserId, { linkedUserId: null, linkedEmail: null })
  return { ok: true }
}
