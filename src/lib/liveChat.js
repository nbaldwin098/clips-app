import { getLiveChat, postLiveChat, isPremiumSub, isSubscribed } from './engagement'
import { getStreamSettings } from './streamSettings'
import { getUserSettings, lsSet } from './storage'
import { getChannelStaff, isChannelMod } from './channelStaff'
import { applyAdSlash, parseAdSlash } from './liveAds'

function blockedPhrases(channelId) {
  const global = String(getUserSettings().blockedTerms || '')
    .split('\n')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const staff = getChannelStaff(channelId)
  const extra = String(staff.blockedTerms || '')
    .split('\n')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return [...global, ...extra]
}

export function removeLiveChatMessage(streamUserId, messageId) {
  const list = getLiveChat(streamUserId).filter((m) => m.id !== messageId)
  lsSet(`live_chat_${streamUserId}`, list)
  return list
}

export function trySendLiveChat(streamUserId, message, { actor } = {}) {
  if (!streamUserId) return { ok: false, error: 'No live channel.' }
  const text = String(message?.text || '').trim().slice(0, 500)
  if (!text) return { ok: false, error: 'Write a message.' }
  const userId = message.userId
  const staff = getChannelStaff(streamUserId)
  const settings = getStreamSettings(streamUserId)

  if (staff.bans?.[userId]) return { ok: false, error: 'You are banned from this chat.' }
  const until = Number(staff.timeouts?.[userId] || 0)
  if (until > Date.now()) {
    const sec = Math.ceil((until - Date.now()) / 1000)
    return { ok: false, error: `Timed out for ${sec}s.` }
  }

  if (settings.subscriberOnlyChat && userId !== streamUserId) {
    const ok = isPremiumSub(userId, streamUserId) || isSubscribed(userId, streamUserId)
    if (!ok) return { ok: false, error: 'Subscribers only.' }
  }

  const slow = Number(settings.slowModeSeconds || 0)
  if (slow > 0 && userId !== streamUserId && !isChannelMod(streamUserId, actor)) {
    const last = [...getLiveChat(streamUserId)].reverse().find((m) => m.userId === userId && m.kind !== 'donation' && m.kind !== 'bot')
    if (last?.at) {
      const wait = slow * 1000 - (Date.now() - new Date(last.at).getTime())
      if (wait > 0) return { ok: false, error: `Slow mode: wait ${Math.ceil(wait / 1000)}s.` }
    }
  }

  const lower = text.toLowerCase()
  if (blockedPhrases(streamUserId).some((w) => w && lower.includes(w))) {
    return { ok: false, error: 'That phrase is blocked in this chat.' }
  }

  postLiveChat(streamUserId, { ...message, text, kind: message.kind || 'chat' })

  if (parseAdSlash(text) && message.kind !== 'bot') {
    const ads = applyAdSlash(streamUserId, actor || { id: userId }, text)
    if (ads.botReply) {
      postLiveChat(streamUserId, {
        userId: `bot:${streamUserId}`,
        handle: staff.botName || 'Desk bot',
        text: ads.botReply,
        kind: 'bot',
      })
    }
  } else if (text.startsWith('!') && staff.botsEnabled && message.kind !== 'bot') {
    const trigger = text.split(/\s+/)[0].toLowerCase()
    let reply = ''
    if (trigger === '!rules') reply = staff.rules || 'No channel rules yet.'
    const custom = (staff.commands || []).find((c) => c.enabled !== false && c.trigger === trigger)
    if (custom) reply = custom.reply
    if (reply) {
      postLiveChat(streamUserId, {
        userId: `bot:${streamUserId}`,
        handle: staff.botName || 'Desk bot',
        text: reply,
        kind: 'bot',
      })
    }
  }

  return { ok: true }
}
