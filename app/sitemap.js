import {
  fetchRecentContentIds,
  fetchRecentCreatorHandles,
} from '../src/lib/contentServer.js'

export default async function sitemap() {
  const base = 'https://calabi.us'
  const now = new Date()
  const staticRoutes = [
    '',
    'about',
    'help',
    'clips',
    'pics',
    'live',
    'creators',
    'explore',
    'advertise',
    'support',
    'legal-tos',
    'legal-privacy',
    'legal-creator',
    'legal-community',
  ]
  const staticEntries = staticRoutes.map((path) => ({
    url: path ? `${base}/${path}` : base,
    lastModified: now,
    changeFrequency: path === '' || path === 'clips' || path === 'pics' ? 'hourly' : 'weekly',
    priority: path === '' ? 1 : path === 'about' || path === 'help' ? 0.8 : 0.6,
  }))

  let contentEntries = []
  try {
    const ids = await fetchRecentContentIds(200)
    contentEntries = ids.map((id) => ({
      url: `${base}/${id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    }))
  } catch {
    contentEntries = []
  }

  let profileEntries = []
  try {
    const handles = await fetchRecentCreatorHandles(100)
    profileEntries = handles.map((handle) => ({
      url: `${base}/profile/${encodeURIComponent(handle)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    }))
  } catch {
    profileEntries = []
  }

  return [...staticEntries, ...contentEntries, ...profileEntries]
}
