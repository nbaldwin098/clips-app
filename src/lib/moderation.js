import { lsGet, lsSet } from './storage'
import { notifyApplicationStatus } from './notifications'
import { setCreatorStatus } from './profiles'
import { verifySecret } from './secrets'
import { OWNER_LOGIN, OWNER_ADMIN_CODE_HASH } from '../data/ownerLogin'

const ADMIN_KEY = 'clips_admin_session'
const APPS_KEY = 'creator_applications'
const TICKETS_KEY = 'support_tickets'
const USERS_INDEX = 'users_index'

export const PLATFORM_OWNER_HANDLE = 'cs1'
const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000

const RESERVED = new Set([
  'admin', 'administrator', 'clips', 'support', 'help', 'official', 'youtube',
  'twitch', 'settings', 'login', 'signup', 'api', 'www', 'root', 'null', 'undefined',
  'mod', 'moderator', 'staff', 'system', 'about', 'terms', 'privacy', 'copyright',
  'cs1',
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
  try {
    return String(import.meta.env?.VITE_PLATFORM_OWNER_ID || '').trim()
  } catch {
    return ''
  }
}

export function getAdminCode() {
  try {
    return String(import.meta.env?.VITE_ADMIN_CODE || '').trim()
  } catch {
    return ''
  }
}

/** Owner is a live Supabase user, or the local cs1 intercept. */
export function isPlatformOwner(user) {
  if (!user) return false
  if (user.id === OWNER_LOGIN.id) return true
  if (user.role === 'admin' && user.provider === 'supabase') return true
  if (user.provider !== 'supabase') return false
  const ownerId = getPlatformOwnerId()
  if (ownerId) return user.id === ownerId
  return String(user.handle || '').toLowerCase() === PLATFORM_OWNER_HANDLE
}

export function isAdminSession(user) {
  if (!user) return false
  const s = lsGet(ADMIN_KEY, null)
  if (!s || !s.ok || !s.userId) return false
  if (s.userId !== user.id) return false
  if (s.exp && Date.now() > s.exp) {
    lsSet(ADMIN_KEY, null)
    return false
  }
  return isPlatformOwner(user)
}

export async function adminLogin(code, user) {
  if (!user) {
    return { ok: false, error: 'Sign in as cs1 first.' }
  }
  if (!isPlatformOwner(user)) {
    return { ok: false, error: 'Admin is only available for the platform owner account.' }
  }
  const typed = String(code || '')
  const expected = getAdminCode()
  let ok = false
  if (expected && typed === expected) ok = true
  else ok = await verifySecret(typed, OWNER_ADMIN_CODE_HASH)
  if (!ok) {
    return { ok: false, error: 'Invalid admin password' }
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
  return lsGet(TICKETS_KEY, [])
}

export function createTicket(ticket) {
  const list = listTickets()
  const row = { id: `tix_${Date.now()}`, status: 'open', createdAt: new Date().toISOString(), messages: [], ...ticket }
  list.unshift(row)
  lsSet(TICKETS_KEY, list)
  return row
}

export function updateTicket(id, partial) {
  const list = listTickets().map((t) => (t.id === id ? { ...t, ...partial } : t))
  lsSet(TICKETS_KEY, list)
  return list.find((t) => t.id === id)
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
