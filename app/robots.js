export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/settings', '/dashboard', '/wallet', '/checkout'],
    },
    sitemap: 'https://calabi.us/sitemap.xml',
    host: 'https://calabi.us',
  }
}
