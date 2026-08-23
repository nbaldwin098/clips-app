/**
 * Layout-reference clips so Clips looks like YouTube Shorts when the
 * real catalog is still empty. Marked `reference: true` — not creator uploads.
 * Posters are public picsum photos; videos are public MDN / Wikimedia samples.
 */

const FLOWER = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
const BUNNY = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.360p.vp9.webm'
const SINTEL = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f1/Sintel_movie_4K.webm/Sintel_movie_4K.webm.360p.vp9.webm'
const PLAYS = [FLOWER, BUNNY, SINTEL]

function poster(id) {
  return `https://picsum.photos/id/${id}/400/720.jpg`
}

const ROWS = [
  { title: 'When the last second hits different', handle: 'arena', sound: 'Stadium nights', pic: 1015 },
  { title: 'Ranking unexpected sports edits', handle: 'clipdesk', sound: 'Night drive', pic: 1025 },
  { title: 'He really said that with a straight face', handle: 'sideline', sound: 'Crowd pop', pic: 237 },
  { title: 'This chase sequence still slaps', handle: 'runway', sound: 'Engine cut', pic: 201 },
  { title: 'Biggest ego in the building', handle: 'arena', sound: 'Bass drop', pic: 1069 },
  { title: 'Street to dirt in one clip', handle: 'runway', sound: 'Gravel', pic: 1016 },
  { title: 'When the robot looks back', handle: 'reelframe', sound: 'Score swell', pic: 1084 },
  { title: 'One stare. Whole movie.', handle: 'reelframe', sound: 'Quiet strings', pic: 1039 },
  { title: 'Bunny was not the villain here', handle: 'sideline', sound: 'Cartoon hit', pic: 1074 },
  { title: 'Dream sequence energy', handle: 'clipdesk', sound: 'Low drone', pic: 1043 },
  { title: 'That pull in third gear', handle: 'runway', sound: 'GTI launch', pic: 203 },
  { title: 'Convoy hits the canyon', handle: 'arena', sound: 'Open road', pic: 1050 },
  { title: 'Budget build vs the clock', handle: 'clipdesk', sound: 'Garage talk', pic: 338 },
  { title: 'Close-up: the downshift', handle: 'sideline', sound: 'Rev hang', pic: 239 },
  { title: 'Rare calm moment in the chaos', handle: 'reelframe', sound: 'Garden hush', pic: 1080 },
]

function daysAgo(days) {
  return new Date(Date.now() - days * 864e5).toISOString()
}

function asShort(row, index) {
  const mediaUrl = PLAYS[index % PLAYS.length]
  const when = daysAgo(index < 3 ? 0.4 : 2 + index)
  return {
    id: `ref-short-${index + 1}`,
    type: 'short',
    title: row.title,
    description: '',
    sourceUrl: mediaUrl,
    mediaUrl,
    thumbUrl: poster(row.pic),
    origin: 'reference',
    storedBytes: 0,
    durationSec: 0,
    tags: ['reference'],
    views: 0,
    creatorId: `ref-creator-${row.handle}`,
    userId: `ref-creator-${row.handle}`,
    handle: row.handle,
    engagement: { completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0 },
    createdAt: when,
    hosted: false,
    soundId: row.sound,
    soundTitle: row.sound,
    stitchOf: null,
    chapters: [],
    captionsText: '',
    scheduledFor: null,
    status: 'published',
    publishedAt: when,
    reference: true,
  }
}

const CATALOG = ROWS.map(asShort)

export function getReferenceShorts() {
  return CATALOG.map((item) => ({ ...item }))
}

export function getReferenceShort(id) {
  if (!id) return null
  return CATALOG.find((item) => item.id === id) || null
}

export function withReferenceShorts(items) {
  const real = (items || []).filter(Boolean)
  const seen = new Set(real.map((i) => i.id))
  return [...real, ...CATALOG.filter((s) => !seen.has(s.id)).map((item) => ({ ...item }))]
}

export function isRecentShort(item, hours = 72) {
  const t = new Date(item?.publishedAt || item?.createdAt || 0).getTime()
  if (!t) return false
  return Date.now() - t < hours * 3600 * 1000
}
