import { lsGet, lsSet } from './storage'
import { clearFrozenFeeds } from './frozenFeeds'
import { pushLiveChatMessage, readLocalLiveChat, resolveLiveChatChannelId } from './liveChatSync'
import { notifyNewLike, notifyNewSubscriber, notifyPremium, notifyMentions } from './notifications'
import { notifyContentChanged } from './contentSync'
import { pushFollow, pushVote } from './graphSync'
import { recordHourView } from './hourViewEvents'

const LIKES = 'engagement_likes'
const USER_VOTES = 'engagement_votes'
const VIEWS = 'engagement_views'
const SUBS = 'engagement_subs'
const WATCH = 'engagement_watch'
const UNIQUE_VIEWS_MIGRATED = 'clips_unique_views_migrated_v1'

/** Drop legacy rewatch tallies once — unique viewer sets + cloud counts rebuild truth. */
function ensureUniqueViewMigration() {
  try {
    if (lsGet(UNIQUE_VIEWS_MIGRATED, false)) return
    lsSet(VIEWS, {})
    lsSet(UNIQUE_VIEWS_MIGRATED, true)
  } catch {}
}
ensureUniqueViewMigration()

export function getVotes(contentId) {
  const all = lsGet(LIKES, {})
  return all[contentId] || { up: 0, down: 0 }
}

export function getUserVote(userId, contentId) {
  if (!userId) return null
  return (lsGet(USER_VOTES, {})[userId] || {})[contentId] || null
}

export function toggleVote(userId, contentId, direction, meta = {}) {
  if (!userId || !contentId) return getVotes(contentId)
  if (direction !== 'up' && direction !== 'down') return getVotes(contentId)
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
  const liked = new Set(lsGet('liked', []))
  if (mine[contentId] === 'up') liked.add(contentId)
  else liked.delete(contentId)
  lsSet('liked', [...liked])
  pushVote(userId, contentId, mine[contentId] || null)
  if (becameUp) {
    notifyNewLike(contentId, userId)
    queueMicrotask(() => {
      import('./creatorInteractions').then(({ logCreatorInteraction, creatorIdForContent }) => {
        const creatorId = meta.creatorId || creatorIdForContent(contentId)
        if (!creatorId) return
        logCreatorInteraction({
          creatorId,
          contentId,
          type: 'like',
          actorId: userId,
          title: meta.title || '',
          surface: meta.surface || 'unknown',
          contentType: meta.contentType || null,
        })
      }).catch(() => {})
    })
  }
  notifyContentChanged()
  return cur
}

/** Like once. Never removes a like. Logs creator interaction when first liked. */
export function ensureUpvote(userId, contentId, meta = {}) {
  if (!userId || !contentId) return getVotes(contentId)
  const votes = lsGet(USER_VOTES, {})
  const mine = { ...(votes[userId] || {}) }
  if (mine[contentId] === 'up') return getVotes(contentId)
  const tally = lsGet(LIKES, {})
  const cur = { ...(tally[contentId] || { up: 0, down: 0 }) }
  if (mine[contentId] === 'down') cur.down = Math.max(0, cur.down - 1)
  cur.up += 1
  mine[contentId] = 'up'
  votes[userId] = mine
  tally[contentId] = cur
  lsSet(USER_VOTES, votes)
  lsSet(LIKES, tally)
  const liked = new Set(lsGet('liked', []))
  liked.add(contentId)
  lsSet('liked', [...liked])
  pushVote(userId, contentId, 'up')
  notifyNewLike(contentId, userId)
  queueMicrotask(() => {
    import('./creatorInteractions').then(({ logCreatorInteraction, creatorIdForContent }) => {
      const creatorId = meta.creatorId || creatorIdForContent(contentId)
      if (!creatorId) return
      logCreatorInteraction({
        creatorId,
        contentId,
        type: 'like',
        actorId: userId,
        title: meta.title || '',
        surface: meta.surface || 'unknown',
        contentType: meta.contentType || null,
      })
    }).catch(() => {})
  })
  notifyContentChanged()
  return cur
}

export function getUserUpvotedIds(userId) {
  if (!userId) return []
  const mine = lsGet(USER_VOTES, {})[userId] || {}
  return Object.entries(mine).filter(([, dir]) => dir === 'up').map(([id]) => id)
}

export function recordView(contentId, meta = {}) {
  if (!contentId) return 0
  const all = lsGet(VIEWS, {}) || {}
  const map = all && typeof all === 'object' && !Array.isArray(all) ? all : {}

  queueMicrotask(() => {
    Promise.all([
      import('./creatorInteractions'),
      import('./graphSync').catch(() => ({ getGraphActor: () => null })),
      import('./uniqueViews'),
    ]).then(async ([{ logCreatorInteraction, creatorIdForContent }, graph, unique]) => {
      const creatorId = meta.creatorId || creatorIdForContent(contentId)
      if (!creatorId) return
      const actorId = meta.actorId || graph?.getGraphActor?.()?.id || null
      const viewerKey = unique.resolveViewerKey(actorId)
      unique.markUniqueViewer(contentId, viewerKey)
      const uniqueCount = unique.uniqueViewerCount(contentId)
      map[contentId] = uniqueCount
      lsSet(VIEWS, map)
      recordHourView(contentId)

      logCreatorInteraction({
        creatorId,
        contentId,
        type: 'view',
        actorId,
        title: meta.title || '',
        surface: meta.surface || 'unknown',
        contentType: meta.contentType || null,
      })

      try {
        const { getSupabase, isSupabaseConfigured } = await import('./supabaseClient')
        if (isSupabaseConfigured()) {
          const sb = await getSupabase()
          if (sb) {
            const { data, error } = await sb.functions.invoke('record-content-view', {
              body: {
                contentId,
                creatorId,
                surface: meta.surface || 'unknown',
                contentType: meta.contentType || null,
                title: meta.title || '',
              },
            })
            if (!error && data?.views != null) {
              map[contentId] = Math.max(uniqueCount, Number(data.views) || 0)
              lsSet(VIEWS, map)
              return
            }
          }
        }
      } catch {}

      import('./economySync').then(({ pushContentView }) => {
        pushContentView({
          contentId,
          creatorId,
          actorId,
          viewerKey,
          surface: meta.surface || 'unknown',
          contentType: meta.contentType || null,
        }).catch(() => {})
      }).catch(() => {})
    }).catch(() => {})
  })

  return getViews(contentId)
}

export function getViews(contentId) {
  if (!contentId) return 0
  try {
    const UNIQUE_KEY = 'clips_unique_viewers_v1'
    const uniq = lsGet(UNIQUE_KEY, {}) || {}
    // Once unique tracking exists for this post, never fall back to legacy rewatch counters.
    if (Object.prototype.hasOwnProperty.call(uniq, contentId)) {
      const bucket = uniq[contentId]
      return bucket && typeof bucket === 'object' ? Object.keys(bucket).length : 0
    }
  } catch {}
  const all = lsGet(VIEWS, {}) || {}
  const map = all && typeof all === 'object' && !Array.isArray(all) ? all : {}
  return Number(map[contentId]) || 0
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
  clearFrozenFeeds()
  const subscribed = list.includes(userId)
  pushFollow(userId, creatorId, subscribed)
  if (notify && subscribed) notifyNewSubscriber(creatorId, userId)
  if (subscribed) {
    queueMicrotask(() => {
      import('./creatorInteractions').then(({ logCreatorInteraction }) => {
        logCreatorInteraction({
          creatorId,
          contentId: null,
          type: 'subscribe',
          actorId: userId,
          title: 'Channel follow',
          surface: 'channel',
          contentType: 'channel',
        })
      }).catch(() => {})
    })
  }
  return subscribed
}

const BUY_KEY = 'clips_content_purchases'

export function hasPurchasedContent(userId, contentId) {
  if (!userId || !contentId) return false
  return (lsGet(BUY_KEY, {})[userId] || []).includes(contentId)
}

export function markContentPurchased(userId, contentId) {
  if (!userId || !contentId) return false
  const all = lsGet(BUY_KEY, {}) || {}
  const list = all[userId] || []
  if (!list.includes(contentId)) list.push(contentId)
  all[userId] = list
  lsSet(BUY_KEY, all)
  return true
}

export function canAccessPaidPost(user, item) {
  const price = Number(item?.priceUsd) || 0
  if (price <= 0) return true
  if (!item) return true
  const uid = user?.id
  if (!uid) return false
  const owner = item.creatorId || item.userId
  if (owner && owner === uid) return true
  if (owner && isPremiumSub(uid, owner)) return true
  return hasPurchasedContent(uid, item.id)
}

export const PREMIUM_PRICE = 5
const PRICE_KEY = 'membership_price'

export function getMembershipPrice(creatorId) {
  const n = Number((lsGet(PRICE_KEY, {}) || {})[creatorId])
  if (n >= 1 && n <= 50) return Math.round(n * 100) / 100
  return PREMIUM_PRICE
}

export function setMembershipPrice(creatorId, amount) {
  if (!creatorId) return PREMIUM_PRICE
  const n = Number(amount)
  if (!(n >= 1 && n <= 50)) return getMembershipPrice(creatorId)
  const all = lsGet(PRICE_KEY, {}) || {}
  all[creatorId] = Math.round(n * 100) / 100
  lsSet(PRICE_KEY, all)
  return all[creatorId]
}

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
  if (isNew) {
    notifyPremium(creatorId, userId)
    queueMicrotask(() => {
      import('./economySync').then(({ pushPremiumSub }) => {
        pushPremiumSub(userId, creatorId).catch(() => {})
      }).catch(() => {})
      import('./creatorInteractions').then(({ logCreatorInteraction }) => {
        logCreatorInteraction({
          creatorId,
          contentId: null,
          type: 'subscribe',
          actorId: userId,
          title: 'Premium member',
          surface: 'channel',
          contentType: 'channel',
          weight: 3,
        })
      }).catch(() => {})
    })
  }
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

export function listCreatorAnalyticsRows(creatorId) {
  return clipsForCreator(creatorId).map((c) => {
    const votes = getVotes(c.id)
    return {
      id: c.id,
      title: c.title || 'Untitled',
      type: c.type || 'short',
      createdAt: c.createdAt || c.publishedAt || c.importedAt || '',
      views: getViews(c.id),
      likes: votes.up || 0,
    }
  })
}

export function filterAnalyticsRows(rows, range = 'all') {
  const list = Array.isArray(rows) ? rows : []
  if (range === 'all') return list
  const days = range === '7d' ? 7 : 30
  const cut = Date.now() - days * 86400000
  return list.filter((r) => {
    const t = Date.parse(r.createdAt)
    return Number.isFinite(t) && t >= cut
  })
}

export function summarizeAnalyticsRows(rows) {
  const list = Array.isArray(rows) ? rows : []
  const byType = { video: 0, short: 0, pic: 0 }
  let views = 0
  let likes = 0
  for (const r of list) {
    views += Number(r.views) || 0
    likes += Number(r.likes) || 0
    const t = r.type === 'video' || r.type === 'pic' ? r.type : 'short'
    byType[t] = (byType[t] || 0) + 1
  }
  return { posts: list.length, views, likes, byType }
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
  return readLocalLiveChat(resolveLiveChatChannelId(streamUserId))
}

export function postLiveChat(streamUserId, message) {
  const resolved = resolveLiveChatChannelId(streamUserId)
  const row = pushLiveChatMessage(resolved, message)
  notifyMentions({
    text: message?.text,
    actorId: message?.userId,
  })
  return readLocalLiveChat(resolved)
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
