export default function sitemap() {
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
  return staticRoutes.map((path) => ({
    url: path ? `${base}/${path}` : base,
    lastModified: now,
    changeFrequency: path === '' || path === 'clips' || path === 'pics' ? 'hourly' : 'weekly',
    priority: path === '' ? 1 : path === 'about' || path === 'help' ? 0.8 : 0.6,
  }))
}
