/**
 * Shared SEO metadata for App Router section shells (SpaShell hosts UI).
 * `noindex: true` for account/private/studio surfaces.
 */
export const SECTION_META = {
  clips: {
    title: 'Clips',
    description: 'Watch short vertical clips on calabi.',
  },
  pics: {
    title: 'Pics',
    description: 'Browse photos from creators on calabi.',
  },
  live: {
    title: 'Live',
    description: 'Live lobbies and creator streams on calabi.',
  },
  explore: {
    title: 'Explore',
    description: 'Search and explore creators and posts on calabi.',
  },
  creators: {
    title: 'Creators',
    description: 'Top creators on calabi.',
  },
  create: {
    title: 'Create',
    description: 'Upload a video, clip, or pic on calabi.',
  },
  advertise: {
    title: 'Monetization',
    description: 'calabi does not sell ads — tips, premium, and Coins only.',
  },
  support: {
    title: 'Support',
    description: 'Customer support for calabi.',
  },
  about: {
    title: 'About',
    description: 'Why calabi exists — audience for creators.',
  },
  help: {
    title: 'Help',
    description: 'Help center for calabi.',
  },
  watch: {
    title: 'Watch',
    description: 'Watch videos on calabi.',
  },
  community: {
    title: 'Community',
    description: 'Community posts on calabi.',
  },
  'content-rules': {
    title: 'Content rules',
    description: 'Content rules for calabi creators.',
  },
  'creator-apply': {
    title: 'Become a creator',
    description: 'Apply to create on calabi.',
  },
  playlists: {
    title: 'Playlists',
    description: 'Playlists on calabi.',
  },
  // Private / account — keep out of search indexes
  dashboard: {
    title: 'Creator Studio',
    description: 'Creator Studio on calabi.',
    noindex: true,
  },
  settings: {
    title: 'Settings',
    description: 'Account settings on calabi.',
    noindex: true,
  },
  library: {
    title: 'Library',
    description: 'Your library on calabi.',
    noindex: true,
  },
  wallet: {
    title: 'Wallet',
    description: 'Creator wallet on calabi.',
    noindex: true,
  },
  vods: {
    title: 'VODs',
    description: 'Your VODs on calabi.',
    noindex: true,
  },
  analytics: {
    title: 'Analytics',
    description: 'Creator analytics on calabi.',
    noindex: true,
  },
  channel: {
    title: 'Channel',
    description: 'Channel settings on calabi.',
    noindex: true,
  },
  subscriptions: {
    title: 'Subscriptions',
    description: 'Your subscriptions on calabi.',
    noindex: true,
  },
  'studio-tools': {
    title: 'Studio tools',
    description: 'Creator studio tools on calabi.',
    noindex: true,
  },
  'calabi-studio': {
    title: 'Calabi Studio',
    description: 'Free CapCut-style editor, filters, AI avatars, and social clip push on calabi.',
    noindex: true,
  },
  'calabi-cash': {
    title: 'Coins',
    description: 'Buy Coins to tip creators on lives, videos, clips, and pics.',
    noindex: true,
  },
  'stream-settings': {
    title: 'Stream settings',
    description: 'Stream settings on calabi.',
    noindex: true,
  },
  history: {
    title: 'History',
    description: 'Watch history on calabi.',
    noindex: true,
  },
  'watch-again': {
    title: 'Watch again',
    description: 'Watch again on calabi.',
    noindex: true,
  },
  hearts: {
    title: 'Hearts',
    description: 'Hearted pics on calabi.',
    noindex: true,
  },
  liked: {
    title: 'Liked',
    description: 'Liked posts on calabi.',
    noindex: true,
  },
  'watch-later': {
    title: 'Watch later',
    description: 'Watch later on calabi.',
    noindex: true,
  },
  stats: {
    title: 'Stats',
    description: 'Your stats on calabi.',
    noindex: true,
  },
  api: {
    title: 'Bubble API',
    description: 'APIs for businesses and platforms to use calabi audience bubbles.',
  },
  notifications: {
    title: 'Notifications',
    description: 'Notifications on calabi.',
    noindex: true,
  },
  messages: {
    title: 'Messages',
    description: 'Private messages on calabi.',
    noindex: true,
  },
  checkout: {
    title: 'Checkout',
    description: 'Premium checkout on calabi.',
    noindex: true,
  },
  verify: {
    title: 'Verify',
    description: 'Account verification on calabi.',
    noindex: true,
  },
  'advertiser-portal': {
    title: 'Advertiser portal',
    description: 'Ads are not offered — use tips, premium, and Coins.',
    noindex: true,
  },
  admin: {
    title: 'Admin',
    description: 'Admin portal on calabi.',
    noindex: true,
  },
}

export function sectionMetadata(key) {
  const row = SECTION_META[key] || { title: 'calabi', description: 'Watch on calabi.' }
  const meta = {
    title: row.title,
    description: row.description,
    alternates: { canonical: `/${key}` },
    openGraph: {
      title: `${row.title} · calabi`,
      description: row.description,
      url: `https://calabi.us/${key}`,
    },
  }
  if (row.noindex) {
    meta.robots = { index: false, follow: false }
  }
  return meta
}

/** Keys that still need a dedicated `app/<key>/page.jsx` shell (public + private). */
export const SHELL_ROUTE_KEYS = Object.keys(SECTION_META)
