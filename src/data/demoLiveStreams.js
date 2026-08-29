export const DEMO_LIVE_STREAMS = [
  { userId: 'demo-fps', handle: 'nova', displayName: 'nova', title: 'Ranked until I sleep', category: 'Gaming', thumbUrl: '/live/fps.jpg', avatarUrl: '/live/fps.jpg', isLive: true, ingestConnected: true, demo: true },
  { userId: 'demo-chat', handle: 'mira', displayName: 'mira', title: 'Late chat, no agenda', category: 'Just chatting', thumbUrl: '/live/chat.jpg', avatarUrl: '/live/chat.jpg', isLive: true, ingestConnected: true, demo: true },
  { userId: 'demo-irl', handle: 'kade', displayName: 'kade', title: 'Night walk, rain city', category: 'IRL', thumbUrl: '/live/irl.jpg', avatarUrl: '/live/irl.jpg', isLive: true, ingestConnected: true, demo: true },
  { userId: 'demo-music', handle: 'sol', displayName: 'sol', title: 'Synth night / live mix', category: 'Music', thumbUrl: '/live/music.jpg', avatarUrl: '/live/music.jpg', isLive: true, ingestConnected: true, demo: true },
  { userId: 'demo-art', handle: 'ren', displayName: 'ren', title: 'Inking a page', category: 'Creative', thumbUrl: '/live/art.jpg', avatarUrl: '/live/art.jpg', isLive: true, ingestConnected: true, demo: true },
  { userId: 'demo-sports', handle: 'vie', displayName: 'vie', title: 'Match on, couch open', category: 'Sports', thumbUrl: '/live/sports.jpg', avatarUrl: '/live/sports.jpg', isLive: true, ingestConnected: true, demo: true },
  { userId: 'demo-cook', handle: 'jun', displayName: 'jun', title: 'One-pan dinner', category: 'IRL', thumbUrl: '/live/cook.jpg', avatarUrl: '/live/cook.jpg', isLive: true, ingestConnected: true, demo: true },
  { userId: 'demo-retro', handle: 'pix', displayName: 'pix', title: 'CRT run, no saves', category: 'Gaming', thumbUrl: '/live/retro.jpg', avatarUrl: '/live/retro.jpg', isLive: true, ingestConnected: true, demo: true },
]

export function mergeDemoLiveBoard(board = []) {
  const real = Array.isArray(board) ? board.filter((b) => b && !b.demo) : []
  const ids = new Set(real.map((b) => b.userId))
  return [...real, ...DEMO_LIVE_STREAMS.filter((d) => !ids.has(d.userId))]
}
