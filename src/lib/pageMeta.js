/**
 * Per-route Open Graph / Twitter meta for share links.
 */
import { ORG } from './orgConfig'

const SITE = ORG.productName || 'calabi'

function upsertMeta(attr, key, content) {
  if (typeof document === 'undefined' || !content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function setPageMeta({
  title = SITE,
  description = `Watch on ${SITE}`,
  image = '',
  url = '',
  type = 'website',
} = {}) {
  if (typeof document === 'undefined') return
  const fullTitle = title.includes(SITE) ? title : `${title} · ${SITE}`
  document.title = fullTitle
  upsertMeta('name', 'description', description)
  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:site_name', SITE)
  upsertMeta('property', 'og:type', type)
  if (url) upsertMeta('property', 'og:url', url)
  if (image) {
    upsertMeta('property', 'og:image', image)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:image', image)
  } else {
    upsertMeta('name', 'twitter:card', 'summary')
  }
}

export function resetPageMeta() {
  setPageMeta()
}
