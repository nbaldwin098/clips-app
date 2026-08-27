/**
 * Creator studio navigation and Kick/Twitch feature parity.
 * Status: live | partial | planned
 */

export const CREATOR_STUDIO_GROUPS = [
  {
    id: 'content',
    label: 'Content',
    description: 'Upload and library',
    items: [
      { id: 'calabi-studio', label: 'Calabi Studio', route: { view: 'dashboard', section: 'lab' }, status: 'live' },
      { id: 'content', label: 'Content library', route: { view: 'dashboard', section: 'content' }, status: 'live' },
      { id: 'socials', label: 'Socials', route: { view: 'dashboard', section: 'socials' }, status: 'partial' },
    ],
  },
  {
    id: 'live',
    label: 'Live',
    description: 'Stream tools',
    items: [
      { id: 'stream-settings', label: 'Stream & OBS', route: { view: 'dashboard', section: 'settings', params: { tab: 'stream' } }, status: 'live' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    description: 'Earnings and membership',
    items: [
      { id: 'earnings', label: 'Earnings', route: { view: 'dashboard', section: 'earnings' }, status: 'live' },
      { id: 'monetization', label: 'Membership', route: { view: 'dashboard', section: 'settings', params: { tab: 'monetization' } }, status: 'live' },
    ],
  },
  {
    id: 'account',
    label: 'Settings',
    description: 'Creator settings in Studio',
    items: [
      { id: 'settings', label: 'Creator settings', route: { view: 'dashboard', section: 'settings' }, status: 'live' },
      { id: 'verify', label: 'Verified badge', route: { view: 'dashboard', section: 'verify' }, status: 'live' },
    ],
  },
]

export const KICK_TWITCH_PARITY = [
  { feature: 'Stream key', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'RTMP ingest URL', kick: 'live', twitch: 'live', clips: 'partial', note: 'Optional VITE_LIVE_RTMP_URL; free OBS window share works without it.' },
  { feature: 'Go live / broadcast software', kick: 'live', twitch: 'live', clips: 'live', note: 'OBS Studio is free — share window or Custom RTMP when ingest URL is set.' },
  { feature: 'VOD / past broadcasts', kick: 'live', twitch: 'live', clips: 'partial', note: 'VOD channel settings and library on this device.' },
  { feature: 'Clips from VOD', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Channel panels & offline screen', kick: 'live', twitch: 'live', clips: 'partial', note: 'Profile, banner, and social links.' },
  { feature: 'Chat moderation & ban list', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Mod roles & permissions', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Custom emotes', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Premium memberships (livestream)', kick: 'live', twitch: 'live', clips: 'partial', note: 'Price and premium list; Stripe Payment Link amount is separate. Free follow is separate.' },
  { feature: 'Earnings', kick: 'live', twitch: 'live', clips: 'live', note: 'Creator Studio → Earnings (not a separate Revenue page).' },
  { feature: 'Stripe / bank payouts', kick: 'live', twitch: 'live', clips: 'partial', note: 'calabi Earnings withdraw + Admin payout queue (no Stripe Express).' },
  { feature: 'Live analytics', kick: 'live', twitch: 'live', clips: 'partial', note: 'Post views, likes, subs; no concurrent viewer graph yet.' },
  { feature: 'Content analytics by post', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Stream schedule', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Notification delivery', kick: 'live', twitch: 'live', clips: 'partial', note: 'In-app alerts; no push or email yet.' },
  { feature: 'Session management', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Two-factor authentication', kick: 'partial', twitch: 'live', clips: 'live' },
  { feature: 'DMCA / copyright tools', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'ID verification badge', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Ad revenue share to creators', kick: 'partial', twitch: 'live', clips: 'planned', note: 'No site ads; tips / premium / Coins only.' },
  { feature: 'Live mid-roll ads', kick: 'partial', twitch: 'live', clips: 'planned', note: 'Not offered — FEATURE_ADS is false.' },
]

export function statusLabel(status) {
  if (status === 'live') return 'Live'
  if (status === 'partial') return 'Partial'
  return 'Planned'
}

export function countParityByStatus(rows = KICK_TWITCH_PARITY, platform = 'clips') {
  const counts = { live: 0, partial: 0, planned: 0 }
  for (const row of rows) {
    const s = row[platform] || 'planned'
    counts[s] = (counts[s] || 0) + 1
  }
  return counts
}

export function navigateStudioItem(onNavigate, item, handlers = {}) {
  if (!item?.route) return false
  const { view, section, action, params } = item.route
  if (action === 'upload' && handlers.onOpenUpload) {
    handlers.onOpenUpload()
    return true
  }
  if (action === 'import' && handlers.onOpenImport) {
    handlers.onOpenImport()
    return true
  }
  if (section) {
    onNavigate?.(view, section, params || null)
    return true
  }
  onNavigate?.(view)
  return true
}
