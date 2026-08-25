import { lsGet, lsSet } from './storage'
import { pushNotification } from './graphSync'

const KEY = 'clips_notifications'
const PREFS_KEY = 'yt_notif_prefs'
const MAX_PER_USER = 100
const DEDUPE_MS = 20_000

export const NOTIF_TYPES = {
  subscriber: 'subscriber',
  like: 'like',
  comment: 'comment',
  mention: 'mention',
  live: 'live',
  post: 'post',
  upload: 'upload',
  premium: 'premium',
  application: 'application',
  verification: 'verification',
  report: 'report',
  ticket: 'ticket',
  held_comment: 'held_comment',
}

const TYPE_PREF = {
  subscriber: 'subscribers',
  like: 'likes',
  comment: 'comments',
  mention: 'mentions',
  live: 'live',
  post: 'posts',
  upload: 'uploads',
  premium: 'premium',
  application: 'application',
  verification: 'application',
  report: 'reports',
  ticket: 'reports',
  held_comment: 'comments',
}

const ALWAYS_DELIVER = new Set(['application', 'verification'])

export const DEFAULT_NOTIF_PREFS = {
  all: true,
  subscribers: true,
  likes: true,
  comments: true,
  mentions: true,
  live: true,
  posts: true,
  uploads: true,
  premium: true,
  application: true,
  reports: true,
  marketing: false,
}

function emitChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('clips-notifications'))
}

function readAll() {
  return lsGet(KEY, {}) || {}
}

function writeAll(map) {
  lsSet(KEY, map)
  emitChanged()
}

export function getNotificationPrefs(userId) {
  if (!userId) return { ...DEFAULT_NOTIF_PREFS }
  const stored = (lsGet(PREFS_KEY, {}) || {})[userId] || {}
  return { ...DEFAULT_NOTIF_PREFS, ...stored }
}

function allows(userId, type) {
  const prefs = getNotificationPrefs(userId)
  if (ALWAYS_DELIVER.has(type)) return true
  if (prefs.all === false) return false
  const key = TYPE_PREF[type]
  if (key && prefs[key] === false) return false
  return true
}

export function findIndexedUser(userId) {
  if (!userId) return null
  return (lsGet('users_index', {}) || {})[userId] || null
}

export function findUserByHandle(handle) {
  const h = String(handle || '').replace(/^@/, '').toLowerCase()
  if (!h) return null
  return Object.values(lsGet('users_index', {}) || {}).find(
    (u) => String(u.handle || '').toLowerCase() === h
  ) || null
}

export function findContentById(contentId) {
  if (!contentId) return null
  const imports = lsGet('imports', []) || []
  const clips = lsGet('user_clips', []) || []
  return imports.find((i) => i.id === contentId) || clips.find((i) => i.id === contentId) || null
}

export function getSubscriberIds(creatorId) {
  if (!creatorId) return []
  const list = (lsGet('engagement_subs', {}) || {})[creatorId]
  return Array.isArray(list) ? list : []
}

export function findAdminIds() {
  return Object.values(lsGet('users_index', {}) || {})
    .filter((u) => String(u.handle || '').toLowerCase() === 'cs1' || u.isPlatformAdmin)
    .map((u) => u.id)
}

function labelFor(userId, fallback = 'Someone') {
  const u = findIndexedUser(userId)
  if (u?.handle) return `@${u.handle}`
  if (u?.displayName) return u.displayName
  return fallback
}

export function createNotification({
  userId,
  type,
  title,
  body = '',
  actorId = null,
  contentId = null,
  view = 'notifications',
  meta = {},
}) {
  if (!userId || !type || !title) return null
  if (actorId && actorId === userId) return null
  if (!allows(userId, type)) return null

  const all = readAll()
  const list = Array.isArray(all[userId]) ? all[userId] : []
  const now = Date.now()
  const dup = list.find((n) =>
    n.type === type
    && n.actorId === actorId
    && n.contentId === contentId
    && n.title === title
    && now - new Date(n.at).getTime() < DEDUPE_MS
  )
  if (dup) return dup

  const row = {
    id: `ntf_${now}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    type,
    title,
    body,
    actorId,
    contentId,
    view,
    meta,
    read: false,
    at: new Date().toISOString(),
  }
  all[userId] = [row, ...list].slice(0, MAX_PER_USER)
  writeAll(all)
  pushNotification(row)
  return row
}

export function notifyMany(userIds, payload) {
  const seen = new Set()
  for (const id of userIds || []) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    createNotification({ ...payload, userId: id })
  }
}

export function listNotifications(userId) {
  if (!userId) return []
  return (readAll()[userId] || []).slice()
}

export function unreadCount(userId) {
  return listNotifications(userId).filter((n) => !n.read).length
}

export function markNotificationRead(userId, id) {
  if (!userId || !id) return
  const all = readAll()
  const list = all[userId] || []
  let changed = false
  for (const n of list) {
    if (n.id === id && !n.read) {
      n.read = true
      changed = true
    }
  }
  if (changed) {
    writeAll(all)
    const row = (all[userId] || []).find((n) => n.id === id)
    if (row) pushNotification(row)
  }
}

export function markAllNotificationsRead(userId) {
  if (!userId) return
  const all = readAll()
  const list = all[userId] || []
  let changed = false
  for (const n of list) {
    if (!n.read) {
      n.read = true
      changed = true
    }
  }
  if (changed) {
    writeAll(all)
    for (const row of all[userId] || []) pushNotification(row)
  }
}

export function subscribeNotifications(onChange) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onChange?.()
  window.addEventListener('clips-notifications', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('clips-notifications', handler)
    window.removeEventListener('storage', handler)
  }
}

export function notifyNewSubscriber(creatorId, actorId) {
  createNotification({
    userId: creatorId,
    type: NOTIF_TYPES.subscriber,
    title: `${labelFor(actorId, 'A viewer')} followed you`,
    actorId,
    view: 'analytics',
  })
}

export function notifyNewLike(contentId, actorId) {
  const item = findContentById(contentId)
  const ownerId = item?.creatorId || item?.userId
  if (!ownerId) return
  createNotification({
    userId: ownerId,
    type: NOTIF_TYPES.like,
    title: `${labelFor(actorId, 'Someone')} liked ${item.title || 'your clip'}`,
    actorId,
    contentId,
    view: 'watch',
  })
}

export function notifyNewComment({ contentId, actorId, text, parentAuthorId = null, held = false }) {
  const item = findContentById(contentId)
  const ownerId = item?.creatorId || item?.userId
  const snippet = String(text || '').trim().slice(0, 80)
  if (ownerId) {
    createNotification({
      userId: ownerId,
      type: held ? NOTIF_TYPES.held_comment : NOTIF_TYPES.comment,
      title: held
        ? `Held comment on ${item?.title || 'your clip'}`
        : `${labelFor(actorId, 'Someone')} commented on ${item?.title || 'your clip'}`,
      body: snippet,
      actorId,
      contentId,
      view: 'watch',
    })
  }
  if (parentAuthorId && parentAuthorId !== ownerId) {
    createNotification({
      userId: parentAuthorId,
      type: NOTIF_TYPES.comment,
      title: `${labelFor(actorId, 'Someone')} replied to your comment`,
      body: snippet,
      actorId,
      contentId,
      view: 'notifications',
    })
  }
  notifyMentions({ text, actorId, contentId, extraSkip: [ownerId, parentAuthorId] })
}

export function notifyMentions({ text, actorId, contentId = null, extraSkip = [] }) {
  const skip = new Set([actorId, ...extraSkip].filter(Boolean))
  const handles = String(text || '').match(/@([a-z][a-z0-9_]{1,23})/gi) || []
  for (const raw of handles) {
    const user = findUserByHandle(raw)
    if (!user?.id || skip.has(user.id)) continue
    skip.add(user.id)
    createNotification({
      userId: user.id,
      type: NOTIF_TYPES.mention,
      title: `${labelFor(actorId, 'Someone')} mentioned you`,
      body: String(text || '').trim().slice(0, 80),
      actorId,
      contentId,
      view: 'notifications',
    })
  }
}

export function notifyFollowersWentLive({ creatorId, handle, title }) {
  const name = handle ? `@${handle}` : labelFor(creatorId, 'A creator')
  notifyMany(getSubscriberIds(creatorId), {
    type: NOTIF_TYPES.live,
    title: `${name} is live`,
    body: title || 'Live on calabi',
    actorId: creatorId,
    view: 'live',
    meta: { streamUserId: creatorId },
  })
}

export function notifyFollowersOfPost({ creatorId, handle, text }) {
  const name = handle ? `@${handle}` : labelFor(creatorId, 'A creator')
  notifyMany(getSubscriberIds(creatorId), {
    type: NOTIF_TYPES.post,
    title: `${name} posted to community`,
    body: String(text || '').trim().slice(0, 80),
    actorId: creatorId,
    view: 'community',
  })
}

export function notifyFollowersOfUpload({ creatorId, handle, title }) {
  if (!creatorId) return
  const name = handle ? `@${handle}` : labelFor(creatorId, 'A creator')
  notifyMany(getSubscriberIds(creatorId), {
    type: NOTIF_TYPES.upload,
    title: `${name} posted a clip`,
    body: title || '',
    actorId: creatorId,
    view: 'clips',
  })
}

export function notifyPremium(creatorId, actorId) {
  createNotification({
    userId: creatorId,
    type: NOTIF_TYPES.premium,
    title: `${labelFor(actorId, 'A viewer')} bought premium`,
    actorId,
    view: 'wallet',
  })
}

export function notifyApplicationStatus(userId, status) {
  const approved = status === 'approved'
  createNotification({
    userId,
    type: NOTIF_TYPES.application,
    title: approved ? 'Your creator application was approved' : 'Your creator application was not approved',
    body: approved ? 'Studio, live, and analytics are unlocked.' : 'You can update your profile and apply again.',
    view: approved ? 'dashboard' : 'creator-apply',
  })
}

export function notifyApplicationSubmitted(userId, handle) {
  createNotification({
    userId,
    type: NOTIF_TYPES.application,
    title: 'We received your creator application',
    body: 'You will get another notification when it is reviewed.',
    view: 'creator-apply',
  })
  notifyMany(findAdminIds(), {
    type: NOTIF_TYPES.application,
    title: `@${handle || 'someone'} applied to create`,
    actorId: userId,
    view: 'admin',
  })
}

export function notifyIdVerificationSubmitted(userId, handle) {
  createNotification({
    userId,
    type: NOTIF_TYPES.verification,
    title: 'We received your ID for a checkmark',
    body: 'Front and back are in review. This is not a creator application.',
    view: 'verify',
  })
  notifyMany(findAdminIds(), {
    type: NOTIF_TYPES.verification,
    title: `@${handle || 'someone'} submitted an ID for a checkmark`,
    actorId: userId,
    view: 'admin',
  })
}

export function notifyIdVerificationStatus(userId, status, note = '') {
  const approved = status === 'approved'
  createNotification({
    userId,
    type: NOTIF_TYPES.verification,
    title: approved ? 'Your checkmark was accepted' : 'Your checkmark was denied',
    body: approved
      ? 'The checkmark is on your channel. Creator status is separate.'
      : (note || 'You can upload new ID photos and try again.'),
    view: 'verify',
  })
}

export function notifyReport({ reporterId, targetUserId, reason, contentId }) {
  if (reporterId) {
    createNotification({
      userId: reporterId,
      type: NOTIF_TYPES.report,
      title: 'Your report was submitted',
      body: reason || '',
      contentId,
      view: 'notifications',
    })
  }
  if (targetUserId) {
    createNotification({
      userId: targetUserId,
      type: NOTIF_TYPES.report,
      title: 'Your content was reported',
      body: reason || '',
      contentId,
      view: 'support',
    })
  }
  notifyMany(findAdminIds(), {
    type: NOTIF_TYPES.report,
    title: 'New content report',
    body: reason || '',
    actorId: reporterId,
    contentId,
    view: 'admin',
  })
}

export function notifyNewTicket({ userId, handle, subject }) {
  notifyMany(findAdminIds(), {
    type: NOTIF_TYPES.ticket,
    title: `Support ticket from @${handle || 'user'}`,
    body: subject || '',
    actorId: userId,
    view: 'admin',
  })
}
