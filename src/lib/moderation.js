import { lsGet, lsSet } from './storage'
import { notifyApplicationStatus } from './notifications'
import { setCreatorStatus } from './profiles'
import { verifySecret } from './secrets'
import { OWNER_ADMIN_CODE_HASH, isOwnerAccount, ownerPasswordHashes } from '../data/ownerLogin'
import { runtimeEnv } from './runtimeEnv'
import { cachedTickets, createSupportTicketCloud, updateSupportTicketCloud, pullSupportTickets } from './supportSync'

const ADMIN_KEY = 'clips_admin_session'
const APPS_KEY = 'creator_applications'
const USERS_INDEX = 'users_index'

export const PLATFORM_OWNER_HANDLE = 'kiddnixk'
const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000

const RESERVED = new Set([
  'admin', 'administrator', 'clips', 'support', 'help', 'official', 'youtube',
  'twitch', 'settings', 'login', 'signup', 'api', 'www', 'root', 'null', 'undefined',
  'mod', 'moderator', 'staff', 'system', 'about', 'terms', 'privacy', 'copyright',
  'kiddnixk', 'cs1',
])

export function normalizeHandle(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
}

export function isHandleTaken(handle, exceptUserId = null) {
  const h = normalizeHandle(handle)
  const users = lsGet(USERS_INDEX, {})
  for (const [id, u] of Object.entries(users)) {
    if (exceptUserId && id === exceptUserId) continue
    if (u && normalizeHandle(u.handle) === h) return true
  }
  return false
}

export function validateHandle(raw, { currentUserId = null } = {}) {
  const handle = normalizeHandle(raw)
  if (handle.length < 3) return { ok: false, handle, error: 'Handle must be at least 3 characters' }
  if (handle.length > 24) return { ok: false, handle, error: 'Handle must be 24 characters or fewer' }
  if (!/^[a-z][a-z0-9_]*$/.test(handle)) {
    return { ok: false, handle, error: 'Must start with a letter; only letters, numbers, underscore' }
  }
  if (RESERVED.has(handle)) {
    if (handle === PLATFORM_OWNER_HANDLE && currentUserId) {
      const ownerId = getPlatformOwnerId()
      if (ownerId && currentUserId === ownerId) return { ok: true, handle, error: null }
      const cur = lsGet('user', null)
      if (cur?.id === currentUserId && cur.provider === 'supabase' && normalizeHandle(cur.handle) === PLATFORM_OWNER_HANDLE) {
        return { ok: true, handle, error: null }
      }
    }
    return { ok: false, handle, error: 'That handle is reserved' }
  }
  if (isHandleTaken(handle, currentUserId)) {
    return { ok: false, handle, error: 'That handle is already taken' }
  }
  return { ok: true, handle, error: null }
}

export function getPlatformOwnerId() {
  return runtimeEnv('VITE_PLATFORM_OWNER_ID')
}

export function getAdminCode() {
  // Never read a plaintext admin secret from the client bundle.
  return ''
}

/** Owner is a cloud user whose email/handle matches kiddnixk aliases, or VITE_PLATFORM_OWNER_ID. */
export function isPlatformOwner(user) {
  if (!user) return false
  if (isOwnerAccount(user)) return true
  const ownerId = getPlatformOwnerId()
  if (ownerId && user.id === ownerId) return true
  return false
}

export function isAdminSession(user) {
  if (!user) return false
  if (isPlatformOwner(user)) return true
  const s = lsGet(ADMIN_KEY, null)
  if (!s || !s.ok || !s.userId) return false
  if (s.userId !== user.id) return false
  if (s.exp && Date.now() > s.exp) {
    lsSet(ADMIN_KEY, null)
    return false
  }
  return true
}

export async function adminLogin(code, user) {
  if (!user) {
    return { ok: false, error: 'Sign in as kiddnixk first (site sign-in), then open Admin again.' }
  }
  if (!isPlatformOwner(user)) {
    return { ok: false, error: 'Admin is only for the owner account (kiddnixk / kiddnixk@gmail.com).' }
  }
  // Owner sessions already have admin access; code is optional extra gate when provided.
  const typed = String(code || '').trim()
  if (!typed) {
    lsSet(ADMIN_KEY, {
      at: Date.now(),
      exp: Date.now() + ADMIN_SESSION_MS,
      ok: true,
      userId: user.id,
    })
    return { ok: true }
  }
  const expected = getAdminCode()
  let ok = false
  if (expected && typed === expected) ok = true
  if (!ok) ok = await verifySecret(typed, OWNER_ADMIN_CODE_HASH)
  if (!ok) {
    for (const stored of ownerPasswordHashes()) {
      if (await verifySecret(typed, stored)) {
        ok = true
        break
      }
    }
  }
  if (!ok) {
    return { ok: false, error: 'Invalid admin code. Leave it blank if you are already signed in as kiddnixk.' }
  }
  lsSet(ADMIN_KEY, {
    at: Date.now(),
    exp: Date.now() + ADMIN_SESSION_MS,
    ok: true,
    userId: user.id,
  })
  return { ok: true }
}

export function adminLogout() {
  lsSet(ADMIN_KEY, null)
}

export function listApplications() {
  return lsGet(APPS_KEY, [])
}

export function submitCreatorApplication(app) {
  const list = listApplications()
  const existing = list.find((a) => a.userId === app.userId && a.status === 'pending')
  if (existing) return existing
  const row = { id: `app_${Date.now()}`, status: 'pending', submittedAt: new Date().toISOString(), ...app }
  list.unshift(row)
  lsSet(APPS_KEY, list)
  return row
}

export function setApplicationStatus(appId, status, note = '') {
  const list = listApplications().map((a) =>
    a.id === appId ? { ...a, status, reviewedAt: new Date().toISOString(), note } : a
  )
  lsSet(APPS_KEY, list)
  const app = list.find((a) => a.id === appId)
  if (app?.userId) {
    const users = lsGet(USERS_INDEX, {})
    if (users[app.userId]) {
      users[app.userId].creatorStatus = status
      users[app.userId].isCreator = status === 'approved'
      lsSet(USERS_INDEX, users)
    }
    notifyApplicationStatus(app.userId, status)
    setCreatorStatus(app.userId, status).catch(() => {})
  }
  return app
}

export function getApplicationForUser(userId) {
  return listApplications().find((a) => a.userId === userId) || null
}

export function listTickets() {
  return cachedTickets()
}

export function createTicket(ticket) {
  const row = {
    id: `tix_${Date.now()}`,
    status: 'open',
    createdAt: new Date().toISOString(),
    messages: [],
    ...ticket,
  }
  createSupportTicketCloud({
    userId: ticket.userId,
    email: ticket.email,
    handle: ticket.handle,
    subject: ticket.subject,
    body: ticket.body,
    category: ticket.category || 'general',
  }).then(() => pullSupportTickets()).catch(() => {})
  return row
}

export function updateTicket(id, partial) {
  updateSupportTicketCloud(id, partial).then(() => pullSupportTickets()).catch(() => {})
  return { id, ...partial }
}

export function indexUser(user) {
  if (!user?.id) return
  const users = lsGet(USERS_INDEX, {})
  const handle = normalizeHandle(user.handle)
  users[user.id] = {
    id: user.id,
    email: user.email,
    handle,
    displayName: user.displayName,
    creatorStatus: user.creatorStatus || 'none',
    isCreator: !!user.isCreator,
    avatarUrl: user.avatarUrl || null,
    bannerUrl: user.bannerUrl || null,
    bio: user.bio || '',
    updatedAt: new Date().toISOString(),
  }
  lsSet(USERS_INDEX, users)
}

export function listIndexedUsers() {
  return Object.values(lsGet(USERS_INDEX, {}))
}

export function listImports() {
  return lsGet('imports', [])
}

export function listUserClips() {
  return lsGet('user_clips', [])
}
