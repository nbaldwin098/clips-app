import { lsGet } from './storage'
import { createTicket } from './moderation'
import { notifyNewTicket } from './notifications'

function currentUrl() {
  try {
    return window.location.href
  } catch {
    return ''
  }
}

function currentUserAgent() {
  try {
    return navigator.userAgent
  } catch {
    return ''
  }
}

function readStoredUser() {
  try {
    return lsGet('user', null)
  } catch {
    return null
  }
}

export function buildErrorReportBody({
  message,
  context,
  detail,
  url,
  stack,
  userAgent,
  user,
  note,
}) {
  const lines = [
    `Context: ${context || 'general'}`,
    `Message: ${message || 'Unknown error'}`,
    `URL: ${url || currentUrl()}`,
    `Time: ${new Date().toISOString()}`,
  ]
  if (user?.id) lines.push(`User: ${user.id} (@${user.handle || '—'})`)
  if (user?.email) lines.push(`Email: ${user.email}`)
  if (note) lines.push('', 'User note:', note)
  if (detail) lines.push('', 'Details:', detail)
  if (stack) lines.push('', 'Stack:', stack)
  if (userAgent) lines.push('', `UA: ${userAgent}`)
  return lines.join('\n')
}

export function submitErrorReport({
  user,
  context = 'general',
  message = '',
  detail = '',
  note = '',
  url,
  stack,
} = {}) {
  const actor = user?.id ? user : readStoredUser()
  const msg = String(message || 'Unknown error').trim()
  const ctx = String(context || 'general').trim()
  const subject = `[Error] ${ctx}: ${msg.slice(0, 72)}`
  const body = buildErrorReportBody({
    message: msg,
    context: ctx,
    detail,
    note,
    url: url || currentUrl(),
    stack,
    userAgent: currentUserAgent(),
    user: actor,
  })

  const ticket = createTicket({
    userId: actor?.id || '',
    email: actor?.email || '',
    handle: actor?.handle || '',
    subject,
    body,
    kind: 'error',
    context: ctx,
    errorMessage: msg.slice(0, 500),
  })

  if (actor?.id) {
    notifyNewTicket({ userId: actor.id, handle: actor.handle, subject })
  }

  return { ok: true, ticket }
}
