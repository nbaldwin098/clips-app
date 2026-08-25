/**
 * Creator setup checklist — device-local progress for Creator Studio and Live.
 */
import { lsGet } from './storage'
import { getCreatorContent } from './contentService'
import { ensureStreamKey } from './streamKeys'
import { getPayoutContact } from './payouts'
import { getApplicationForUser } from './moderation'
import { getIdVerificationForUser, isVerifiedChannel } from './verification'
import { liveIngestConnected } from './liveIngest'

export const CREATOR_SETUP_STEPS = [
  {
    id: 'profile',
    label: 'Complete your profile',
    hint: 'Add a display name and bio on Account.',
    route: { view: 'settings', section: 'account' },
  },
  {
    id: 'first-post',
    label: 'Publish first post',
    hint: 'Upload or import a clip, video, or pic.',
    route: { view: 'dashboard', action: 'upload' },
  },
  {
    id: 'stream-key',
    label: 'Set up streaming',
    hint: 'Copy your stream key and read ingest notes.',
    route: { view: 'settings', section: 'stream' },
  },
  {
    id: 'payout',
    label: 'Add payout contact',
    hint: 'PayPal, Venmo, or Cash App for manual payouts.',
    route: { view: 'settings', section: 'revenue' },
  },
  {
    id: 'apply',
    label: 'Apply to earn',
    hint: 'Owner approves before manual payouts.',
    route: { view: 'creator-apply' },
  },
  {
    id: 'verify',
    label: 'Get verified badge',
    hint: 'Upload ID for a channel checkmark.',
    route: { view: 'verify' },
  },
  {
    id: 'live',
    label: 'Try the live lobby',
    hint: 'Preview on this device; listing needs ingest.',
    route: { view: 'live' },
  },
]

export function profileComplete(user) {
  if (!user?.id) return false
  return Boolean(String(user.displayName || '').trim()) && Boolean(String(user.bio || '').trim())
}

export function hasFirstPost(user) {
  if (!user?.id) return false
  return getCreatorContent(user.id, user.handle).length > 0
}

export function streamSetupComplete(user) {
  if (!user?.id) return false
  if (lsGet(`stream_key_ack_${user.id}`, false)) return true
  if (lsGet(`live_draft_${user.id}`, null)) return true
  const state = lsGet(`live_state_${user.id}`, null)
  if (state?.startedAt || state?.isLive) return true
  return false
}

export function hasPayoutContact(userId) {
  if (!userId) return false
  const c = getPayoutContact(userId)
  return Boolean(String(c.handle || '').trim())
}

export function applyStatus(user) {
  if (!user?.id) return 'none'
  if (user.creatorStatus === 'approved') return 'approved'
  if (user.creatorStatus === 'pending') return 'pending'
  if (user.creatorStatus === 'rejected') return 'rejected'
  const app = getApplicationForUser(user.id)
  if (app?.status === 'pending') return 'pending'
  if (app?.status === 'rejected') return 'rejected'
  if (app?.status === 'approved') return 'approved'
  return 'none'
}

export function applyComplete(user) {
  return applyStatus(user) === 'approved'
}

export function verifyComplete(user) {
  if (!user?.id) return false
  if (isVerifiedChannel(user.id, user.handle)) return true
  return getIdVerificationForUser(user.id)?.status === 'approved'
}

export function verifyStatus(user) {
  if (verifyComplete(user)) return 'approved'
  const row = getIdVerificationForUser(user?.id)
  if (row?.status === 'pending') return 'pending'
  if (row?.status === 'rejected') return 'rejected'
  return 'none'
}

export function liveComplete(user) {
  if (!user?.id) return false
  const state = lsGet(`live_state_${user.id}`, null)
  return Boolean(state?.isLive || state?.startedAt)
}

export function applyStatusLabel(status) {
  if (status === 'approved') return 'Approved'
  if (status === 'pending') return 'Pending review'
  if (status === 'rejected') return 'Not approved'
  return 'Not applied'
}

export function getSetupStepState(user) {
  const apply = applyStatus(user)
  const verify = verifyStatus(user)
  const approved = apply === 'approved'

  const steps = CREATOR_SETUP_STEPS.map((step) => {
    let done = false
    let status = 'todo'

    if (step.id === 'profile') done = profileComplete(user)
    else if (step.id === 'first-post') done = hasFirstPost(user)
    else if (step.id === 'stream-key') done = streamSetupComplete(user)
    else if (step.id === 'payout') done = approved ? hasPayoutContact(user.id) : false
    else if (step.id === 'apply') {
      done = apply === 'approved'
      if (apply === 'pending') status = 'pending'
      else if (apply === 'rejected') status = 'rejected'
    } else if (step.id === 'verify') {
      done = verify === 'approved'
      if (verify === 'pending') status = 'pending'
      else if (verify === 'rejected') status = 'rejected'
    } else if (step.id === 'live') done = liveComplete(user)

    if (done) status = 'done'
    return { ...step, done, status }
  })

  const doneCount = steps.filter((s) => s.done).length
  const total = steps.length
  return {
    steps,
    doneCount,
    total,
    pct: total ? Math.round((doneCount / total) * 100) : 0,
    allDone: doneCount === total,
    applyStatus: apply,
  }
}

/** Pre-live checklist for the Live page host panel. */
export function getLivePreflight(user, { title = '', category = '' } = {}) {
  const streamKey = user?.id ? ensureStreamKey(user.id) : ''
  const hasTitle = Boolean(String(title || lsGet(`live_draft_${user?.id}`, null)?.title || '').trim())
  const cat = category || lsGet(`live_draft_${user?.id}`, null)?.category || ''
  const hasCategory = Boolean(String(cat).trim())
  const ingest = liveIngestConnected()

  return {
    items: [
      {
        id: 'stream-key',
        ok: Boolean(streamKey),
        label: 'Stream key',
        detail: streamKey ? 'Copy below or open Stream settings.' : 'Sign in to generate a key.',
      },
      {
        id: 'title',
        ok: hasTitle,
        label: 'Stream title',
        detail: hasTitle ? 'Title saved on this device.' : 'Add a title before listing.',
      },
      {
        id: 'category',
        ok: hasCategory,
        label: 'Category',
        detail: hasCategory ? cat : 'Pick a category.',
      },
      {
        id: 'ingest',
        ok: ingest,
        label: 'Video ingest',
        detail: ingest ? 'Connected — listing is enabled.' : 'Not connected — lobby only when wired.',
      },
    ],
    readyToList: ingest && Boolean(streamKey) && hasTitle && hasCategory,
  }
}
