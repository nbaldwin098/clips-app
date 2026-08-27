/**
 * Minimal i18n stub — identity translator until locales ship.
 * Usage: import { t } from '../lib/i18n'; t('Open Coins')
 * Full i18n needs locale files + a provider; see docs/INFRA.md.
 */
let locale = 'en'

export function getLocale() {
  return locale
}

export function setLocale(next) {
  const v = String(next || 'en').trim().toLowerCase()
  locale = v || 'en'
  return locale
}

/** Pass-through until translation catalogs exist. */
export function t(key, vars) {
  let out = String(key ?? '')
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v))
    }
  }
  return out
}

export function i18nReady() {
  return false
}
