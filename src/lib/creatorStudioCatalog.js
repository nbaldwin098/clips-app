/**
 * Creator studio navigation and Kick/Twitch feature parity.
 * Status: live | partial | planned
 */

export const CREATOR_STUDIO_GROUPS = [
  {
    id: 'content',
    label: 'Content',
    description: 'Upload, drafts, and VOD library',
    items: [
      { id: 'upload', label: 'Upload', route: { view: 'dashboard', action: 'upload' }, status: 'live' },
      { id: 'import', label: 'Import link', route: { view: 'dashboard', action: 'import' }, status: 'live' },
      { id: 'studio-tools', label: 'Drafts & schedule', route: { view: 'studio-tools' }, status: 'partial' },
      { id: 'vods', label: 'VOD channel', route: { view: 'vods' }, status: 'partial' },
    ],
  },
  {
    id: 'live',
    label: 'Live',
    description: 'Stream key, ingest, and live ads',
    items: [
      { id: 'go-live', label: 'Go live lobby', route: { view: 'live' }, status: 'partial' },
      { id: 'stream-settings', label: 'Stream & ingest', route: { view: 'settings', section: 'stream' }, status: 'partial' },
      { id: 'stream-key', label: 'Stream key', route: { view: 'settings', section: 'stream' }, status: 'live' },
      { id: 'live-ads', label: 'Live ad breaks', route: { view: 'settings', section: 'stream' }, status: 'live' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    description: 'Chat, mods, roles, and channel branding',
    items: [
      { id: 'channel', label: 'Channel page', route: { view: 'channel' }, status: 'live' },
      { id: 'chat', label: 'Chat & moderation', route: { view: 'settings', section: 'chat' }, status: 'live' },
      { id: 'roles', label: 'Roles & permissions', route: { view: 'settings', section: 'roles' }, status: 'live' },
      { id: 'comments', label: 'Comments', route: { view: 'settings', section: 'comments' }, status: 'live' },
      { id: 'emotes', label: 'Custom emotes', route: { view: 'settings', section: 'chat' }, status: 'partial' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    description: 'Analytics and discovery',
    items: [
      { id: 'analytics', label: 'Analytics', route: { view: 'analytics' }, status: 'live' },
      { id: 'analytics-settings', label: 'Analytics settings', route: { view: 'settings', section: 'analytics' }, status: 'live' },
      { id: 'notifications', label: 'Alerts', route: { view: 'settings', section: 'notifications' }, status: 'partial' },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    description: 'Memberships, payouts, and monetization',
    items: [
      { id: 'revenue', label: 'Revenue dashboard', route: { view: 'settings', section: 'revenue' }, status: 'live' },
      { id: 'wallet', label: 'Wallet & payouts', route: { view: 'wallet' }, status: 'live' },
      { id: 'monetization', label: 'Membership price', route: { view: 'settings', section: 'monetization' }, status: 'live' },
      { id: 'stripe-connect', label: 'Stripe Connect', route: null, status: 'planned' },
    ],
  },
  {
    id: 'account',
    label: 'Account & safety',
    description: 'Profile, security, copyright, and legal',
    items: [
      { id: 'account', label: 'Account', route: { view: 'settings', section: 'account' }, status: 'live' },
      { id: 'security', label: 'Security & privacy', route: { view: 'settings', section: 'security' }, status: 'live' },
      { id: 'copyright', label: 'Copyright & DMCA', route: { view: 'settings', section: 'copyright' }, status: 'live' },
      { id: 'verify', label: 'Verified badge', route: { view: 'verify' }, status: 'live' },
    ],
  },
]

export const KICK_TWITCH_PARITY = [
  { feature: 'Stream key', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'RTMP ingest URL', kick: 'live', twitch: 'live', clips: 'planned', note: 'Key is ready; ingest server not connected yet.' },
  { feature: 'Go live / broadcast software', kick: 'live', twitch: 'live', clips: 'partial', note: 'Lobby works; OBS cannot connect until ingest is live.' },
  { feature: 'VOD / past broadcasts', kick: 'live', twitch: 'live', clips: 'partial', note: 'VOD channel settings and library on this device.' },
  { feature: 'Clips from VOD', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Channel panels & offline screen', kick: 'live', twitch: 'live', clips: 'partial', note: 'Profile, banner, and social links.' },
  { feature: 'Chat moderation & ban list', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Mod roles & permissions', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Custom emotes', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Premium memberships (livestream)', kick: 'live', twitch: 'live', clips: 'partial', note: 'Price and premium list; Stripe Payment Link amount is separate. Free follow is separate.' },
  { feature: 'Revenue dashboard', kick: 'live', twitch: 'live', clips: 'live', note: 'Manual payouts; no ad revenue share shown.' },
  { feature: 'Stripe / bank payouts', kick: 'live', twitch: 'live', clips: 'planned', note: 'PayPal/Venmo/Cash App contact only; owner sends by hand.' },
  { feature: 'Live analytics', kick: 'live', twitch: 'live', clips: 'partial', note: 'Post views, likes, subs; no concurrent viewer graph yet.' },
  { feature: 'Content analytics by post', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Stream schedule', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Notification delivery', kick: 'live', twitch: 'live', clips: 'partial', note: 'In-app alerts; no push or email yet.' },
  { feature: 'Session management', kick: 'live', twitch: 'live', clips: 'partial' },
  { feature: 'Two-factor authentication', kick: 'partial', twitch: 'live', clips: 'live' },
  { feature: 'DMCA / copyright tools', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'ID verification badge', kick: 'live', twitch: 'live', clips: 'live' },
  { feature: 'Ad revenue share to creators', kick: 'partial', twitch: 'live', clips: 'planned', note: 'Site ads run; no creator ad share in dashboard.' },
  { feature: 'Live mid-roll ads', kick: 'partial', twitch: 'live', clips: 'live', note: 'Automated and manual live ad breaks in settings.' },
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
  const { view, section, action } = item.route
  if (action === 'upload' && handlers.onOpenUpload) {
    handlers.onOpenUpload()
    return true
  }
  if (action === 'import' && handlers.onOpenImport) {
    handlers.onOpenImport()
    return true
  }
  if (section) {
    onNavigate?.(view, section)
    return true
  }
  onNavigate?.(view)
  return true
}
