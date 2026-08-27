/**
 * i18n — English catalog + full es/fr/pt/de overrides (free, in-repo).
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
  'nav.studio': 'Creator dashboard',
  'nav.messages': 'Messages',
  'nav.account': 'Account',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.dismiss': 'Dismiss',
  'common.loading': 'Loading…',
  'common.signIn': 'Sign in',
  'common.signOut': 'Sign out',
  'common.back': 'Back',
  'common.refresh': 'Refresh',
  'wallet.title': 'Coins',
  'wallet.orders': 'Orders',
  'wallet.buy': 'Buy Coins',
  'wallet.noOrders': 'No coin orders yet.',
  'monetize.title': 'Monetize on calabi',
  'monetize.hero': 'Earn with tips, membership, and Coins',
  'earnings.title': 'Earnings',
  'earnings.available': 'Available',
  'earnings.pending': 'Pending',
  'earnings.withdraw': 'Request withdrawal',
  'earnings.feeHint': 'Buyers pay a platform fee. You keep 80% of the list price.',
  'fee.label': 'Platform fee',
  'fee.explainer': 'Platform and fraud protection',
  'connect.stripe': 'Connect Stripe',
  'connect.stripeSoon': 'Stripe Express is off — use Earnings withdrawals',
  'connect.stripeHint': 'Save a payout method in Studio → Earnings. Ops pays from Admin → Payouts.',
  'push.enable': 'Enable push notifications',
  'push.disable': 'Disable push',
  'push.unsupported': 'Push is not supported in this browser.',
  'push.needKey': 'Push needs a VAPID public key on this deploy.',
  'push.enabled': 'Push notifications on',
  'push.denied': 'Notification permission denied.',
  'i18n.language': 'Language',
  'i18n.hint': 'UI language for core labels. Help/legal may stay English.',
  'transcode.optional': 'Optional compress before upload (experimental)',
  'live.ingestSelfHost': 'Self-host ingest with MediaMTX — see docs/mediamtx.md',
  'live.windowShare': 'Share this screen (free — no RTMP server)',
  'live.rtmpReady': 'OBS RTMP ready',
  'live.rtmpOff': 'OBS RTMP not connected yet',
  'social.connect': 'Connect',
  'social.publish': 'Publish',
  'social.needsOAuth': 'Add free developer app keys to publish to this network.',
  'social.handleOnly': 'Save a handle for your profile — publish needs OAuth keys.',
  'studio.overview': 'Overview',
  'studio.content': 'Content',
  'studio.analytics': 'Analytics',
  'studio.earnings': 'Earnings',
  'studio.settings': 'Settings',
  'checkout.title': 'calabi Checkout',
  'checkout.pay': 'Pay',
}

const ES = {
  'nav.coins': 'Monedas',
  'nav.orders': 'Pedidos',
  'nav.monetize': 'Monetizar',
  'nav.help': 'Ayuda',
  'nav.settings': 'Ajustes del sitio',
  'nav.studio': 'Panel de creador',
  'nav.messages': 'Mensajes',
  'nav.account': 'Cuenta',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.dismiss': 'Cerrar',
  'common.loading': 'Cargando…',
  'common.signIn': 'Iniciar sesión',
  'common.signOut': 'Cerrar sesión',
  'common.back': 'Atrás',
  'common.refresh': 'Actualizar',
  'wallet.title': 'Monedas',
  'wallet.orders': 'Pedidos',
  'wallet.buy': 'Comprar monedas',
  'wallet.noOrders': 'Aún no hay pedidos de monedas.',
  'monetize.title': 'Monetiza en calabi',
  'monetize.hero': 'Gana con propinas, membresía y monedas',
  'earnings.title': 'Ganancias',
  'earnings.available': 'Disponible',
  'earnings.pending': 'Pendiente',
  'earnings.withdraw': 'Solicitar retiro',
  'earnings.feeHint': 'Los compradores pagan una tarifa de plataforma. Tú te quedas el 80% del precio.',
  'fee.label': 'Tarifa de plataforma',
  'fee.explainer': 'Plataforma y protección contra fraude',
  'connect.stripe': 'Conectar Stripe',
  'connect.stripeSoon': 'Stripe Express está apagado — usa retiros en Ganancias',
  'connect.stripeHint': 'Guarda un método de pago en Estudio → Ganancias.',
  'push.enable': 'Activar notificaciones push',
  'push.disable': 'Desactivar push',
  'push.unsupported': 'Push no es compatible con este navegador.',
  'push.needKey': 'Push necesita una clave VAPID pública en este deploy.',
  'push.enabled': 'Notificaciones push activadas',
  'push.denied': 'Permiso de notificaciones denegado.',
  'i18n.language': 'Idioma',
  'i18n.hint': 'Idioma de la interfaz. Ayuda/legal pueden seguir en inglés.',
  'transcode.optional': 'Comprimir antes de subir (experimental)',
  'live.ingestSelfHost': 'Autohospeda ingest con MediaMTX — docs/mediamtx.md',
  'live.windowShare': 'Compartir esta pantalla (gratis — sin servidor RTMP)',
  'live.rtmpReady': 'OBS RTMP listo',
  'live.rtmpOff': 'OBS RTMP aún no conectado',
  'social.connect': 'Conectar',
  'social.publish': 'Publicar',
  'social.needsOAuth': 'Añade claves de app de desarrollador para publicar.',
  'social.handleOnly': 'Guarda un usuario para tu perfil — publicar necesita OAuth.',
  'studio.overview': 'Resumen',
  'studio.content': 'Contenido',
  'studio.analytics': 'Analíticas',
  'studio.earnings': 'Ganancias',
  'studio.settings': 'Ajustes',
  'checkout.title': 'Checkout calabi',
  'checkout.pay': 'Pagar',
}

const FR = {
  'nav.coins': 'Pièces',
  'nav.orders': 'Commandes',
  'nav.monetize': 'Monétiser',
  'nav.help': 'Aide',
  'nav.settings': 'Réglages du site',
  'nav.studio': 'Espace créateur',
  'nav.messages': 'Messages',
  'nav.account': 'Compte',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.dismiss': 'Fermer',
  'common.loading': 'Chargement…',
  'common.signIn': 'Connexion',
  'common.signOut': 'Déconnexion',
  'common.back': 'Retour',
  'common.refresh': 'Actualiser',
  'wallet.title': 'Pièces',
  'wallet.orders': 'Commandes',
  'wallet.buy': 'Acheter des pièces',
  'wallet.noOrders': 'Aucune commande de pièces pour l’instant.',
  'monetize.title': 'Monétiser sur calabi',
  'monetize.hero': 'Gagnez avec pourboires, abonnement et pièces',
  'earnings.title': 'Revenus',
  'earnings.available': 'Disponible',
  'earnings.pending': 'En attente',
  'earnings.withdraw': 'Demander un retrait',
  'earnings.feeHint': 'Les acheteurs paient des frais de plateforme. Vous gardez 80 % du prix.',
  'fee.label': 'Frais de plateforme',
  'fee.explainer': 'Plateforme et protection anti-fraude',
  'connect.stripe': 'Connecter Stripe',
  'connect.stripeSoon': 'Stripe Express est désactivé — utilisez les retraits Revenus',
  'connect.stripeHint': 'Enregistrez un moyen de paiement dans Studio → Revenus.',
  'push.enable': 'Activer les notifications push',
  'push.disable': 'Désactiver le push',
  'push.unsupported': 'Le push n’est pas pris en charge sur ce navigateur.',
  'push.needKey': 'Le push nécessite une clé VAPID publique sur ce déploiement.',
  'push.enabled': 'Notifications push activées',
  'push.denied': 'Permission de notification refusée.',
  'i18n.language': 'Langue',
  'i18n.hint': 'Langue de l’interface. Aide/légal peuvent rester en anglais.',
  'transcode.optional': 'Compression optionnelle avant envoi (expérimental)',
  'live.ingestSelfHost': 'Auto-hébergez l’ingest avec MediaMTX — docs/mediamtx.md',
  'live.windowShare': 'Partager cet écran (gratuit — sans serveur RTMP)',
  'live.rtmpReady': 'OBS RTMP prêt',
  'live.rtmpOff': 'OBS RTMP pas encore connecté',
  'social.connect': 'Connecter',
  'social.publish': 'Publier',
  'social.needsOAuth': 'Ajoutez des clés d’app développeur pour publier.',
  'social.handleOnly': 'Enregistrez un pseudo profil — publier nécessite OAuth.',
  'studio.overview': 'Aperçu',
  'studio.content': 'Contenu',
  'studio.analytics': 'Analytique',
  'studio.earnings': 'Revenus',
  'studio.settings': 'Réglages',
  'checkout.title': 'Checkout calabi',
  'checkout.pay': 'Payer',
}

const PT = {
  'nav.coins': 'Moedas',
  'nav.orders': 'Pedidos',
  'nav.monetize': 'Monetizar',
  'nav.help': 'Ajuda',
  'nav.settings': 'Configurações do site',
  'nav.studio': 'Painel do criador',
  'nav.messages': 'Mensagens',
  'nav.account': 'Conta',
  'common.save': 'Salvar',
  'common.cancel': 'Cancelar',
  'common.dismiss': 'Dispensar',
  'common.loading': 'Carregando…',
  'common.signIn': 'Entrar',
  'common.signOut': 'Sair',
  'common.back': 'Voltar',
  'common.refresh': 'Atualizar',
  'wallet.title': 'Moedas',
  'wallet.orders': 'Pedidos',
  'wallet.buy': 'Comprar moedas',
  'wallet.noOrders': 'Ainda não há pedidos de moedas.',
  'monetize.title': 'Monetize no calabi',
  'monetize.hero': 'Ganhe com gorjetas, assinatura e moedas',
  'earnings.title': 'Ganhos',
  'earnings.available': 'Disponível',
  'earnings.pending': 'Pendente',
  'earnings.withdraw': 'Solicitar saque',
  'earnings.feeHint': 'Compradores pagam taxa da plataforma. Você fica com 80% do preço.',
  'fee.label': 'Taxa da plataforma',
  'fee.explainer': 'Plataforma e proteção contra fraude',
  'connect.stripe': 'Conectar Stripe',
  'connect.stripeSoon': 'Stripe Express desligado — use saques em Ganhos',
  'connect.stripeHint': 'Salve um método de pagamento em Studio → Ganhos.',
  'push.enable': 'Ativar notificações push',
  'push.disable': 'Desativar push',
  'push.unsupported': 'Push não é suportado neste navegador.',
  'push.needKey': 'Push precisa de uma chave VAPID pública neste deploy.',
  'push.enabled': 'Notificações push ativas',
  'push.denied': 'Permissão de notificação negada.',
  'i18n.language': 'Idioma',
  'i18n.hint': 'Idioma da interface. Ajuda/legal podem ficar em inglês.',
  'transcode.optional': 'Comprimir antes do envio (experimental)',
  'live.ingestSelfHost': 'Auto-hospede ingest com MediaMTX — docs/mediamtx.md',
  'live.windowShare': 'Compartilhar esta tela (grátis — sem servidor RTMP)',
  'live.rtmpReady': 'OBS RTMP pronto',
  'live.rtmpOff': 'OBS RTMP ainda não conectado',
  'social.connect': 'Conectar',
  'social.publish': 'Publicar',
  'social.needsOAuth': 'Adicione chaves de app de desenvolvedor para publicar.',
  'social.handleOnly': 'Salve um handle no perfil — publicar precisa de OAuth.',
  'studio.overview': 'Visão geral',
  'studio.content': 'Conteúdo',
  'studio.analytics': 'Analíticos',
  'studio.earnings': 'Ganhos',
  'studio.settings': 'Configurações',
  'checkout.title': 'Checkout calabi',
  'checkout.pay': 'Pagar',
}

const DE = {
  'nav.coins': 'Münzen',
  'nav.orders': 'Bestellungen',
  'nav.monetize': 'Monetarisierung',
  'nav.help': 'Hilfe',
  'nav.settings': 'Website-Einstellungen',
  'nav.studio': 'Creator-Dashboard',
  'nav.messages': 'Nachrichten',
  'nav.account': 'Konto',
  'common.save': 'Speichern',
  'common.cancel': 'Abbrechen',
  'common.dismiss': 'Schließen',
  'common.loading': 'Laden…',
  'common.signIn': 'Anmelden',
  'common.signOut': 'Abmelden',
  'common.back': 'Zurück',
  'common.refresh': 'Aktualisieren',
  'wallet.title': 'Münzen',
  'wallet.orders': 'Bestellungen',
  'wallet.buy': 'Münzen kaufen',
  'wallet.noOrders': 'Noch keine Münzbestellungen.',
  'monetize.title': 'Auf calabi monetarisieren',
  'monetize.hero': 'Verdienen mit Tipps, Mitgliedschaft und Münzen',
  'earnings.title': 'Einnahmen',
  'earnings.available': 'Verfügbar',
  'earnings.pending': 'Ausstehend',
  'earnings.withdraw': 'Auszahlung anfordern',
  'earnings.feeHint': 'Käufer zahlen eine Plattformgebühr. Du behältst 80 % des Preises.',
  'fee.label': 'Plattformgebühr',
  'fee.explainer': 'Plattform- und Betrugsschutz',
  'connect.stripe': 'Stripe verbinden',
  'connect.stripeSoon': 'Stripe Express ist aus — nutze Auszahlungen unter Einnahmen',
  'connect.stripeHint': 'Speichere eine Auszahlungsmethode unter Studio → Einnahmen.',
  'push.enable': 'Push-Benachrichtigungen aktivieren',
  'push.disable': 'Push deaktivieren',
  'push.unsupported': 'Push wird in diesem Browser nicht unterstützt.',
  'push.needKey': 'Push braucht einen öffentlichen VAPID-Schlüssel auf diesem Deploy.',
  'push.enabled': 'Push-Benachrichtigungen an',
  'push.denied': 'Benachrichtigungsberechtigung verweigert.',
  'i18n.language': 'Sprache',
  'i18n.hint': 'UI-Sprache. Hilfe/Rechtliches kann Englisch bleiben.',
  'transcode.optional': 'Optional vor dem Upload komprimieren (experimentell)',
  'live.ingestSelfHost': 'Ingest selbst hosten mit MediaMTX — docs/mediamtx.md',
  'live.windowShare': 'Diesen Bildschirm teilen (kostenlos — ohne RTMP-Server)',
  'live.rtmpReady': 'OBS RTMP bereit',
  'live.rtmpOff': 'OBS RTMP noch nicht verbunden',
  'social.connect': 'Verbinden',
  'social.publish': 'Veröffentlichen',
  'social.needsOAuth': 'Füge kostenlose Entwickler-App-Keys hinzu zum Veröffentlichen.',
  'social.handleOnly': 'Handle fürs Profil speichern — Publish braucht OAuth.',
  'studio.overview': 'Übersicht',
  'studio.content': 'Inhalt',
  'studio.analytics': 'Analysen',
  'studio.earnings': 'Einnahmen',
  'studio.settings': 'Einstellungen',
  'checkout.title': 'calabi Checkout',
  'checkout.pay': 'Bezahlen',
}

export const LOCALES = {
  en: EN,
  es: ES,
  fr: FR,
  pt: PT,
  de: DE,
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
      out = String(out).split(`{${k}}`).join(String(v))
    }
  }
  return out
}

/** All supported locales have full catalog coverage for EN keys. */
export function i18nReady() {
  return SUPPORTED_LOCALES.every((l) => {
    const table = LOCALES[l.id] || {}
    return Object.keys(EN).every((k) => typeof table[k] === 'string' && table[k].length > 0)
  })
}

export function listLocales() {
  return [...SUPPORTED_LOCALES]
}

export function catalogCoverage(localeId = locale) {
  const table = LOCALES[localeId] || {}
  const keys = Object.keys(EN)
  const hit = keys.filter((k) => table[k]).length
  return { locale: localeId, translated: hit, total: keys.length, pct: keys.length ? Math.round((hit / keys.length) * 100) : 0 }
}
