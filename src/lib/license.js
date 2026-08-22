/**
 * License helpers for legal-seed and import validation.
 * Only PD / US Gov / CC0 / CC BY / CC BY-SA are accepted for seed library.
 */

export const ALLOWED_SEED_LICENSES = [
  'Public Domain',
  'CC0 1.0',
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'US Government Work (Public Domain)',
]

const LEGAL_HOSTS = [
  /nasa\.gov$/i,
  /images-assets\.nasa\.gov$/i,
  /usgs\.gov$/i,
  /noaa\.gov$/i,
  /archive\.org$/i,
  /wikimedia\.org$/i,
  /wikipedia\.org$/i,
  /upload\.wikimedia\.org$/i,
  /commons\.wikimedia\.org$/i,
  /esa\.int$/i,
  /loc\.gov$/i,
]

export function isAllowedSeedLicense(license) {
  if (!license) return false
  return ALLOWED_SEED_LICENSES.some(
    (l) => l.toLowerCase() === String(license).toLowerCase()
  )
}

export function detectLegalOriginFromUrl(url) {
  if (!url) return null
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (/nasa\.gov/i.test(host) || /images-assets\.nasa\.gov/i.test(host)) return 'nasa'
    if (/usgs\.gov/i.test(host)) return 'usgs'
    if (/noaa\.gov/i.test(host)) return 'noaa'
    if (/archive\.org/i.test(host)) return 'archive'
    if (/wikimedia|wikipedia/i.test(host)) return 'wikimedia'
    if (/esa\.int/i.test(host)) return 'esa'
    if (/loc\.gov/i.test(host)) return 'loc'
    return null
  } catch {
    return null
  }
}

export function isLegalLibraryUrl(url) {
  if (!url) return false
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, '')
    return LEGAL_HOSTS.some((re) => re.test(host))
  } catch {
    return false
  }
}

export function formatAttribution(item) {
  if (!item) return ''
  const parts = [item.attribution, item.license].filter(Boolean)
  return parts.join(' · ')
}

export function requiresShareAlike(license) {
  return /BY-SA/i.test(String(license || ''))
}
