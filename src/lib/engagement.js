import { lsGet, lsSet } from './storage'
import { notifyNewLike, notifyNewSubscriber, notifyPremium, notifyMentions } from './notifications'

const LIKES = 'engagement_likes'
const USER_VOTES = 'engagement_votes'
const VIEWS = 'engagement_views'
const SUBS = 'engagement_subs'
const WATCH = 'engagement_watch'

export function getVotes(contentId) {
  const all = lsGet(LIKES, {})
  return all[contentId] || { up: 0, down: 0 }
}

export function getUserVote(userId, contentId) {
  if (!userId) return null
  return (lsGet(USER_VOTES, {})[userId] || {})[contentId] || null
}

export function toggleVote(userId, contentId, direction) {
  if (!userId || !contentId) return getVotes(contentId)
  const votes = lsGet(USER_VOTES, {})
  const mine = votes[userId] || {}
  const prev = mine[contentId] || null
  const tally = lsGet(LIKES, {})
  const cur = { ...(tally[contentId] || { up: 0, down: 0 }) }
  const becameUp = direction === 'up' && prev !== 'up'
  if (prev === direction) {
    cur[direction === 'up' ? 'up' : 'down'] = Math.max(0, cur[direction === 'up' ? 'up' : 'down'] - 1)
    delete mine[contentId]
  } else {
    if (prev === 'up') cur.up = Math.max(0, cur.up - 1)
    if (prev === 'down') cur.down = Math.max(0, cur.down - 1)
    cur[direction === 'up' ? 'up' : 'down'] += 1
    mine[contentId] = direction
  }
  votes[userId] = mine
  tally[contentId] = cur
  lsSet(USER_VOTES, votes)
  lsSet(LIKES, tally)
  if (becameUp) notifyNewLike(contentId, userId)
  return cur
}

export function recordView(contentId) {
  if (!contentId) return 0
  const all = lsGet(VIEWS, {})
  all[contentId] = (all[contentId] || 0) + 1
  lsSet(VIEWS, all)
  return all[contentId]
}

export function getViews(contentId) {
  return lsGet(VIEWS, {})[contentId] || 0
}

export function getSubscriptionsForUser(userId) {
  if (!userId) return []
  const all = lsGet(SUBS, {})
  const out = []
  for (const [creatorId, list] of Object.entries(all)) {
    if (Array.isArray(list) && list.includes(userId)) out.push(creatorId)
  }
  return out
}

export function getSubscriberCount(creatorId) {
  return (lsGet(SUBS, {})[creatorId] || []).length
}

export function isSubscribed(userId, creatorId) {
  if (!userId || !creatorId) return false
  return (lsGet(SUBS, {})[creatorId] || []).includes(userId)
}

export function toggleSubscribe(userId, creatorId, { notify = true } = {}) {
  if (!userId || !creatorId || userId === creatorId) return false
  const all = lsGet(SUBS, {})
  const list = all[creatorId] || []
  const i = list.indexOf(userId)
  if (i >= 0) list.splice(i, 1)
  else list.push(userId)
  all[creatorId] = list
  lsSet(SUBS, all)
  const subscribed = list.includes(userId)
  if (notify && subscribed) notifyNewSubscriber(creatorId, userId)
  return subscribed
}

export const PREMIUM_PRICE = 5

export function isPremiumSub(userId, creatorId) {
  return (lsGet(`premium_${creatorId}`, []) || []).includes(userId)
}

export function addPremiumSub(userId, creatorId) {
  const key = `premium_${creatorId}`
  const list = lsGet(key, [])
  const isNew = !list.includes(userId)
  if (isNew) {
    list.push(userId)
    lsSet(key, list)
  }
  if (!isSubscribed(userId, creatorId)) {
    toggleSubscribe(userId, creatorId, { notify: false })
  }
  if (isNew) notifyPremium(creatorId, userId)
  return true
}

export function addWatchSeconds(creatorId, seconds) {
  if (!creatorId || !seconds) return
  const all = lsGet(WATCH, {})
  all[creatorId] = (all[creatorId] || 0) + seconds
  lsSet(WATCH, all)
}

export function getWatchHours(creatorId) {
  return ((lsGet(WATCH, {})[creatorId] || 0) / 3600).toFixed(2)
}

function clipsForCreator(creatorId) {
  const legacy = lsGet('user_clips', []) || []
  const imported = lsGet('imports', []) || []
  const seen = new Set()
  const out = []
  for (const c of [...imported, ...legacy]) {
    if (!c?.id || seen.has(c.id)) continue
    if (c.creatorId === creatorId || c.userId === creatorId) {
      seen.add(c.id)
      out.push(c)
    }
  }
  return out
}

export function getCreatorAnalytics(creatorId) {
  const clips = clipsForCreator(creatorId)
  let totalViews = 0
  let totalUp = 0
  let totalDown = 0
  for (const c of clips) {
    totalViews += getViews(c.id)
    const v = getVotes(c.id)
    totalUp += v.up
    totalDown += v.down
  }
  const live = lsGet(`live_state_${creatorId}`, null)
  return {
    clips: clips.length,
    views: totalViews,
    likes: totalUp,
    dislikes: totalDown,
    subscribers: getSubscriberCount(creatorId),
    premiumSubs: (lsGet(`premium_${creatorId}`, []) || []).length,
    watchHours: getWatchHours(creatorId),
    isLive: !!live?.isLive,
    rankingScore: totalViews * 1 + totalUp * 3 + getSubscriberCount(creatorId) * 10,
  }
}

export function getCreatorRanking(creatorId) {
  const users = Object.keys(lsGet(SUBS, {})).concat(
    [...(lsGet('user_clips', []) || []), ...(lsGet('imports', []) || [])]
      .map((c) => c.creatorId || c.userId)
      .filter(Boolean)
  )
  const unique = [...new Set(users)]
  const ranked = unique
    .map((id) => ({ id, score: getCreatorAnalytics(id).rankingScore }))
    .sort((a, b) => b.score - a.score)
  const idx = ranked.findIndex((r) => r.id === creatorId)
  return idx < 0 ? null : idx + 1
}

export function listEmotes(creatorId) {
  return lsGet(`emotes_${creatorId}`, [])
}

export function addEmote(creatorId, emote) {
  const list = listEmotes(creatorId)
  list.push({
    id: `em_${Date.now()}`,
    code: emote.code.replace(/\s/g, '').slice(0, 20),
    label: emote.label || emote.code,
    createdAt: new Date().toISOString(),
  })
  lsSet(`emotes_${creatorId}`, list)
  return list
}

export function listUserSounds(userId) {
  return lsGet('user_sounds', []).filter((s) => !userId || s.userId === userId)
}

export function createUserSound(payload) {
  const list = lsGet('user_sounds', [])
  const row = { id: `usnd_${Date.now()}`, createdAt: new Date().toISOString(), ...payload }
  list.unshift(row)
  lsSet('user_sounds', list)
  return row
}

export function getLiveChat(streamUserId) {
  return lsGet(`live_chat_${streamUserId}`, [])
}

export function postLiveChat(streamUserId, message) {
  const list = getLiveChat(streamUserId)
  list.push({ id: `msg_${Date.now()}`, ...message, at: new Date().toISOString() })
  lsSet(`live_chat_${streamUserId}`, list.slice(-200))
  notifyMentions({
    text: message?.text,
    actorId: message?.userId,
  })
  return list
}

export function getDonations(creatorId) {
  return lsGet(`donations_${creatorId}`, [])
}

export function addDonation(creatorId, donation) {
  const list = getDonations(creatorId)
  list.unshift({ id: `don_${Date.now()}`, at: new Date().toISOString(), ...donation })
  lsSet(`donations_${creatorId}`, list)
  return list
}
