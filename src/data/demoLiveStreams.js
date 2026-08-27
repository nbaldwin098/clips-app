/** Demo livestreams — thumbnail + lobby only, never playable. */
export const DEMO_LIVE_STREAMS = [
  { userId: 'demo_live_01', handle: 'novaframe', displayName: 'Nova Frame', title: 'Late night edit session', category: 'Creative', watchers: 1284, thumbUrl: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=640&q=80', startedAt: new Date(Date.now() - 42 * 60000).toISOString() },
  { userId: 'demo_live_02', handle: 'pixelpulse', displayName: 'Pixel Pulse', title: 'Ranked grind — chill chat', category: 'Gaming', watchers: 892, thumbUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80', startedAt: new Date(Date.now() - 18 * 60000).toISOString() },
  { userId: 'demo_live_03', handle: 'loomstudio', displayName: 'Loom Studio', title: 'Product drop walkthrough', category: 'Commerce', watchers: 456, thumbUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=640&q=80', startedAt: new Date(Date.now() - 75 * 60000).toISOString() },
  { userId: 'demo_live_04', handle: 'coastalcam', displayName: 'Coastal Cam', title: 'Sunrise from the pier', category: 'IRL', watchers: 2103, thumbUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=640&q=80', startedAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { userId: 'demo_live_05', handle: 'beatlab', displayName: 'Beat Lab', title: 'Making a beat live', category: 'Music', watchers: 667, thumbUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=640&q=80', startedAt: new Date(Date.now() - 95 * 60000).toISOString() },
  { userId: 'demo_live_06', handle: 'kitchenline', displayName: 'Kitchen Line', title: 'Weeknight pasta demo', category: 'Food', watchers: 534, thumbUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=640&q=80', startedAt: new Date(Date.now() - 33 * 60000).toISOString() },
  { userId: 'demo_live_07', handle: 'trailcast', displayName: 'Trailcast', title: 'Forest hike Q&A', category: 'IRL', watchers: 311, thumbUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=640&q=80', startedAt: new Date(Date.now() - 55 * 60000).toISOString() },
  { userId: 'demo_live_08', handle: 'codeharbor', displayName: 'Code Harbor', title: 'Shipping a feature tonight', category: 'Tech', watchers: 978, thumbUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=640&q=80', startedAt: new Date(Date.now() - 27 * 60000).toISOString() },
  { userId: 'demo_live_09', handle: 'stageleft', displayName: 'Stage Left', title: 'Rehearsal open mic', category: 'Arts', watchers: 402, thumbUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=640&q=80', startedAt: new Date(Date.now() - 8 * 60000).toISOString() },
  { userId: 'demo_live_10', handle: 'fitloop', displayName: 'Fit Loop', title: 'HIIT with chat timers', category: 'Fitness', watchers: 1450, thumbUrl: 'https://images.unsplash.com/photo-1517836359913-9eeead5d2b8b?w=640&q=80', startedAt: new Date(Date.now() - 61 * 60000).toISOString() },
  { userId: 'demo_live_11', handle: 'sketcdesk', displayName: 'Sketch Desk', title: 'Character design stream', category: 'Creative', watchers: 723, thumbUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=640&q=80', startedAt: new Date(Date.now() - 47 * 60000).toISOString() },
  { userId: 'demo_live_12', handle: 'raceline', displayName: 'Race Line', title: 'Sim racing practice', category: 'Gaming', watchers: 1888, thumbUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=640&q=80', startedAt: new Date(Date.now() - 22 * 60000).toISOString() },
  { userId: 'demo_live_13', handle: 'bloomcast', displayName: 'Bloom Cast', title: 'Plant care Sunday', category: 'Lifestyle', watchers: 265, thumbUrl: 'https://images.unsplash.com/photo-1466692476866-aef1dfb1e735?w=640&q=80', startedAt: new Date(Date.now() - 110 * 60000).toISOString() },
  { userId: 'demo_live_14', handle: 'lensroom', displayName: 'Lens Room', title: 'Portrait lighting tips', category: 'Creative', watchers: 591, thumbUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=640&q=80', startedAt: new Date(Date.now() - 39 * 60000).toISOString() },
  { userId: 'demo_live_15', handle: 'tabletop', displayName: 'Tabletop', title: 'Board game night', category: 'Games', watchers: 834, thumbUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=640&q=80', startedAt: new Date(Date.now() - 14 * 60000).toISOString() },
  { userId: 'demo_live_16', handle: 'orbitnews', displayName: 'Orbit News', title: 'Creator economy roundup', category: 'News', watchers: 1201, thumbUrl: 'https://images.unsplash.com/photo-1504711434719-321ad79147a1?w=640&q=80', startedAt: new Date(Date.now() - 6 * 60000).toISOString() },
].map((row) => ({
  ...row,
  isLive: true,
  demo: true,
  previewOnly: true,
  ingestConnected: false,
  hlsUrl: '',
  mediaUrl: '',
  sharing: false,
}))

export function mergeDemoLiveBoard(board = []) {
  const real = Array.isArray(board) ? board.filter((b) => b && !b.demo) : []
  const ids = new Set(real.map((b) => b.userId))
  const demos = DEMO_LIVE_STREAMS.filter((d) => !ids.has(d.userId))
  return [...real, ...demos]
}
