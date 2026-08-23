/**
 * Layout-reference clips so Clips looks like YouTube Shorts when the
 * real catalog is still empty. Marked `reference: true` — not creator uploads.
 * Videos are public Google/MDN samples (they actually play).
 */

const BUCKET = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample'

const SAMPLES = [
  { file: 'ForBiggerBlazes', title: 'When the last second hits different', handle: 'arena', sound: 'Stadium nights' },
  { file: 'ForBiggerEscapes', title: 'Ranking unexpected sports edits', handle: 'clipdesk', sound: 'Night drive' },
  { file: 'ForBiggerFun', title: 'He really said that with a straight face', handle: 'sideline', sound: 'Crowd pop' },
  { file: 'ForBiggerJoyrides', title: 'This chase sequence still slaps', handle: 'runway', sound: 'Engine cut' },
  { file: 'ForBiggerMeltdowns', title: 'Biggest ego in the building', handle: 'arena', sound: 'Bass drop' },
  { file: 'SubaruOutbackOnStreetAndDirt', title: 'Street to dirt in one clip', handle: 'runway', sound: 'Gravel' },
  { file: 'TearsOfSteel', title: 'When the robot looks back', handle: 'reelframe', sound: 'Score swell' },
  { file: 'Sintel', title: 'One stare. Whole movie.', handle: 'reelframe', sound: 'Quiet strings' },
  { file: 'BigBuckBunny', title: 'Bunny was not the villain here', handle: 'sideline', sound: 'Cartoon hit' },
  { file: 'ElephantsDream', title: 'Dream sequence energy', handle: 'clipdesk', sound: 'Low drone' },
  { file: 'VolkswagenGTIReview', title: 'That pull in third gear', handle: 'runway', sound: 'GTI launch' },
  { file: 'WeAreGoingOnBullrun', title: 'Convoy hits the canyon', handle: 'arena', sound: 'Open road' },
  { file: 'WhatCarCanYouGetForAGrand', title: 'Budget build vs the clock', handle: 'clipdesk', sound: 'Garage talk' },
  { file: 'VolkswagenGTIReview', title: 'Close-up: the downshift', handle: 'sideline', sound: 'Rev hang' },
]

const FLOWER = {
  id: 'ref-short-flower',
  title: 'Rare calm moment in the chaos',
  handle: 'reelframe',
  sound: 'Garden hush',
  mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  thumbUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
}

function daysAgo(days) {
  return new Date(Date.now() - days * 864e5).toISOString()
}

function asShort(row, index) {
  const id = row.id || `ref-short-${index + 1}`
  const mediaUrl = row.mediaUrl || `${BUCKET}/${row.file}.mp4`
  const thumbUrl = row.thumbUrl || `${BUCKET}/images/${row.file}.jpg`
  return {
    id,
    type: 'short',
    title: row.title,
    description: '',
    sourceUrl: mediaUrl,
    mediaUrl,
    thumbUrl,
    origin: 'reference',
    storedBytes: 0,
    durationSec: 0,
    tags: ['reference'],
    views: 0,
    creatorId: `ref-creator-${row.handle}`,
    userId: `ref-creator-${row.handle}`,
    handle: row.handle,
    engagement: { completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0 },
    createdAt: daysAgo(index < 3 ? 0.4 : 2 + index),
    hosted: false,
    soundId: row.sound,
    soundTitle: row.sound,
    stitchOf: null,
    chapters: [],
    captionsText: '',
    scheduledFor: null,
    status: 'published',
    publishedAt: daysAgo(index < 3 ? 0.4 : 2 + index),
    reference: true,
  }
}

const CATALOG = [...SAMPLES, FLOWER].map(asShort)

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
