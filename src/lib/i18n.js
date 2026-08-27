/**
 * i18n — English catalog + locale switcher.
 * Other locales fall back to English until translated.
 */
import { lsGet, lsSet } from './storage'

const LOCALE_KEY = 'calabi_locale'
export const SUPPORTED_LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'pt', label: 'Português' },
  { id: 'de', label: 'Deutsch' },
]

/** Core UI strings (en). Keys are stable ids. */
export const EN = {
  'nav.coins': 'Coins',
  'nav.orders': 'Orders',
  'nav.monetize': 'Monetize',
  'nav.help': 'Help',
  'nav.settings': 'Site settings',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.dismiss': 'Dismiss',
  'common.loading': 'Loading…',
  'common.signIn': 'Sign in',
  'wallet.title': 'Coins',
  'wallet.orders': 'Orders',
  'wallet.buy': 'Buy Coins',
  'wallet.noOrders': 'No coin orders yet.',
  'monetize.title': 'Monetize on calabi',
  'monetize.hero': 'Earn with tips, membership, and Coins',
  'connect.stripe': 'Connect Stripe',
  'connect.stripeSoon': 'Connect Stripe (coming soon)',
  'connect.stripeHint': 'Auto payouts when Connect is enabled. Today payouts stay manual.',
  'push.enable': 'Enable push notifications',
  'push.disable': 'Disable push',
  'push.unsupported': 'Push is not supported in this browser.',
  'push.needKey': 'Push needs a VAPID public key (see docs/INFRA.md).',
  'push.enabled': 'Push notifications on',
  'push.denied': 'Notification permission denied.',
  'i18n.language': 'Language',
  'i18n.hint': 'More languages use English until translations ship.',
  'transcode.optional': 'Optional compress before upload (experimental)',
  'live.ingestSelfHost': 'Self-host ingest with MediaMTX — see docs/mediamtx.md',
}

/** Sparse overrides — missing keys fall back to EN. */
export const LOCALES = {
  en: EN,
  es: {
    'nav.coins': 'Monedas',
    'nav.orders': 'Pedidos',
    'nav.monetize': 'Monetizar',
    'nav.help': 'Ayuda',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.signIn': 'Iniciar sesión',
    'wallet.title': 'Monedas',
    'wallet.buy': 'Comprar monedas',
    'i18n.language': 'Idioma',
  },
  fr: {
    'nav.coins': 'Pièces',
    'nav.orders': 'Commandes',
    'nav.monetize': 'Monétiser',
    'nav.help': 'Aide',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.signIn': 'Connexion',
    'wallet.title': 'Pièces',
    'wallet.buy': 'Acheter des pièces',
    'i18n.language': 'Langue',
  },
  pt: {
    'nav.coins': 'Moedas',
    'nav.orders': 'Pedidos',
    'nav.monetize': 'Monetizar',
    'common.save': 'Salvar',
    'common.signIn': 'Entrar',
    'i18n.language': 'Idioma',
  },
  de: {
    'nav.coins': 'Münzen',
    'nav.orders': 'Bestellungen',
    'nav.monetize': 'Monetarisierung',
    'common.save': 'Speichern',
    'common.signIn': 'Anmelden',
    'i18n.language': 'Sprache',
  },
}

let locale = 'en'
const listeners = new Set()

function normalize(next) {
  const v = String(next || 'en').trim().toLowerCase().slice(0, 8)
  return SUPPORTED_LOCALES.some((l) => l.id === v) ? v : 'en'
}

export function getLocale() {
  return locale
}

export function setLocale(next) {
  locale = normalize(next)
  try { lsSet(LOCALE_KEY, locale) } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    try { document.documentElement.lang = locale } catch { /* ignore */ }
  }
  listeners.forEach((fn) => {
    try { fn(locale) } catch { /* ignore */ }
  })
  return locale
}

export function initLocale() {
  let stored = 'en'
  try { stored = lsGet(LOCALE_KEY, 'en') || 'en' } catch { /* ignore */ }
  if (typeof navigator !== 'undefined' && (!stored || stored === 'en')) {
    const nav = String(navigator.language || 'en').slice(0, 2).toLowerCase()
    if (SUPPORTED_LOCALES.some((l) => l.id === nav) && !lsGet(LOCALE_KEY, null)) {
      stored = nav
    }
  }
  return setLocale(stored)
}

export function subscribeLocale(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function t(key, vars) {
  const id = String(key ?? '')
  const table = LOCALES[locale] || EN
  let out = table[id] ?? EN[id] ?? id
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v))
    }
  }
  return out
}

/** Catalog exists — translations still partial outside English. */
export function i18nReady() {
  return true
}

export function listLocales() {
  return [...SUPPORTED_LOCALES]
}
