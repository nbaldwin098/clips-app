/**
 * Official channels with real public-domain / CC media.
 * BBC and National Geographic catalogues are copyrighted — not used.
 * NASA / NOAA / ESA / USFWS works used here are US government PD or Commons CC.
 */
import { getImports, mergeImports, lsGet, lsSet } from '../lib/storage'
import { hiddenBrokenIds, isHttpUrl, isKnownDeadUrl } from '../lib/catalogHealth'
import { indexUser } from '../lib/moderation'

export const CATALOG_GENERATION = 'official-pd-v6'
const GEN_KEY = 'clips_catalog_generation'

export const OFFICIAL_CREATORS = [
  {
    id: 'org-nasa',
    handle: 'nasa',
    displayName: 'NASA',
    bio: 'Public domain films and photos from NASA. US government work.',
    creatorStatus: 'approved',
    isCreator: true,
    email: 'nasa@calabi.local',
    passwordHash: 'sha256$a1b2c3d4e5f60718293a4b5c6d7e8f90$06c37682a05b7b08cd9661494ee7dd45014cc07ee74af2e7c46ddd382f7f1d53',
    avatarUrl: 'https://yt3.googleusercontent.com/eIf5fNPcIcj9ig-wZBeq4stFy1lgjWTW1nLT5dYlFkHZprZ03QBiMcbpwNMB6XSBjrSFGtAGQg=s900-c-k-c0x00ffffff-no-rj',
    bannerUrl: 'https://yt3.googleusercontent.com/wene-k08O5GIa5h7syMVe6IKiiRiKh6vpajQSUYma01_wG5aMOCqvvAdd2NuljADPuUNPpMkrw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  },
  {
    id: 'org-noaa',
    handle: 'noaa',
    displayName: 'NOAA',
    email: 'noaa@calabi.local',
    passwordHash: 'sha256$b2c3d4e5f60718293a4b5c6d7e8f90a1$6450e2b834496a332afc82fe58f75720fae6e544948ef310518de360bd17c159',
    bio: 'Satellites and storms from NOAA / CIRA. US government work.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl:
      'https://yt3.googleusercontent.com/ZzC_NmDSYP4IJPG1a75R8SKFYJzmdAE2lNj0Ij7dabKbCN4yOjJxb3cNuAORr2Hv2GsCPYCgcI4=s900-c-k-c0x00ffffff-no-rj',
    bannerUrl:
      'https://yt3.googleusercontent.com/FgfgE3TbfS1LJYonfbQ4r_W9LzvDtHoarLvGYOUqbWXOIn_FJvphyIylAQz5R14RifQWYDRc=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  },
  {
    id: 'org-esa',
    handle: 'esa',
    displayName: 'ESA',
    email: 'esa@calabi.local',
    passwordHash: 'sha256$c3d4e5f60718293a4b5c6d7e8f90a1b2$ea40b1a158ac970eac8087374dbe6fed7518abdf92e7d194b929692d90158973',
    bio: 'European Space Agency clips released on Wikimedia Commons.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl:
      'https://yt3.googleusercontent.com/pvp0P35jE_uZ8mf4b0ihGj0xJVId7-457KtfsNJnO9mE14OqNJMqbTcBYbLaAGwjBSjI055x=s900-c-k-c0x00ffffff-no-rj',
    bannerUrl:
      'https://yt3.googleusercontent.com/8SBD0WB27GA2CAgD9wBzV2vwOvu3d3HI7HDJgoTj4GY0nUv_xAIwG1jnqDcj-KqfGy28NOrF2Uo=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  },
  {
    id: 'org-usfws',
    handle: 'usfws',
    displayName: 'U.S. Fish and Wildlife Service',
    email: 'usfws@calabi.local',
    passwordHash: 'sha256$d4e5f60718293a4b5c6d7e8f90a1b2c3$b94f7449fe13b7c1d32b205c7f6510f9eb92dbf5147295929c711fe198942e4f',
    bio: 'Wildlife from national refuges. US government work.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl:
      'https://yt3.googleusercontent.com/ytc/AIdro_nnb_-jDuGW2QQhuTXC7QomGdd0zs25rJihLmaZGpUtRw=s900-c-k-c0x00ffffff-no-rj',
    bannerUrl:
      'https://yt3.googleusercontent.com/rDwoJtoEboZ_BU8UwBmSfnH9Nadfs4F_A2L0wufOmkLYiYyeS695gaIwYXHpqGpqwroxJm4q=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  },
  {
    id: 'org-nasaconnect',
    handle: 'nasaconnect',
    displayName: 'NASA Connect',
    email: 'connect@calabi.local',
    passwordHash: 'sha256$e5f60718293a4b5c6d7e8f90a1b2c3d4$22fe3f60d8b18bc0e7ac7d2bce66ea5af7f711559c616660e38067062b78f4cc',
    bio: 'Classroom science, maths, and history films NASA made for kids. Public domain.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl: 'https://yt3.googleusercontent.com/bpfrBmM6vZk_p4mFIkMny87Hn0GsuB-Fx9TdY7tBsOjW10-6jn6OEGHTTv3wy0OnGRMT1A-o7ww=s900-c-k-c0x00ffffff-no-rj',
    bannerUrl: 'https://yt3.googleusercontent.com/tJcaHTXaSsGmUCAqrNqpCHFXUpxk4m6nySU4H5TjEzN1GBLrcoAv1VXsTTNehYqpa-Im01K6RA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  },
  {
    id: 'org-classroom',
    handle: 'classroom',
    displayName: 'Classroom Films',
    email: 'classroom@calabi.local',
    passwordHash: 'sha256$f60718293a4b5c6d7e8f90a1b2c3d4e5$3212d64431103417445dae0ea8ac4c11e933fc11646617dc804e587bb95bdd86',
    bio: 'Public-domain school films for reading, maths, English, and manners.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl: 'https://yt3.googleusercontent.com/o6HhJR65S6QLzBdfLVzuohmCuhq4ajQ0Y0MFlCgfzhp0fq8HYBOGM4bQI-aOtkS8NZ5rurhK=s900-c-k-c0x00ffffff-no-rj',
    bannerUrl: 'https://yt3.googleusercontent.com/uKU80Zp3sHG-1DBBsbiN78U6vG8xFDAuoBLVWXynRXXJJuSVluOMeAL-2RgoKBBckHI5ssfRDQ=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  },
  {
    id: 'org-nara',
    handle: 'nara',
    displayName: 'National Archives',
    email: 'nara@calabi.local',
    passwordHash: 'sha256$0718293a4b5c6d7e8f90a1b2c3d4e5f6$4d91b8d63dc71c5b466a9f86fdf4a2598665884bbbdacb2abeeff3863a827e5d',
    bio: 'US government history films and documentaries. Public domain.',
    creatorStatus: 'approved',
    isCreator: true,
    avatarUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_lbyMtBC27JVL62Bd9YIeWaT4JbXoTxe6qe46UpgaFivCM=s900-c-k-c0x00ffffff-no-rj',
    bannerUrl: 'https://yt3.googleusercontent.com/wIU4xXck4dlL_Ev5fiOxgFEMxk0hVrqBPg1p9J3850JnZ2bwB5SyP1zSQ6udh4w2KCOxJqyNKtY=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  },
]

export function findOfficialLogin(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return null
  return OFFICIAL_CREATORS.find((c) => String(c.email || '').toLowerCase() === e) || null
}

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
  const createdAt = new Date().toISOString()
  return {
    ...byCreator(handle),
    origin: 'public-domain-org',
    hosted: true,
    views: 0,
    status: 'published',
    publishedAt: createdAt,
    engagement: {
      completionRate: 0, loops: 0, shares: 0, comments: 0, saves: 0, earlySkips: 0, likes: 0,
    },
    ...partial,
    createdAt,
    publishedAt: createdAt,
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
  item('nasaconnect', {
    id: 'org-nc-math-graph',
    type: 'video',
    title: 'Measurement and graphing (kids maths)',
    description: 'NASA Connect classroom film: measuring and graphing. Public domain.',
    tags: ['kids', 'maths', 'science', 'nasa'],
    durationSec: 228,
    createdAt: '2026-08-24T11:00:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-Watmtg-MeasurementAndGraphingActivity/NASAWATMTG-MeasurementAndGraphingActivity_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-Watmtg-MeasurementAndGraphingActivity',
  }),
  item('nasaconnect', {
    id: 'org-nc-parallax',
    type: 'video',
    title: 'Parallax — how we measure space',
    description: 'NASA Connect maths/science for class. Public domain.',
    tags: ['kids', 'maths', 'science', 'nasa'],
    durationSec: 396,
    createdAt: '2026-08-24T11:01:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-Vt-Parallax/NASAVT-Parallax_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-Vt-Parallax',
  }),
  item('nasaconnect', {
    id: 'org-nc-weather',
    type: 'video',
    title: 'Climate and weather',
    description: 'NASA Connect science film for kids. Public domain.',
    tags: ['kids', 'science', 'weather', 'nasa'],
    durationSec: 276,
    createdAt: '2026-08-24T11:02:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-Ate-ClimateAndWeather/NASAATE-ClimateAndWeather_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-Ate-ClimateAndWeather',
  }),
  item('nasaconnect', {
    id: 'org-nc-jamestown',
    type: 'video',
    title: 'Jamestown',
    description: 'NASA Connect history short for class. Public domain.',
    tags: ['kids', 'history', 'nasa'],
    durationSec: 188,
    createdAt: '2026-08-24T11:03:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-Ht-Jamestown/NASAHT-Jamestown_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-Ht-Jamestown',
  }),
  item('nasaconnect', {
    id: 'org-nc-iss',
    type: 'video',
    title: 'Space station basics',
    description: 'NASA Connect: how the ISS works. Public domain.',
    tags: ['kids', 'science', 'space', 'nasa'],
    durationSec: 248,
    createdAt: '2026-08-24T11:04:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-Iss-IssBasics/NASAISS-ISSBasics_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-Iss-IssBasics',
  }),
  item('nasaconnect', {
    id: 'org-nc-sun-earth',
    type: 'video',
    title: 'The Sun and Earth',
    description: 'NASA Connect science film. Public domain.',
    tags: ['kids', 'science', 'nasa'],
    durationSec: 386,
    createdAt: '2026-08-24T11:05:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-Ditns-Sun-earthConnection/NASADITNS-SunEarthConnection_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-Ditns-Sun-earthConnection',
  }),
  item('nasaconnect', {
    id: 'org-nc-rockets',
    type: 'video',
    title: 'Building rockets',
    description: 'NASA Connect engineering for kids. Public domain.',
    tags: ['kids', 'science', 'nasa'],
    durationSec: 274,
    createdAt: '2026-08-24T11:06:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-Fof-BuildingRockets/NASAFOF-BuildingRockets_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-Fof-BuildingRockets',
  }),
  item('nasaconnect', {
    id: 'org-nc-health-doc',
    type: 'video',
    title: 'Better health from space to Earth',
    description: 'Longer NASA Connect programme (~28 min). Public domain documentary-style classroom film.',
    tags: ['kids', 'science', 'documentary', 'nasa'],
    durationSec: 1710,
    createdAt: '2026-08-24T11:07:00.000Z',
    mediaUrl: 'https://archive.org/download/NasaConnect-BetterHealthFromSpaceToEarth/NASAConnect-BetterHealthFromSpaceToEarth_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/NasaConnect-BetterHealthFromSpaceToEarth',
  }),
  item('classroom', {
    id: 'org-class-math-multiply',
    type: 'video',
    title: 'Walk the line — multiplication',
    description: 'Kids maths: times tables on a number line. Wikimedia Commons.',
    tags: ['kids', 'maths', 'english'],
    durationSec: 60,
    width: 640,
    height: 480,
    createdAt: '2026-08-24T11:08:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Walk_the_Line_Multiplication.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Walk_the_Line_Multiplication.webm/500px--Walk_the_Line_Multiplication.webm.jpg',
  }),
  item('classroom', {
    id: 'org-class-math-angles',
    type: 'video',
    title: 'Angles in a circle',
    description: 'Kids maths / geometry visual. Wikimedia Commons.',
    tags: ['kids', 'maths', 'geometry'],
    width: 1920,
    height: 1080,
    createdAt: '2026-08-24T11:09:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Inscribed_angle.webm',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Inscribed_angle.webm/960px--Inscribed_angle.webm.jpg',
  }),
  item('classroom', {
    id: 'org-class-reading-hoppy',
    type: 'video',
    title: 'Hoppy the Bunny — reading',
    description: 'Classroom reading film (~10 min). Public domain school film.',
    tags: ['kids', 'english', 'reading'],
    durationSec: 621,
    createdAt: '2026-08-24T11:11:00.000Z',
    mediaUrl: 'https://archive.org/download/0261_Hoppy_the_Bunny_Background_for_Reading_and_Expression_E00420_00_26_23_14/0261_Hoppy_the_Bunny_Background_for_Reading_and_Expression_E00420_00_26_23_14_3mb.mp4',
    thumbUrl: 'https://archive.org/services/img/0261_Hoppy_the_Bunny_Background_for_Reading_and_Expression_E00420_00_26_23_14',
  }),
  item('classroom', {
    id: 'org-class-courtesy',
    type: 'video',
    title: 'Everyday courtesy',
    description: 'Kids manners and English in daily life (~9 min). Public domain school film, 1948.',
    tags: ['kids', 'english'],
    durationSec: 536,
    createdAt: '2026-08-24T11:12:00.000Z',
    mediaUrl: 'https://archive.org/download/Everyday1948/Everyday1948_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/Everyday1948',
  }),
  item('classroom', {
    id: 'org-class-nouns-pic',
    type: 'pic',
    title: 'Nouns: people, places, things',
    description: 'Kids English picture chart. Wikimedia Commons.',
    tags: ['kids', 'english', 'nouns', 'photo'],
    createdAt: '2026-08-24T11:13:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Nouns.png/960px-Nouns.png',
    thumbUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Nouns.png/960px-Nouns.png',
  }),
  item('classroom', {
    id: 'org-class-math-pic',
    type: 'pic',
    title: 'Addition picture',
    description: 'Kids maths: addition. Wikimedia Commons.',
    tags: ['kids', 'maths', 'photo'],
    createdAt: '2026-08-24T11:14:00.000Z',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Addition.svg/960px-Addition.svg.png',
    thumbUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Addition.svg/960px-Addition.svg.png',
  }),
  item('nara', {
    id: 'org-nara-apollo11-doc',
    type: 'video',
    title: 'The Eagle Has Landed — Apollo 11',
    description: 'Full NASA / National Archives documentary (~28 min) on the Moon landing. Public domain.',
    tags: ['history', 'science', 'documentary', 'nasa', 'space'],
    durationSec: 1706,
    createdAt: '2026-08-24T11:15:00.000Z',
    mediaUrl: 'https://archive.org/download/gov.archives.arc.45017/gov.archives.arc.45017_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/gov.archives.arc.45017',
  }),
  item('nara', {
    id: 'org-nara-prelude-doc',
    type: 'video',
    title: 'Why We Fight: Prelude to War',
    description: 'US wartime history documentary (~52 min), 1942–43. Public domain. Not a kids cartoon — older history.',
    tags: ['history', 'documentary'],
    durationSec: 3140,
    createdAt: '2026-08-24T11:16:00.000Z',
    mediaUrl: 'https://archive.org/download/wwf_prelude_to_war/prelude_to_war_512kb.mp4',
    thumbUrl: 'https://archive.org/services/img/wwf_prelude_to_war',
  }),
]

function seedCreators() {
  for (const c of OFFICIAL_CREATORS) {
    indexUser({
      id: c.id,
      handle: c.handle,
      displayName: c.displayName,
      email: c.email || '',
      bio: c.bio,
      avatarUrl: c.avatarUrl,
      bannerUrl: c.bannerUrl,
      creatorStatus: 'approved',
      isCreator: true,
    })
  }
}

export function seedOfficialCatalog() {
  const gen = lsGet(GEN_KEY, '')
  if (gen !== CATALOG_GENERATION) {
    lsSet(GEN_KEY, CATALOG_GENERATION)
  }
  seedCreators()
  const hidden = hiddenBrokenIds()
  const current = getImports()
  const byId = Object.fromEntries(current.map((row) => [row.id, row]))
  const batch = []
  for (const next of OFFICIAL_MEDIA) {
    if (hidden.has(next.id)) continue
    if (!isHttpUrl(next.mediaUrl) || isKnownDeadUrl(next.mediaUrl)) continue
    const stamped = {
      ...next,
      createdAt: next.createdAt || '2026-08-24T12:00:00.000Z',
      publishedAt: next.publishedAt || next.createdAt || '2026-08-24T12:00:00.000Z',
    }
    const prev = byId[next.id]
    const record = prev
      ? { ...stamped, views: prev.views || 0 }
      : stamped
    const same =
      prev
      && prev.mediaUrl === record.mediaUrl
      && prev.title === record.title
      && prev.creatorId === record.creatorId
      && prev.createdAt === record.createdAt
    if (same) continue
    batch.push(record)
  }
  // One protected merge — never call saveImport in a loop (that used to
  // slice(0, 200) on every library row and push user uploads off the list).
  if (batch.length) mergeImports(batch)
}

export async function pushLibraryCatalogToCloud() {
  try {
    const { getSupabase, isSupabaseConfigured } = await import('../lib/supabaseClient')
    if (!isSupabaseConfigured()) return false
    const sb = await getSupabase()
    if (!sb) return false
    for (const item of OFFICIAL_MEDIA) {
      if (!isHttpUrl(item.mediaUrl) || isKnownDeadUrl(item.mediaUrl)) continue
      await sb.rpc('upsert_library_video', {
        payload: {
          id: item.id,
          handle: item.handle,
          type: item.type,
          title: item.title,
          description: item.description || '',
          source_url: item.sourceUrl || item.mediaUrl,
          media_url: item.mediaUrl,
          thumb_url: item.thumbUrl,
          origin: item.origin || 'public-domain-org',
          duration_sec: item.durationSec || 0,
          tags: item.tags || [],
          created_at: item.createdAt,
        },
      })
    }
    return true
  } catch {
    return false
  }
}
