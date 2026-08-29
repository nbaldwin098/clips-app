import { lsGet, lsSet, getImports } from './storage'
import { hideBrokenMedia } from './catalogHealth'
import { listIndexedUsers, indexUser, normalizeHandle, validateHandle } from './moderation'
import { isOwnerAccount } from '../data/ownerLogin'
import { OFFICIAL_CREATORS } from '../data/publicMediaSeed'
import { createNotification } from './notifications'

const KEY = 'clips_trust_safety'
const LOG_KEY = 'clips_trust_log'

const DEFAULT = {
  status: 'ok',
  until: null,
  reason: '',
  note: '',
  noPost: false,
  noLive: false,
  noComment: false,
  noPayout: false,
  noAds: false,
  readOnly: false,
  strikes: [],
  updatedAt: null,
}

export const STATUS_LABEL = {
  ok: 'Active',
  limited: 'Limited',
  suspended: 'Suspended',
  banned: 'Banned',
}

function now() {
  return Date.now()
}

function records() {
  const all = lsGet(KEY, {})
  return all && typeof all === 'object' ? all : {}
}

function save(all) {
  lsSet(KEY, all)
}

function log(entry) {
  const list = lsGet(LOG_KEY, [])
  list.unshift({ id: `log_${Date.now()}`, at: new Date().toISOString(), ...entry })
  lsSet(LOG_KEY, list.slice(0, 400))
}

export function listTrustLog() {
  return lsGet(LOG_KEY, []) || []
}

export function getEnforcement(userId) {
  if (!userId) return { ...DEFAULT }
  const row = records()[userId] || {}
  const next = { ...DEFAULT, ...row, strikes: Array.isArray(row.strikes) ? row.strikes : [] }
  if (next.status === 'suspended' && next.until) {
    const t = new Date(next.until).getTime()
    if (t && t < now()) {
      next.status = next.strikes.filter((s) => !s.cleared).length ? 'limited' : 'ok'
      next.until = null
      next.noPost = false
      next.noLive = false
      next.readOnly = false
      patchEnforcement(userId, next, { silent: true })
    }
  }
  return next
}

export function patchEnforcement(userId, partial, { actorId = 'admin', silent = false } = {}) {
  if (!userId) return getEnforcement(userId)
  const all = records()
  const prev = { ...DEFAULT, ...(all[userId] || {}) }
  const next = { ...prev, ...partial, updatedAt: new Date().toISOString() }
  if (Array.isArray(partial.strikes)) next.strikes = partial.strikes
  all[userId] = next
  save(all)
  if (!silent) {
    log({ userId, actorId, action: partial.status || 'update', reason: partial.reason || '' })
    try {
      if (partial.status && partial.status !== prev.status) {
        createNotification({
          userId,
          type: 'application',
          title: partial.status === 'ok' ? 'Account restored' : `Account ${STATUS_LABEL[partial.status] || partial.status}`,
          body: partial.reason || partial.note || 'A moderator updated your account.',
        })
      }
    } catch {}
  }
  return next
}

export function isProtectedAccount(user) {
  if (!user) return false
  if (isOwnerAccount(user)) return true
  if (String(user.id || '').startsWith('org-')) return true
  return false
}

function resolvePerson(userId) {
  if (!userId) return null
  return listAdminPeople().find((p) => p.id === userId) || { id: userId }
}

export function accessBlockMessage(user) {
  if (!user?.id || isProtectedAccount(user)) return ''
  const row = getEnforcement(user.id)
  if (row.status === 'banned') {
    return row.reason
      ? `This account is banned. ${row.reason}`
      : 'This account is banned.'
  }
  if (row.status === 'suspended') {
    const until = row.until ? ` until ${new Date(row.until).toLocaleString()}` : ''
    return `This account is suspended${until}.`
  }
  return ''
}

export function canPost(user) {
  if (!user?.id) return false
  if (isProtectedAccount(user)) return true
  const row = getEnforcement(user.id)
  if (row.status === 'banned' || row.status === 'suspended') return false
  if (row.noPost || row.readOnly) return false
  return true
}

export function canGoLive(user) {
  if (!user?.id) return false
  if (isProtectedAccount(user)) return true
  const row = getEnforcement(user.id)
  if (row.status === 'banned' || row.status === 'suspended') return false
  if (row.noLive || row.readOnly) return false
  return true
}

export function canComment(user) {
  if (!user?.id) return false
  if (isProtectedAccount(user)) return true
  const row = getEnforcement(user.id)
  if (row.status === 'banned' || row.status === 'suspended') return false
  if (row.noComment || row.readOnly) return false
  return true
}

export function payoutsHeld(userId) {
  if (!userId) return false
  const row = getEnforcement(userId)
  return row.noPayout || row.status === 'banned' || row.status === 'suspended'
}

export function adsHeld(userId) {
  if (!userId) return false
  const row = getEnforcement(userId)
  return row.noAds || row.status === 'banned'
}

export function isAccountHidden(userId, handle = '') {
  if (userId) {
    if (isProtectedAccount({ id: userId })) return false
    const row = getEnforcement(userId)
    return row.status === 'banned' || row.status === 'suspended'
  }
  const h = String(handle || '').toLowerCase()
  if (!h) return false
  const hit = listIndexedUsers().find((u) => String(u.handle || '').toLowerCase() === h)
    || OFFICIAL_CREATORS.find((c) => String(c.handle || '').toLowerCase() === h)
  if (!hit?.id || isProtectedAccount(hit)) return false
  const row = getEnforcement(hit.id)
  return row.status === 'banned' || row.status === 'suspended'
}

export function postDeniedMessage(user) {
  if (canPost(user)) return ''
  const row = getEnforcement(user?.id)
  if (row.status === 'limited' || row.noPost) return 'Uploads are limited on this account.'
  if (row.readOnly) return 'This account is read-only.'
  return accessBlockMessage(user) || 'You cannot post right now.'
}

export function listAdminPeople({ query = '' } = {}) {
  const q = String(query || '').trim().toLowerCase()
  const map = {}
  for (const u of listIndexedUsers()) {
    map[u.id] = { ...u, source: 'user' }
  }
  for (const c of OFFICIAL_CREATORS) {
    if (!map[c.id]) {
      map[c.id] = {
        id: c.id,
        handle: c.handle,
        displayName: c.displayName,
        email: c.email,
        avatarUrl: c.avatarUrl,
        source: 'library',
        creatorStatus: 'approved',
      }
    }
  }
  let list = Object.values(map)
  if (q) {
    list = list.filter((p) => `${p.displayName} ${p.handle} ${p.email} ${p.id}`.toLowerCase().includes(q))
  }
  return list.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
}

export function adminUpdateProfile(userId, partial, actorId = 'admin') {
  const person = resolvePerson(userId)
  if (!person) return { ok: false, error: 'Person not found.' }
  if (isProtectedAccount(person) && partial.handle) {
    return { ok: false, error: 'The owner handle cannot be changed here.' }
  }
  const users = lsGet('users_index', {}) || {}
  const cur = users[userId] || { id: userId, ...person }
  const next = { ...cur }
  if (partial.displayName != null) next.displayName = String(partial.displayName).slice(0, 80)
  if (partial.bio != null) next.bio = String(partial.bio).slice(0, 500)
  if (partial.email != null) next.email = String(partial.email).trim().toLowerCase().slice(0, 200)
  if (partial.creatorStatus) {
    next.creatorStatus = partial.creatorStatus
    next.isCreator = partial.creatorStatus === 'approved'
  }
  if (partial.handle != null) {
    const v = validateHandle(partial.handle, { currentUserId: userId })
    if (!v.ok) return { ok: false, error: v.error }
    next.handle = v.handle
  } else {
    next.handle = normalizeHandle(next.handle)
  }
  next.updatedAt = new Date().toISOString()
  users[userId] = next
  lsSet('users_index', users)
  const session = lsGet('user', null)
  if (session?.id === userId) {
    lsSet('user', { ...session, displayName: next.displayName, handle: next.handle, bio: next.bio, email: next.email || session.email })
  }
  try { indexUser(next) } catch {}
  log({ userId, actorId, action: 'edit-profile' })
  return { ok: true, person: next }
}

export function banUser(userId, reason, actorId = 'admin') {
  const person = resolvePerson(userId)
  if (isProtectedAccount(person)) return { ok: false, error: 'That account cannot be banned.' }
  patchEnforcement(userId, {
    status: 'banned',
    until: null,
    reason: String(reason || 'Banned').slice(0, 240),
    noPost: true,
    noLive: true,
    noComment: true,
    noPayout: true,
    noAds: true,
    readOnly: true,
  }, { actorId })
  return { ok: true }
}

export function unbanUser(userId, actorId = 'admin') {
  patchEnforcement(userId, {
    status: 'ok',
    until: null,
    reason: '',
    noPost: false,
    noLive: false,
    noComment: false,
    noPayout: false,
    noAds: false,
    readOnly: false,
  }, { actorId })
  return { ok: true }
}

export function suspendUser(userId, { days = 7, reason = '', readOnly = false } = {}, actorId = 'admin') {
  const person = resolvePerson(userId)
  if (isProtectedAccount(person)) return { ok: false, error: 'That account cannot be suspended.' }
  const n = Math.max(1, Math.min(365, Number(days) || 7))
  const until = new Date(now() + n * 864e5).toISOString()
  patchEnforcement(userId, {
    status: 'suspended',
    until,
    reason: String(reason || `Suspended ${n} days`).slice(0, 240),
    noPost: true,
    noLive: true,
    noComment: true,
    noPayout: true,
    readOnly: !!readOnly,
  }, { actorId })
  return { ok: true, until }
}

export function limitUser(userId, reason, actorId = 'admin') {
  const person = resolvePerson(userId)
  if (isProtectedAccount(person)) return { ok: false, error: 'That account cannot be limited.' }
  patchEnforcement(userId, {
    status: 'limited',
    until: new Date(now() + 7 * 864e5).toISOString(),
    reason: String(reason || 'Feature limited').slice(0, 240),
    noPost: true,
    noLive: true,
    readOnly: false,
  }, { actorId })
  return { ok: true }
}

export function holdPayouts(userId, on, actorId = 'admin') {
  patchEnforcement(userId, { noPayout: !!on }, { actorId })
  log({ userId, actorId, action: on ? 'hold-payouts' : 'release-payouts' })
  return { ok: true }
}

export function holdAds(userId, on, actorId = 'admin') {
  patchEnforcement(userId, { noAds: !!on }, { actorId })
  return { ok: true }
}

export function setFeatureFlags(userId, flags, actorId = 'admin') {
  patchEnforcement(userId, flags, { actorId })
  return { ok: true }
}

export function addStrike(userId, { kind = 'community', reason = '' } = {}, actorId = 'admin') {
  const person = resolvePerson(userId)
  if (isProtectedAccount(person)) return { ok: false, error: 'Cannot strike that account.' }
  const row = getEnforcement(userId)
  const strike = {
    id: `stk_${Date.now()}`,
    kind: kind === 'copyright' ? 'copyright' : 'community',
    reason: String(reason || '').slice(0, 240),
    at: new Date().toISOString(),
    expiresAt: new Date(now() + 90 * 864e5).toISOString(),
    cleared: false,
  }
  const strikes = [...(row.strikes || []), strike]
  const active = strikes.filter((s) => !s.cleared && new Date(s.expiresAt).getTime() > now())
  if (active.length >= 3) {
    return { ...banUser(userId, 'Three active strikes', actorId), strike }
  }
  let extra = {}
  if (active.length === 1) extra = { noPost: true, noLive: true, status: 'limited', until: new Date(now() + 7 * 864e5).toISOString() }
  if (active.length === 2) extra = { noPost: true, noLive: true, noComment: true, status: 'limited', until: new Date(now() + 14 * 864e5).toISOString() }
  patchEnforcement(userId, { strikes, reason: strike.reason, ...extra }, { actorId })
  return { ok: true, strike }
}

export function clearStrike(userId, strikeId, actorId = 'admin') {
  const row = getEnforcement(userId)
  const strikes = (row.strikes || []).map((s) => (s.id === strikeId ? { ...s, cleared: true } : s))
  patchEnforcement(userId, { strikes }, { actorId })
  return { ok: true }
}

export function listAllContent() {
  const imports = getImports() || []
  const seen = new Set()
  const out = []
  for (const row of imports) {
    if (!row?.id || seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

export async function adminRemoveContent(id, actorId = 'admin') {
  if (!id) return { ok: false, error: 'Missing post.' }
  try {
    const { deleteCatalogItem } = await import('./contentService.js')
    const res = await deleteCatalogItem(id, null, { intentional: true })
    log({ userId: '', actorId, action: 'remove-content', reason: id })
    return { ok: true, cloudOk: res?.cloudOk }
  } catch (err) {
    try {
      const { removeImport } = await import('./storage.js')
      removeImport(id)
    } catch { /* ok */ }
    log({ userId: '', actorId, action: 'remove-content', reason: id })
    return { ok: false, error: err?.message || 'Delete failed' }
  }
}

export function adminOverview() {
  const people = listAdminPeople()
  const enfs = records()
  let banned = 0
  let suspended = 0
  let holds = 0
  for (const id of Object.keys(enfs)) {
    const row = getEnforcement(id)
    if (row.status === 'banned') banned += 1
    if (row.status === 'suspended') suspended += 1
    if (row.noPayout) holds += 1
  }
  return {
    people: people.length,
    banned,
    suspended,
    holds,
    posts: listAllContent().length,
  }
}
