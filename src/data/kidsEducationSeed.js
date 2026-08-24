/**
 * Real public educational media for kids (NASA public domain + Wikimedia).
 * Not placeholders. Seeded into the local catalog on boot if missing.
 */
import { getImports, saveImport } from '../lib/storage'
import { hiddenBrokenIds, isHttpUrl, isKnownDeadUrl } from '../lib/catalogHealth'

const CREATOR = {
  creatorId: 'edu-kids-class',
  userId: 'edu-kids-class',
  handle: 'kidsclass',
}

function item(partial) {
  const mediaUrl = partial.mediaUrl
  const thumbUrl = partial.thumbUrl || mediaUrl
  return {
    ...CREATOR,
    origin: 'public-education',
    hosted: true,
    views: 0,
    status: 'published',
    publishedAt: partial.createdAt,
    engagement: {
      completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0,
    },
    ...partial,
    mediaUrl,
    sourceUrl: partial.sourceUrl || mediaUrl,
    thumbUrl,
    mosaicThumb: partial.type === 'pic' ? thumbUrl : undefined,
  }
}

/** Stable ids so we can refresh titles/URLs without duplicating rows. */
export const KIDS_EDUCATION_ITEMS = [
  item({
    id: 'edu-vid-earth-iss',
    type: 'video',
    title: 'Earth from the space station',
    description:
      'Real views of our planet filmed from the International Space Station. Public domain, NASA. Look for clouds, oceans, and city lights!',
    tags: ['kids', 'earth', 'space', 'nasa', 'education'],
    width: 1280,
    height: 720,
    createdAt: '2026-08-20T12:00:00.000Z',
    mediaUrl:
      'https://images-assets.nasa.gov/video/Earth%20Views%20from%20the%20International%20Space%20Station/Earth%20Views%20from%20the%20International%20Space%20Station~mobile.mp4',
    thumbUrl:
      'https://images-assets.nasa.gov/video/Earth%20Views%20from%20the%20International%20Space%20Station/Earth%20Views%20from%20the%20International%20Space%20Station~thumb.jpg',
    credit: 'NASA',
  }),
  item({
    id: 'edu-vid-earth-night',
    type: 'video',
    title: 'Earth spinning at night',
    description:
      'Watch the dark side of Earth turn — city lights and the glow of the atmosphere. NASA visualization via Wikimedia Commons.',
    tags: ['kids', 'earth', 'night', 'nasa', 'education'],
    width: 1920,
    height: 1080,
    createdAt: '2026-08-20T12:01:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Animation_of_Rotating_Earth_at_Night.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Animation_of_Rotating_Earth_at_Night.webm/960px--Animation_of_Rotating_Earth_at_Night.webm.jpg',
    credit: 'NASA / Wikimedia Commons',
  }),
  item({
    id: 'edu-vid-math-multiply',
    type: 'video',
    title: 'Walk the line — multiplication',
    description:
      'A fun way to see times tables: hop along a number line. Wikimedia Commons educational video.',
    tags: ['kids', 'maths', 'multiplication', 'education'],
    width: 640,
    height: 480,
    createdAt: '2026-08-20T12:02:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Walk_the_Line_Multiplication.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Walk_the_Line_Multiplication.webm/500px--Walk_the_Line_Multiplication.webm.jpg',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-vid-math-angles',
    type: 'video',
    title: 'Cool angles in a circle',
    description:
      'Geometry for curious kids: see how inscribed angles work. Short visual lesson on Wikimedia Commons.',
    tags: ['kids', 'maths', 'geometry', 'angles', 'education'],
    width: 1920,
    height: 1080,
    createdAt: '2026-08-20T12:03:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Inscribed_angle.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Inscribed_angle.webm/960px--Inscribed_angle.webm.jpg',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-vid-nouns',
    type: 'video',
    title: 'Nouns you cannot count',
    description:
      'English class: uncountable nouns (like water or rice) vs things you can count. Wikimedia Commons lesson.',
    tags: ['kids', 'nouns', 'english', 'grammar', 'education'],
    width: 480,
    height: 360,
    createdAt: '2026-08-20T12:04:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Uncountable_nouns_Or%C3%A4knebara_substantiv.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Uncountable_nouns_Or%C3%A4knebara_substantiv.webm/330px--Uncountable_nouns_Or%C3%A4knebara_substantiv.webm.jpg',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-clip-earth-dam',
    type: 'short',
    title: 'Earth clip: a dam from space',
    description:
      'A real 9:16 NASA Earth short — Hartbeespoort Dam seen from orbit. Public domain, NASA SVS.',
    tags: ['kids', 'earth', 'nasa', 'clip', 'education'],
    width: 2160,
    height: 3840,
    createdAt: '2026-08-20T12:05:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/ae/Earth_Social_Media_Shorts%2C_2026_%28SVS14963_Hartbeespoort_Dam_-_Vertical%29.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Earth_Social_Media_Shorts%2C_2026_%28SVS14963_Hartbeespoort_Dam_-_Vertical%29.webm/500px--Earth_Social_Media_Shorts%2C_2026_%28SVS14963_Hartbeespoort_Dam_-_Vertical%29.webm.jpg',
    credit: 'NASA SVS',
  }),
  item({
    id: 'edu-clip-math-times',
    type: 'short',
    title: 'Times tables clip',
    description:
      'A square, colourful multiplication clip. Watch the numbers dance. Wikimedia Commons.',
    tags: ['kids', 'maths', 'multiplication', 'clip', 'education'],
    width: 1080,
    height: 1080,
    createdAt: '2026-08-20T12:06:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Multiplications_biderketak.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Multiplications_biderketak.webm/960px--Multiplications_biderketak.webm.jpg',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-pic-earth-marble',
    type: 'pic',
    title: 'The Blue Marble',
    description: 'The real Earth photo from Apollo 17. Public domain, NASA.',
    tags: ['kids', 'earth', 'nasa', 'photo', 'education'],
    createdAt: '2026-08-20T12:07:00.000Z',
    mediaUrl: 'https://images-assets.nasa.gov/image/as17-148-22727/as17-148-22727~medium.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/as17-148-22727/as17-148-22727~medium.jpg',
    credit: 'NASA',
  }),
  item({
    id: 'edu-pic-earth-saturn',
    type: 'pic',
    title: 'Earth, a pale blue dot',
    description: 'Our home seen from near Saturn. Public domain, NASA / JPL.',
    tags: ['kids', 'earth', 'nasa', 'photo', 'education'],
    createdAt: '2026-08-20T12:08:00.000Z',
    mediaUrl: 'https://images-assets.nasa.gov/image/PIA18033/PIA18033~medium.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA18033/PIA18033~medium.jpg',
    credit: 'NASA / JPL-Caltech',
  }),
  item({
    id: 'edu-pic-math-addition',
    type: 'pic',
    title: 'Addition is stacking numbers',
    description: 'A clear picture of addition — 1 + 1 and friends. Wikimedia Commons.',
    tags: ['kids', 'maths', 'addition', 'photo', 'education'],
    createdAt: '2026-08-20T12:09:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Addition.svg/960px-Addition.svg.png',
    thumbUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Addition.svg/960px-Addition.svg.png',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-pic-math-table',
    type: 'pic',
    title: 'Times table map',
    description: 'A visual multiplication table. Wikimedia Commons.',
    tags: ['kids', 'maths', 'multiplication', 'photo', 'education'],
    createdAt: '2026-08-20T12:10:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Multiplication_table_to_scale.svg/960px-Multiplication_table_to_scale.svg.png',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Multiplication_table_to_scale.svg/960px-Multiplication_table_to_scale.svg.png',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-pic-math-numbers',
    type: 'pic',
    title: 'Count on a skateboard',
    description: 'Numbers 1 to 10, drawn for kids. Wikimedia Commons.',
    tags: ['kids', 'maths', 'counting', 'photo', 'education'],
    createdAt: '2026-08-20T12:11:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Skateboard-numbers-chart-2-at-coloringpagesforkidsboys-dotcom.svg/960px-Skateboard-numbers-chart-2-at-coloringpagesforkidsboys-dotcom.svg.png',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Skateboard-numbers-chart-2-at-coloringpagesforkidsboys-dotcom.svg/960px-Skateboard-numbers-chart-2-at-coloringpagesforkidsboys-dotcom.svg.png',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-pic-nouns',
    type: 'pic',
    title: 'Nouns: people, places, things',
    description: 'A picture chart of nouns. Wikimedia Commons.',
    tags: ['kids', 'nouns', 'english', 'photo', 'education'],
    createdAt: '2026-08-20T12:12:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Nouns.png/960px-Nouns.png',
    thumbUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Nouns.png/960px-Nouns.png',
    credit: 'Wikimedia Commons',
  }),
  item({
    id: 'edu-pic-noun-phrase',
    type: 'pic',
    title: 'How a noun phrase is built',
    description: 'The pieces that sit around a noun. Wikimedia Commons.',
    tags: ['kids', 'nouns', 'english', 'grammar', 'photo', 'education'],
    createdAt: '2026-08-20T12:13:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/An_English_noun_phrase_showing_various_possible_dependents.png/960px-An_English_noun_phrase_showing_various_possible_dependents.png',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/An_English_noun_phrase_showing_various_possible_dependents.png/960px-An_English_noun_phrase_showing_various_possible_dependents.png',
    credit: 'Wikimedia Commons',
  }),
]

export function seedKidsEducation() {
  const hidden = hiddenBrokenIds()
  const current = getImports()
  const byId = Object.fromEntries(current.map((row) => [row.id, row]))
  let changed = 0
  for (const next of KIDS_EDUCATION_ITEMS) {
    if (hidden.has(next.id)) continue
    if (!isHttpUrl(next.mediaUrl) || isKnownDeadUrl(next.mediaUrl)) continue
    const prev = byId[next.id]
    const record = prev
      ? { ...next, createdAt: prev.createdAt || next.createdAt, views: prev.views || 0 }
      : next
    const same =
      prev &&
      prev.mediaUrl === record.mediaUrl &&
      prev.title === record.title &&
      prev.type === record.type
    if (same) continue
    saveImport(record)
    changed += 1
  }
  return changed
}
