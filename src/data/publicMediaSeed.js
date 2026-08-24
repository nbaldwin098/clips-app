/**
 * Official channels with real public-domain / CC media.
 * BBC and National Geographic catalogues are copyrighted — not used.
 * NASA / NOAA / ESA / USFWS works used here are US government PD or Commons CC.
 */
import { getImports, saveImport, lsGet, lsSet } from '../lib/storage'
import { hiddenBrokenIds, isHttpUrl, isKnownDeadUrl } from '../lib/catalogHealth'
import { indexUser } from '../lib/moderation'

export const CATALOG_GENERATION = 'official-pd-v1'
const GEN_KEY = 'clips_catalog_generation'

export const OFFICIAL_CREATORS = [
  {
    id: 'org-nasa',
    handle: 'nasa',
    displayName: 'NASA',
    bio: 'Public domain films and photos from NASA. US government work.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl: 'https://images-assets.nasa.gov/image/as17-148-22727/as17-148-22727~medium.jpg',
    bannerUrl: 'https://images-assets.nasa.gov/image/PIA18033/PIA18033~medium.jpg',
  },
  {
    id: 'org-noaa',
    handle: 'noaa',
    displayName: 'NOAA',
    bio: 'Satellites and storms from NOAA / CIRA. US government work.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hurricane_John_Seen_by_NOAA-21_%28CIRA_2024-09-23_-_nolabels%29.webm/960px--Hurricane_John_Seen_by_NOAA-21_%28CIRA_2024-09-23_-_nolabels%29.webm.jpg',
    bannerUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm/960px--Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm.jpg',
  },
  {
    id: 'org-esa',
    handle: 'esa',
    displayName: 'ESA',
    bio: 'European Space Agency clips released on Wikimedia Commons.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png/960px-Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png',
    bannerUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png/960px-Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png',
  },
  {
    id: 'org-usfws',
    handle: 'usfws',
    displayName: 'U.S. Fish and Wildlife Service',
    bio: 'Wildlife from national refuges. US government work.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm/960px--Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm.jpg',
    bannerUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm/960px--Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm.jpg',
  },
]

function byCreator(handle) {
  const c = OFFICIAL_CREATORS.find((x) => x.handle === handle)
  return {
    creatorId: c.id,
    userId: c.id,
    handle: c.handle,
    displayName: c.displayName,
    avatarUrl: c.avatarUrl,
  }
}

function item(handle, partial) {
  const mediaUrl = partial.mediaUrl
  const thumbUrl = partial.thumbUrl || mediaUrl
  return {
    ...byCreator(handle),
    origin: 'public-domain-org',
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

export const OFFICIAL_MEDIA = [
  item('nasa', {
    id: 'org-nasa-iss-earth',
    type: 'video',
    title: 'Earth views from the space station',
    description: 'NASA public domain. Filmed from the International Space Station.',
    tags: ['nasa', 'earth', 'iss', 'space'],
    width: 1280,
    height: 720,
    createdAt: '2026-08-24T10:00:00.000Z',
    mediaUrl:
      'https://images-assets.nasa.gov/video/Earth%20Views%20from%20the%20International%20Space%20Station/Earth%20Views%20from%20the%20International%20Space%20Station~mobile.mp4',
    thumbUrl:
      'https://images-assets.nasa.gov/video/Earth%20Views%20from%20the%20International%20Space%20Station/Earth%20Views%20from%20the%20International%20Space%20Station~thumb.jpg',
  }),
  item('nasa', {
    id: 'org-nasa-hubble-29',
    type: 'video',
    title: 'Hubble’s 29th anniversary',
    description: 'NASA Goddard public domain film about the Hubble Space Telescope.',
    tags: ['nasa', 'hubble', 'space'],
    width: 1280,
    height: 720,
    createdAt: '2026-08-24T10:01:00.000Z',
    mediaUrl: 'https://images-assets.nasa.gov/video/GSFC_20190424_HST_m13189_Hubble29/GSFC_20190424_HST_m13189_Hubble29~mobile.mp4',
    thumbUrl: 'https://images-assets.nasa.gov/video/GSFC_20190424_HST_m13189_Hubble29/GSFC_20190424_HST_m13189_Hubble29~thumb.jpg',
  }),
  item('nasa', {
    id: 'org-nasa-perseverance-drive',
    type: 'video',
    title: 'How Perseverance drives on Mars',
    description: 'NASA / JPL public domain. The rover rolling on Mars.',
    tags: ['nasa', 'mars', 'perseverance'],
    width: 1280,
    height: 720,
    createdAt: '2026-08-24T10:02:00.000Z',
    mediaUrl:
      'https://images-assets.nasa.gov/video/JPL-20220405-M2020f-0001-How%20Perseverance%20Drives%20on%20Mars-1080cc/JPL-20220405-M2020f-0001-How%20Perseverance%20Drives%20on%20Mars-1080cc~mobile.mp4',
    thumbUrl:
      'https://images-assets.nasa.gov/video/JPL-20220405-M2020f-0001-How%20Perseverance%20Drives%20on%20Mars-1080cc/JPL-20220405-M2020f-0001-How%20Perseverance%20Drives%20on%20Mars-1080cc~thumb.jpg',
  }),
  item('nasa', {
    id: 'org-nasa-zero-g',
    type: 'video',
    title: 'How we do research in zero gravity',
    description: 'NASA public domain. A short explainer from the space station.',
    tags: ['nasa', 'iss', 'science'],
    width: 1280,
    height: 720,
    createdAt: '2026-08-24T10:03:00.000Z',
    mediaUrl:
      'https://images-assets.nasa.gov/video/How%20Do%20We%20Do%20Research%20in%20Zero%20Gravity/How%20Do%20We%20Do%20Research%20in%20Zero%20Gravity~mobile.mp4',
    thumbUrl:
      'https://images-assets.nasa.gov/video/How%20Do%20We%20Do%20Research%20in%20Zero%20Gravity/How%20Do%20We%20Do%20Research%20in%20Zero%20Gravity~thumb.jpg',
  }),
  item('nasa', {
    id: 'org-nasa-earth-clip',
    type: 'short',
    title: 'Earth from orbit — Hartbeespoort Dam',
    description: 'NASA SVS public domain vertical short.',
    tags: ['nasa', 'earth', 'clip'],
    width: 2160,
    height: 3840,
    createdAt: '2026-08-24T10:04:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/ae/Earth_Social_Media_Shorts%2C_2026_%28SVS14963_Hartbeespoort_Dam_-_Vertical%29.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Earth_Social_Media_Shorts%2C_2026_%28SVS14963_Hartbeespoort_Dam_-_Vertical%29.webm/500px--Earth_Social_Media_Shorts%2C_2026_%28SVS14963_Hartbeespoort_Dam_-_Vertical%29.webm.jpg',
  }),
  item('nasa', {
    id: 'org-nasa-blue-marble',
    type: 'pic',
    title: 'The Blue Marble',
    description: 'Apollo 17 photograph of Earth. NASA public domain.',
    tags: ['nasa', 'earth', 'photo'],
    createdAt: '2026-08-24T10:05:00.000Z',
    mediaUrl: 'https://images-assets.nasa.gov/image/as17-148-22727/as17-148-22727~medium.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/as17-148-22727/as17-148-22727~medium.jpg',
  }),
  item('nasa', {
    id: 'org-nasa-pale-blue',
    type: 'pic',
    title: 'Earth from Saturn',
    description: 'Cassini look-back at Earth. NASA / JPL public domain.',
    tags: ['nasa', 'earth', 'photo'],
    createdAt: '2026-08-24T10:06:00.000Z',
    mediaUrl: 'https://images-assets.nasa.gov/image/PIA18033/PIA18033~medium.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA18033/PIA18033~medium.jpg',
  }),
  item('noaa', {
    id: 'org-noaa-hurricane-john',
    type: 'video',
    title: 'Hurricane John from NOAA-21',
    description: 'NOAA / CIRA satellite loop. US government work.',
    tags: ['noaa', 'weather', 'hurricane'],
    width: 1920,
    height: 1080,
    createdAt: '2026-08-24T10:07:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Hurricane_John_Seen_by_NOAA-21_%28CIRA_2024-09-23_-_nolabels%29.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hurricane_John_Seen_by_NOAA-21_%28CIRA_2024-09-23_-_nolabels%29.webm/960px--Hurricane_John_Seen_by_NOAA-21_%28CIRA_2024-09-23_-_nolabels%29.webm.jpg',
  }),
  item('noaa', {
    id: 'org-noaa-iota',
    type: 'video',
    title: 'Hurricane Iota, two satellites',
    description: 'NOAA / CIRA dual-satellite view. US government work.',
    tags: ['noaa', 'weather', 'hurricane'],
    width: 1000,
    height: 568,
    createdAt: '2026-08-24T10:08:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm/960px--Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm.jpg',
  }),
  item('noaa', {
    id: 'org-noaa-iota-pic',
    type: 'pic',
    title: 'Hurricane Iota still',
    description: 'Frame from NOAA / CIRA satellite imagery. US government work.',
    tags: ['noaa', 'weather', 'photo'],
    createdAt: '2026-08-24T10:09:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm/960px--Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm.jpg',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm/960px--Dual_satellite_view_of_Hurricane_Iota_%28CIRA_2020-11-17%29.webm.jpg',
  }),
  item('esa', {
    id: 'org-esa-rosetta-clip',
    type: 'short',
    title: 'Rosetta swings by Earth',
    description: 'ESA Rosetta third Earth swing-by. Wikimedia Commons.',
    tags: ['esa', 'rosetta', 'earth', 'clip'],
    width: 1080,
    height: 1080,
    createdAt: '2026-08-24T10:10:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Video_-_ESA_Rosetta_Approaching_Earth_during_its_3rd_Swing-by_%2851690809693%29.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Video_-_ESA_Rosetta_Approaching_Earth_during_its_3rd_Swing-by_%2851690809693%29.webm/960px--Video_-_ESA_Rosetta_Approaching_Earth_during_its_3rd_Swing-by_%2851690809693%29.webm.jpg',
  }),
  item('esa', {
    id: 'org-esa-earth-pic',
    type: 'pic',
    title: 'Earth from Rosetta',
    description: 'Earth photographed by ESA’s Rosetta spacecraft, 2009.',
    tags: ['esa', 'earth', 'photo'],
    createdAt: '2026-08-24T10:11:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png/960px-Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png/960px-Earth_as_seen_from_ESA_Rosetta_2009_%2851688879651%29.png',
  }),
  item('usfws', {
    id: 'org-usfws-moose',
    type: 'video',
    title: 'Moose at Seedskadee',
    description: 'A moose at Seedskadee National Wildlife Refuge. U.S. Fish and Wildlife Service.',
    tags: ['usfws', 'wildlife', 'moose'],
    width: 1920,
    height: 1080,
    createdAt: '2026-08-24T10:12:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm/960px--Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm.jpg',
  }),
  item('usfws', {
    id: 'org-usfws-moose-pic',
    type: 'pic',
    title: 'Moose in the refuge',
    description: 'Still from Seedskadee National Wildlife Refuge. U.S. Fish and Wildlife Service.',
    tags: ['usfws', 'wildlife', 'photo'],
    createdAt: '2026-08-24T10:13:00.000Z',
    mediaUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm/960px--Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm.jpg',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm/960px--Moose_at_Seedskadee_National_Wildlife_Refuge_%2849025793918%29.webm.jpg',
  }),
]

function seedCreators() {
  for (const c of OFFICIAL_CREATORS) {
    indexUser({
      id: c.id,
      handle: c.handle,
      displayName: c.displayName,
      bio: c.bio,
      avatarUrl: c.avatarUrl,
      bannerUrl: c.bannerUrl,
      creatorStatus: 'approved',
      isCreator: true,
      email: '',
    })
  }
}

export function seedOfficialCatalog() {
  const gen = lsGet(GEN_KEY, '')
  if (gen !== CATALOG_GENERATION) {
    lsSet('imports', [])
    lsSet(GEN_KEY, CATALOG_GENERATION)
  }
  seedCreators()
  const hidden = hiddenBrokenIds()
  const current = getImports()
  const byId = Object.fromEntries(current.map((row) => [row.id, row]))
  for (const next of OFFICIAL_MEDIA) {
    if (hidden.has(next.id)) continue
    if (!isHttpUrl(next.mediaUrl) || isKnownDeadUrl(next.mediaUrl)) continue
    const prev = byId[next.id]
    const record = prev
      ? { ...next, createdAt: prev.createdAt || next.createdAt, views: prev.views || 0 }
      : next
    const same =
      prev
      && prev.mediaUrl === record.mediaUrl
      && prev.title === record.title
      && prev.creatorId === record.creatorId
    if (same) continue
    saveImport(record)
  }
}
