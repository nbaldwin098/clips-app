/**
 * Shared SEO metadata for main app sections still hosted in SpaShell.
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
    title: 'Advertise',
    description: 'Advertise with calabi.',
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
}

export function sectionMetadata(key) {
  const row = SECTION_META[key] || { title: 'calabi', description: 'Watch on calabi.' }
  return {
    title: row.title,
    description: row.description,
    alternates: { canonical: `/${key}` },
    openGraph: {
      title: `${row.title} · calabi`,
      description: row.description,
      url: `https://calabi.us/${key}`,
    },
  }
}
