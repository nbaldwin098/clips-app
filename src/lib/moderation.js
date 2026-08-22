import { lsGet, lsSet } from './storage'

const ADMIN_KEY = 'clips_admin_session'
const APPS_KEY = 'creator_applications'
const TICKETS_KEY = 'support_tickets'
const USERS_INDEX = 'users_index'

export function isAdminSession() {
  return !!lsGet(ADMIN_KEY, null)
}

export function adminLogin(code) {
  const ok = code === 'clips-admin' || code === import.meta.env?.VITE_ADMIN_CODE
  if (ok) {
    lsSet(ADMIN_KEY, { at: Date.now() })
    return true
  }
  return false
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
  const row = {
    id: `app_${Date.now()}`,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    ...app,
  }
  list.unshift(row)
  lsSet(APPS_KEY, list)
  return row
}

export function setApplicationStatus(appId, status, note = '') {
  const list = listApplications().map((a) =>
    a.id === appId
      ? { ...a, status, reviewedAt: new Date().toISOString(), note }
      : a
  )
  lsSet(APPS_KEY, list)
  const app = list.find((a) => a.id === appId)
  if (app?.userId) {
    const users = lsGet(USERS_INDEX, {})
    if (users[app.userId]) {
      users[app.userId].creatorStatus = status
      lsSet(USERS_INDEX, users)
    }
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
  const row = {
    id: `tix_${Date.now()}`,
    status: 'open',
    createdAt: new Date().toISOString(),
    messages: [],
    ...ticket,
  }
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
  users[user.id] = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    handle: user.handle,
    creatorStatus: user.creatorStatus || 'none',
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
