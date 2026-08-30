import { getLiveChat, postLiveChat, isPremiumSub, isSubscribed } from './engagement'
import {
  removeLiveChatMessageCloud,
  isGlobalLiveChannel,
  GLOBAL_LIVE_CHANNEL_ID,
  resolveLiveChatChannelId,
} from './liveChatSync'
import { getStreamSettings } from './streamSettings'
import { getUserSettings } from './storage'
import { getChannelStaff, isChannelMod } from './channelStaff'

function blockedPhrases(channelId) {
  const global = String(getUserSettings().blockedTerms || '')
    .split('\n')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (isGlobalLiveChannel(channelId)) return global
  const staff = getChannelStaff(channelId)
  const extra = String(staff.blockedTerms || '')
    .split('\n')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return [...global, ...extra]
}

export function removeLiveChatMessage(streamUserId, messageId) {
  const resolved = resolveLiveChatChannelId(streamUserId)
  removeLiveChatMessageCloud(resolved, messageId)
  return getLiveChat(resolved)
}

export function trySendLiveChat(streamUserId, message, { actor } = {}) {
  if (!actor?.id) return { ok: false, error: 'Sign in to chat.' }
  const channelId = streamUserId || GLOBAL_LIVE_CHANNEL_ID
  const text = String(message?.text || '').trim().slice(0, 500)
  if (!text) return { ok: false, error: 'Write a message.' }
  if (message?.userId && message.userId !== actor.id) {
    return { ok: false, error: 'Sign in to chat.' }
  }
  // Soft filter: emoji/symbol-only spam (allow a single emoji reaction).
  const noSpace = text.replace(/\s+/g, '')
  const withoutEmoji = noSpace.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{1F1E0}-\u{1F1FF}]/gu,
    ''
  )
  if (noSpace.length >= 6 && withoutEmoji.length === 0) {
    return { ok: false, error: 'Ease up on emoji-only spam.' }
  }
  const userId = message.userId

  if (isGlobalLiveChannel(channelId)) {
    const lower = text.toLowerCase()
    if (blockedPhrases(channelId).some((w) => w && lower.includes(w))) {
      return { ok: false, error: 'That phrase is blocked in this chat.' }
    }
    postLiveChat(GLOBAL_LIVE_CHANNEL_ID, { ...message, text, kind: message.kind || 'chat' })
    return { ok: true }
  }

  if (!streamUserId) return { ok: false, error: 'No live channel.' }
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
    if (!ok) return { ok: false, error: 'Followers or premium only.' }
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

  if (text.startsWith('!') && staff.botsEnabled && message.kind !== 'bot') {
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
