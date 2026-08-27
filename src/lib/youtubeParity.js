import { lsGet, lsSet } from './storage'
import { notifyNewComment, notifyFollowersOfPost, DEFAULT_NOTIF_PREFS } from './notifications'
import { pushComment, pushPlaylist } from './graphSync'

const K = {
  comments: 'yt_comments', playlists: 'yt_playlists', posts: 'yt_posts', notifPrefs: 'yt_notif_prefs',
  reports: 'yt_reports', blocks: 'yt_blocks', historyPaused: 'yt_history_paused', searchHist: 'yt_search_hist',
  drafts: 'yt_drafts', scheduled: 'yt_scheduled', chapters: 'yt_chapters', cards: 'yt_cards',
  endScreens: 'yt_endscreens', captions: 'yt_captions', memberships: 'yt_membership_tiers', goals: 'yt_goals',
  polls: 'yt_polls', mods: 'yt_mods', blockedWords: 'yt_blocked_words', heldComments: 'yt_held_comments',
  strikes: 'yt_strikes', devices: 'yt_devices', twofa: 'yt_2fa', earnSettings: 'yt_earn',
  productTags: 'yt_product_tags', experiments: 'yt_ab_tests', channelLinks: 'yt_channel_links',
  channelLayout: 'yt_channel_layout', watchPrefs: 'yt_watch_prefs', copyrightClaims: 'yt_copyright_claims',
  appeals: 'yt_appeals', premieres: 'yt_premieres', merch: 'yt_merch', inspiration: 'yt_inspiration_notes',
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function listComments(contentId) {
  return (lsGet(K.comments, {})[contentId] || []).filter((c) => !c.deleted)
}
export function addComment(contentId, { userId, handle, text, parentId = null, donationUsd = 0 }) {
  const all = lsGet(K.comments, {})
  const list = all[contentId] || []
  const words = getBlockedWords()
  const lower = String(text).toLowerCase()
  const held = words.some((w) => w && lower.includes(w.toLowerCase()))
  const row = {
    id: id('cmt'), userId, handle, text: String(text).slice(0, 5000), parentId,
    likes: 0, likedBy: [], pinned: false, hearted: false,
    donationUsd: Number(donationUsd) > 0 ? Number(donationUsd) : 0,
    createdAt: new Date().toISOString(), held, deleted: false,
  }
  list.push(row)
  all[contentId] = list
  lsSet(K.comments, all)
  if (held) {
    const heldAll = lsGet(K.heldComments, [])
    heldAll.unshift({ ...row, contentId })
    lsSet(K.heldComments, heldAll.slice(0, 200))
  }
  const parent = parentId ? list.find((c) => c.id === parentId) : null
  notifyNewComment({
    contentId,
    actorId: userId,
    text: row.text,
    parentAuthorId: parent?.userId || null,
    held,
  })
  pushComment(contentId, row)
  queueMicrotask(() => {
    import('./creatorInteractions').then(({ logCreatorInteraction, creatorIdForContent }) => {
      const creatorId = creatorIdForContent(contentId)
      if (!creatorId || creatorId === userId) return
      logCreatorInteraction({
        creatorId,
        contentId,
        type: 'comment',
        actorId: userId,
        title: '',
        surface: 'unknown',
      })
    }).catch(() => {})
  })
  return row
}
export function toggleCommentLike(contentId, commentId, userId) {
  const all = lsGet(K.comments, {})
  const list = all[contentId] || []
  const c = list.find((x) => x.id === commentId)
  if (!c) return null
  c.likedBy = c.likedBy || []
  const i = c.likedBy.indexOf(userId)
  if (i >= 0) { c.likedBy.splice(i, 1); c.likes = Math.max(0, (c.likes || 0) - 1) }
  else { c.likedBy.push(userId); c.likes = (c.likes || 0) + 1 }
  lsSet(K.comments, all)
  pushComment(contentId, c)
  return c
}
export function pinComment(contentId, commentId) {
  const all = lsGet(K.comments, {})
  const list = all[contentId] || []
  for (const c of list) c.pinned = c.id === commentId ? !c.pinned : false
  lsSet(K.comments, all)
  const changed = list.find((c) => c.id === commentId)
  if (changed) pushComment(contentId, changed)
  return list
}
export function heartComment(contentId, commentId) {
  const all = lsGet(K.comments, {})
  const c = (all[contentId] || []).find((x) => x.id === commentId)
  if (!c) return null
  c.hearted = !c.hearted
  lsSet(K.comments, all)
  pushComment(contentId, c)
  return c
}
export function deleteComment(contentId, commentId) {
  const all = lsGet(K.comments, {})
  const c = (all[contentId] || []).find((x) => x.id === commentId)
  if (c) {
    c.deleted = true
    lsSet(K.comments, all)
    pushComment(contentId, c)
  } else {
    lsSet(K.comments, all)
  }
}
export function listPlaylists(userId) {
  return (lsGet(K.playlists, []) || []).filter((p) => !userId || p.userId === userId)
}
export function getPlaylist(playlistId) {
  return (lsGet(K.playlists, []) || []).find((p) => p.id === playlistId) || null
}
export function createPlaylist({ userId, title, visibility = 'public' }) {
  const list = lsGet(K.playlists, [])
  const row = { id: id('pl'), userId, title: String(title).slice(0, 150), visibility, items: [], collaborative: false, createdAt: new Date().toISOString() }
  list.unshift(row)
  lsSet(K.playlists, list)
  pushPlaylist(row)
  return row
}
export function addToPlaylist(playlistId, contentId) {
  const list = lsGet(K.playlists, [])
  const p = list.find((x) => x.id === playlistId)
  if (!p) return null
  if (!p.items.includes(contentId)) p.items.push(contentId)
  lsSet(K.playlists, list)
  pushPlaylist(p)
  return p
}
export function removeFromPlaylist(playlistId, contentId) {
  const list = lsGet(K.playlists, [])
  const p = list.find((x) => x.id === playlistId)
  if (!p) return null
  p.items = (p.items || []).filter((id) => id !== contentId)
  lsSet(K.playlists, list)
  pushPlaylist(p)
  return p
}
export function listPosts(creatorId) {
  return (lsGet(K.posts, []) || []).filter((p) => !creatorId || p.creatorId === creatorId)
}
export function createPost(payload) {
  const list = lsGet(K.posts, [])
  const row = { id: id('post'), type: payload.type || 'text', text: String(payload.text || '').slice(0, 5000), pollOptions: payload.pollOptions || [], votes: {}, imageData: payload.imageData || null, scheduledFor: payload.scheduledFor || null, published: !payload.scheduledFor, creatorId: payload.creatorId, handle: payload.handle, createdAt: new Date().toISOString(), likes: 0 }
  list.unshift(row)
  lsSet(K.posts, list)
  if (row.published && row.creatorId) {
    notifyFollowersOfPost({ creatorId: row.creatorId, handle: row.handle, text: row.text })
  }
  return row
}
export function votePoll(postId, userId, optionIndex) {
  const list = lsGet(K.posts, [])
  const p = list.find((x) => x.id === postId)
  if (!p || p.type !== 'poll') return null
  p.votes = p.votes || {}
  p.votes[userId] = optionIndex
  lsSet(K.posts, list)
  return p
}
export function submitReport(payload) {
  const list = lsGet(K.reports, [])
  list.unshift({ id: id('rpt'), ...payload, createdAt: new Date().toISOString(), status: 'open' })
  lsSet(K.reports, list.slice(0, 500))
  return list[0]
}
export function listReports() {
  return lsGet(K.reports, []) || []
}
export function setReportStatus(id, status) {
  const list = (lsGet(K.reports, []) || []).map((r) => (r.id === id ? { ...r, status } : r))
  lsSet(K.reports, list)
}
export function blockUser(blockerId, targetId) {
  const all = lsGet(K.blocks, {})
  const set = new Set(all[blockerId] || [])
  set.add(targetId)
  all[blockerId] = [...set]
  lsSet(K.blocks, all)
}
export function isBlocked(blockerId, targetId) {
  return (lsGet(K.blocks, {})[blockerId] || []).includes(targetId)
}
export function isHistoryPaused() { return !!lsGet(K.historyPaused, false) }
export function setHistoryPaused(v) { lsSet(K.historyPaused, !!v) }
export function pushSearchHistory(q) {
  if (!q) return
  const list = lsGet(K.searchHist, []).filter((x) => x !== q)
  list.unshift(q)
  lsSet(K.searchHist, list.slice(0, 50))
}
export function getSearchHistory() { return lsGet(K.searchHist, []) }
export function clearSearchHistory() { lsSet(K.searchHist, []) }
export function listDrafts(userId) { return (lsGet(K.drafts, []) || []).filter((d) => d.userId === userId) }
export function saveDraft(draft) {
  const list = lsGet(K.drafts, [])
  const existing = draft?.id ? list.find((d) => d.id === draft.id) : null
  const row = {
    id: existing?.id || id('draft'),
    ...existing,
    ...draft,
    updatedAt: new Date().toISOString(),
  }
  const next = [row, ...list.filter((d) => d.id !== row.id)].slice(0, 100)
  lsSet(K.drafts, next)
  return row
}
export function deleteDraft(draftId) {
  lsSet(K.drafts, (lsGet(K.drafts, []) || []).filter((d) => d.id !== draftId))
}
export function scheduleContent(item) {
  const list = lsGet(K.scheduled, [])
  const row = { id: id('sched'), ...item, createdAt: new Date().toISOString() }
  list.unshift(row)
  lsSet(K.scheduled, list)
  return row
}
export function listScheduled(userId) { return (lsGet(K.scheduled, []) || []).filter((s) => s.userId === userId) }
export function deleteScheduled(schedId) {
  lsSet(K.scheduled, (lsGet(K.scheduled, []) || []).filter((s) => s.id !== schedId))
}
export function setChapters(contentId, chapters) {
  const all = lsGet(K.chapters, {})
  all[contentId] = chapters.map((c) => ({ title: String(c.title).slice(0, 100), t: Number(c.t) || 0 }))
  lsSet(K.chapters, all)
}
export function getChapters(contentId) { return lsGet(K.chapters, {})[contentId] || [] }
export function setCards(contentId, cards) { const all = lsGet(K.cards, {}); all[contentId] = cards; lsSet(K.cards, all) }
export function getCards(contentId) { return lsGet(K.cards, {})[contentId] || [] }
export function setEndScreen(contentId, data) { const all = lsGet(K.endScreens, {}); all[contentId] = data; lsSet(K.endScreens, all) }
export function getEndScreen(contentId) { return lsGet(K.endScreens, {})[contentId] || null }
export function setCaptions(contentId, tracks) { const all = lsGet(K.captions, {}); all[contentId] = tracks; lsSet(K.captions, all) }
export function getCaptions(contentId) { return lsGet(K.captions, {})[contentId] || [] }
export function getMembershipTiers(creatorId) {
  return lsGet(K.memberships, {})[creatorId] || [{ id: 't1', name: 'Member', price: 5, perks: ['Badge', 'Emotes', 'Members posts'] }]
}
export function setMembershipTiers(creatorId, tiers) { const all = lsGet(K.memberships, {}); all[creatorId] = tiers; lsSet(K.memberships, all) }
export function getGoal(creatorId) { return lsGet(K.goals, {})[creatorId] || { title: 'Goal', current: 0, target: 100 } }
export function setGoal(creatorId, goal) { const all = lsGet(K.goals, {}); all[creatorId] = goal; lsSet(K.goals, all) }
export function createLivePoll(streamId, question, options) {
  const all = lsGet(K.polls, {})
  const row = { id: id('poll'), question, options, votes: {}, streamId }
  all[streamId] = row
  lsSet(K.polls, all)
  return row
}
export function getLivePoll(streamId) { return lsGet(K.polls, {})[streamId] || null }
export function getMods(channelId) {
  return lsGet(K.mods, {})[channelId] || { mods: [], vips: [], slowMode: 0, followersOnly: false, subscribersOnly: false }
}
export function setMods(channelId, data) { const all = lsGet(K.mods, {}); all[channelId] = data; lsSet(K.mods, all) }
export function getBlockedWords(channelId = 'global') {
  return lsGet(K.blockedWords, {})[channelId] || lsGet(K.blockedWords, {}).global || []
}
export function setBlockedWords(channelId, words) {
  const all = lsGet(K.blockedWords, {})
  all[channelId] = words.map((w) => String(w).trim()).filter(Boolean).slice(0, 200)
  lsSet(K.blockedWords, all)
}
export function listHeldComments() { return lsGet(K.heldComments, []) }
export function listStrikes(userId) { return (lsGet(K.strikes, []) || []).filter((s) => s.userId === userId) }
export function listCopyrightClaims(userId) { return (lsGet(K.copyrightClaims, []) || []).filter((c) => !userId || c.userId === userId) }
export function addCopyrightClaim(row) {
  const list = lsGet(K.copyrightClaims, [])
  list.unshift({ id: id('cc'), ...row, at: new Date().toISOString(), status: 'active' })
  lsSet(K.copyrightClaims, list)
}
export function submitAppeal(row) {
  const list = lsGet(K.appeals, [])
  list.unshift({ id: id('apl'), ...row, at: new Date().toISOString(), status: 'pending' })
  lsSet(K.appeals, list)
  return list[0]
}
export function listAppeals(userId) {
  const list = lsGet(K.appeals, []) || []
  if (!userId) return list
  return list.filter((a) => a.userId === userId)
}
export function listDevices(userId) {
  const all = lsGet(K.devices, {})
  if (!all[userId]?.length) {
    all[userId] = [{ id: 'dev_this', name: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 40) : 'This device', lastActive: new Date().toISOString(), current: true }]
    lsSet(K.devices, all)
  }
  return all[userId]
}
export function get2FA(userId) { return lsGet(K.twofa, {})[userId] || { enabled: false, secret: null, recovery: [] } }
export function enable2FA(userId) {
  const all = lsGet(K.twofa, {})
  const secret = Math.random().toString(36).slice(2, 12).toUpperCase()
  const recovery = Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 8).toUpperCase())
  all[userId] = { enabled: true, secret, recovery }
  lsSet(K.twofa, all)
  return all[userId]
}
export function disable2FA(userId) {
  const all = lsGet(K.twofa, {})
  all[userId] = { enabled: false, secret: null, recovery: [] }
  lsSet(K.twofa, all)
}
export function getEarnSettings(userId) {
  return lsGet(K.earnSettings, {})[userId] || { adsEnabled: false, memberships: true, superChat: true, yppStatus: 'not_applied' }
}
export function setEarnSettings(userId, partial) {
  const all = lsGet(K.earnSettings, {})
  all[userId] = { ...getEarnSettings(userId), ...partial }
  lsSet(K.earnSettings, all)
  return all[userId]
}
export function listMerch(creatorId) { return lsGet(K.merch, {})[creatorId] || [] }
export function setMerch(creatorId, items) { const all = lsGet(K.merch, {}); all[creatorId] = items; lsSet(K.merch, all) }
export function getChannelLinks(userId) { return lsGet(K.channelLinks, {})[userId] || [] }
export function setChannelLinks(userId, links) { const all = lsGet(K.channelLinks, {}); all[userId] = links.slice(0, 5); lsSet(K.channelLinks, all) }
export function listExperiments(userId) { return (lsGet(K.experiments, []) || []).filter((e) => e.userId === userId) }
export function createExperiment(row) {
  const list = lsGet(K.experiments, [])
  const item = { id: id('ab'), ...row, status: 'running', createdAt: new Date().toISOString() }
  list.unshift(item)
  lsSet(K.experiments, list)
  return item
}
export function schedulePremiere(row) {
  const list = lsGet(K.premieres, [])
  const item = { id: id('prem'), ...row, createdAt: new Date().toISOString() }
  list.unshift(item)
  lsSet(K.premieres, list)
  return item
}
export function listPremieres(userId) { return (lsGet(K.premieres, []) || []).filter((p) => p.userId === userId) }
export function getNotifPrefs(userId) {
  return { ...DEFAULT_NOTIF_PREFS, ...(lsGet(K.notifPrefs, {})[userId] || {}) }
}
export function setNotifPrefs(userId, partial) {
  const all = lsGet(K.notifPrefs, {})
  all[userId] = { ...getNotifPrefs(userId), ...partial }
  lsSet(K.notifPrefs, all)
  return all[userId]
}
export function getWatchPrefs() {
  return lsGet(K.watchPrefs, null) || { autoplay: true, ambient: false, theater: false, restrictedMode: false, hideDisliked: false, defaultSpeed: 1 }
}
export function setWatchPrefs(partial) {
  const next = { ...getWatchPrefs(), ...partial }
  lsSet(K.watchPrefs, next)
  return next
}
export function exportUserData(userId) {
  return { exportedAt: new Date().toISOString(), userId, playlists: listPlaylists(userId), posts: listPosts(userId), drafts: listDrafts(userId), earn: getEarnSettings(userId), devices: listDevices(userId) }
}
export function saveInspiration(userId, note) {
  const all = lsGet(K.inspiration, {})
  const list = all[userId] || []
  list.unshift({ id: id('insp'), note, at: new Date().toISOString() })
  all[userId] = list.slice(0, 50)
  lsSet(K.inspiration, all)
  return all[userId]
}
export function listInspiration(userId) { return lsGet(K.inspiration, {})[userId] || [] }

const COMMENT_PREFS = 'clips_comment_prefs'
export const DEFAULT_COMMENT_PREFS = {
  showDonationsOnComments: true,
  defaultSort: 'top',
}

export function getCommentPrefs(userId) {
  if (!userId) return { ...DEFAULT_COMMENT_PREFS }
  const all = lsGet(COMMENT_PREFS, {}) || {}
  return { ...DEFAULT_COMMENT_PREFS, ...(all[userId] || {}) }
}

export function setCommentPrefs(userId, partial) {
  if (!userId) return { ...DEFAULT_COMMENT_PREFS }
  const all = lsGet(COMMENT_PREFS, {}) || {}
  const next = { ...getCommentPrefs(userId), ...partial, updatedAt: new Date().toISOString() }
  all[userId] = next
  lsSet(COMMENT_PREFS, all)
  return next
}

export const FEATURE_CHECKLIST = [
  'Comments + playlists + community posts', 'Like/dislike + views + subs', 'Clips Rank algorithm', 'Live chat/donate/premium', 'Studio tools + analytics', 'Admin + DMCA pages', 'Watch history toggle', 'Unique handles', 'Report/block', 'Sounds library',
]
