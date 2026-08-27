/**
 * i18n — English catalog + overrides for top 10 languages (native labels).
 * Missing keys always fall back to English so the whole chrome can switch.
 */
import { lsGet, lsSet } from './storage'

const LOCALE_KEY = 'calabi_locale'

/** Native-script labels so viewers can find their language. */
export const SUPPORTED_LOCALES = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'es', label: 'Español', dir: 'ltr' },
  { id: 'zh', label: '中文', dir: 'ltr' },
  { id: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
  { id: 'pt', label: 'Português', dir: 'ltr' },
  { id: 'ja', label: '日本語', dir: 'ltr' },
  { id: 'fr', label: 'Français', dir: 'ltr' },
  { id: 'de', label: 'Deutsch', dir: 'ltr' },
  { id: 'ko', label: '한국어', dir: 'ltr' },
]

/** Core UI strings (en). Keys are stable ids. */
export const EN = {
  'nav.home': 'Home',
  'nav.clips': 'Clips',
  'nav.pics': 'Pics',
  'nav.live': 'Live',
  'nav.news': 'News',
  'nav.shop': 'Shop',
  'nav.create': 'Create',
  'nav.creators': 'Top creators',
  'nav.following': 'Following',
  'nav.subscriptions': 'Subscriptions',
  'nav.history': 'History',
  'nav.liked': 'Liked',
  'nav.watchLater': 'Watch later',
  'nav.watchAgain': 'Watch again',
  'nav.hearts': 'Hearts',
  'nav.library': 'Library',
  'nav.explore': 'Explore',
  'nav.search': 'Search',
  'nav.coins': 'Coins',
  'nav.orders': 'Orders',
  'nav.wallet': 'Wallet',
  'nav.monetize': 'Monetize',
  'nav.help': 'Help',
  'nav.settings': 'Settings',
  'nav.studio': 'Creator dashboard',
  'nav.liveStream': 'Live Stream',
  'nav.appeals': 'Appeals portal',
  'nav.messages': 'Messages',
  'nav.account': 'Account',
  'nav.admin': 'Admin',
  'nav.logout': 'Logout',
  'nav.themeLight': 'Light theme',
  'nav.themeDark': 'Dark theme',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.dismiss': 'Dismiss',
  'common.loading': 'Loading…',
  'common.signIn': 'Sign in',
  'common.signOut': 'Sign out',
  'common.back': 'Back',
  'common.refresh': 'Refresh',
  'common.follow': 'Follow',
  'common.message': 'Message',
  'wallet.title': 'Wallet',
  'wallet.orders': 'Orders',
  'wallet.buy': 'Buy Coins',
  'wallet.noOrders': 'No coin orders yet.',
  'monetize.title': 'Monetize on calabi',
  'monetize.hero': 'Earn with tips, membership, and Coins',
  'earnings.title': 'Earnings',
  'earnings.available': 'Available',
  'earnings.pending': 'Pending',
  'earnings.withdraw': 'Request withdrawal',
  'earnings.feeHint': 'You keep 80% of the list price.',
  'fee.label': 'Platform fee',
  'fee.explainer': 'Platform and fraud protection',
  'connect.stripe': 'Connect Stripe',
  'connect.stripeSoon': 'Stripe Express is off — use Earnings withdrawals',
  'connect.stripeHint': 'Save a payout method in Studio → Earnings. Ops pays from Admin → Payouts.',
  'push.enable': 'Turn on notifications',
  'push.disable': 'Turn off notifications',
  'push.unsupported': 'Push is not supported in this browser.',
  'push.needKey': 'Push needs a VAPID public key on this deploy.',
  'push.enabled': 'Notifications on',
  'push.denied': 'Notification permission denied.',
  'push.failed': 'Could not enable notifications.',
  'i18n.language': 'Language',
  'i18n.hint': 'Changes labels across the site. Some legal pages stay English.',
  'transcode.optional': 'Optional compress before upload (experimental)',
  'live.ingestSelfHost': 'Self-host ingest with MediaMTX — see docs/mediamtx.md',
  'live.windowShare': 'Share this screen (free — no RTMP server)',
  'live.rtmpReady': 'OBS RTMP ready',
  'live.rtmpOff': 'OBS RTMP not connected yet',
  'live.onNow': 'On now',
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
  'creators.title': 'Top creators',
}

const ES = {
  'nav.home': 'Inicio',
  'nav.clips': 'Clips',
  'nav.pics': 'Fotos',
  'nav.live': 'En vivo',
  'nav.news': 'Noticias',
  'nav.shop': 'Tienda',
  'nav.create': 'Crear',
  'nav.creators': 'Top creadores',
  'nav.following': 'Siguiendo',
  'nav.subscriptions': 'Suscripciones',
  'nav.history': 'Historial',
  'nav.liked': 'Me gusta',
  'nav.watchLater': 'Ver más tarde',
  'nav.watchAgain': 'Ver de nuevo',
  'nav.hearts': 'Corazones',
  'nav.library': 'Biblioteca',
  'nav.explore': 'Explorar',
  'nav.search': 'Buscar',
  'nav.coins': 'Monedas',
  'nav.orders': 'Pedidos',
  'nav.wallet': 'Cartera',
  'nav.monetize': 'Monetizar',
  'nav.help': 'Ayuda',
  'nav.settings': 'Ajustes',
  'nav.studio': 'Panel de creador',
  'nav.liveStream': 'Directo',
  'nav.appeals': 'Portal de apelaciones',
  'nav.messages': 'Mensajes',
  'nav.account': 'Cuenta',
  'nav.admin': 'Admin',
  'nav.logout': 'Cerrar sesión',
  'nav.themeLight': 'Tema claro',
  'nav.themeDark': 'Tema oscuro',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.dismiss': 'Cerrar',
  'common.loading': 'Cargando…',
  'common.signIn': 'Iniciar sesión',
  'common.signOut': 'Cerrar sesión',
  'common.back': 'Atrás',
  'common.refresh': 'Actualizar',
  'common.follow': 'Seguir',
  'common.message': 'Mensaje',
  'wallet.title': 'Cartera',
  'wallet.orders': 'Pedidos',
  'wallet.buy': 'Comprar monedas',
  'wallet.noOrders': 'Aún no hay pedidos de monedas.',
  'monetize.title': 'Monetiza en calabi',
  'monetize.hero': 'Gana con propinas, membresía y monedas',
  'earnings.title': 'Ganancias',
  'earnings.available': 'Disponible',
  'earnings.pending': 'Pendiente',
  'earnings.withdraw': 'Solicitar retiro',
  'earnings.feeHint': 'Te quedas el 80% del precio.',
  'fee.label': 'Tarifa de plataforma',
  'fee.explainer': 'Plataforma y protección contra fraude',
  'connect.stripe': 'Conectar Stripe',
  'connect.stripeSoon': 'Stripe Express está apagado — usa retiros en Ganancias',
  'connect.stripeHint': 'Guarda un método de pago en Estudio → Ganancias.',
  'push.enable': 'Activar notificaciones',
  'push.disable': 'Desactivar notificaciones',
  'push.unsupported': 'Push no es compatible con este navegador.',
  'push.needKey': 'Push necesita una clave VAPID pública en este deploy.',
  'push.enabled': 'Notificaciones activadas',
  'push.denied': 'Permiso de notificaciones denegado.',
  'push.failed': 'No se pudieron activar las notificaciones.',
  'i18n.language': 'Idioma',
  'i18n.hint': 'Cambia las etiquetas del sitio. Algunas páginas legales siguen en inglés.',
  'transcode.optional': 'Comprimir antes de subir (experimental)',
  'live.ingestSelfHost': 'Autohospeda ingest con MediaMTX — docs/mediamtx.md',
  'live.windowShare': 'Compartir esta pantalla (gratis — sin servidor RTMP)',
  'live.rtmpReady': 'OBS RTMP listo',
  'live.rtmpOff': 'OBS RTMP aún no conectado',
  'live.onNow': 'Ahora',
  'social.connect': 'Conectar',
  'social.publish': 'Publicar',
  'social.needsOAuth': 'Añade claves de app gratis para publicar.',
  'social.handleOnly': 'Guarda un @ para tu perfil — publicar necesita OAuth.',
  'studio.overview': 'Resumen',
  'studio.content': 'Contenido',
  'studio.analytics': 'Analítica',
  'studio.earnings': 'Ganancias',
  'studio.settings': 'Ajustes',
  'checkout.title': 'Checkout calabi',
  'checkout.pay': 'Pagar',
  'creators.title': 'Top creadores',
}

const FR = {
  'nav.home': 'Accueil', 'nav.clips': 'Clips', 'nav.pics': 'Photos', 'nav.live': 'Live', 'nav.news': 'Actus',
  'nav.shop': 'Boutique', 'nav.create': 'Créer', 'nav.creators': 'Top créateurs', 'nav.following': 'Abonnements',
  'nav.subscriptions': 'Premium', 'nav.history': 'Historique', 'nav.liked': 'Aimés', 'nav.watchLater': 'À regarder',
  'nav.watchAgain': 'Revoir', 'nav.hearts': 'Cœurs', 'nav.library': 'Bibliothèque', 'nav.explore': 'Explorer',
  'nav.search': 'Rechercher', 'nav.coins': 'Pièces', 'nav.orders': 'Commandes', 'nav.wallet': 'Portefeuille',
  'nav.monetize': 'Monétiser', 'nav.help': 'Aide', 'nav.settings': 'Réglages', 'nav.studio': 'Espace créateur',
  'nav.liveStream': 'Stream live', 'nav.appeals': 'Portail d’appels', 'nav.messages': 'Messages',
  'nav.account': 'Compte', 'nav.admin': 'Admin', 'nav.logout': 'Déconnexion',
  'nav.themeLight': 'Thème clair', 'nav.themeDark': 'Thème sombre',
  'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.dismiss': 'Fermer',
  'common.loading': 'Chargement…', 'common.signIn': 'Connexion', 'common.signOut': 'Déconnexion',
  'common.back': 'Retour', 'common.refresh': 'Actualiser', 'common.follow': 'Suivre', 'common.message': 'Message',
  'wallet.title': 'Portefeuille', 'wallet.orders': 'Commandes', 'wallet.buy': 'Acheter des pièces',
  'wallet.noOrders': 'Pas encore de commandes.', 'monetize.title': 'Monétisez sur calabi',
  'monetize.hero': 'Gagnez avec tips, abonnement et pièces', 'earnings.title': 'Revenus',
  'earnings.available': 'Disponible', 'earnings.pending': 'En attente', 'earnings.withdraw': 'Demander un retrait',
  'earnings.feeHint': 'Vous gardez 80 % du prix.', 'fee.label': 'Frais de plateforme',
  'fee.explainer': 'Plateforme et anti-fraude', 'connect.stripe': 'Connecter Stripe',
  'connect.stripeSoon': 'Stripe Express est off — utilisez les retraits Revenus',
  'connect.stripeHint': 'Enregistrez un paiement dans Studio → Revenus.',
  'push.enable': 'Activer les notifications', 'push.disable': 'Désactiver les notifications',
  'push.unsupported': 'Push non pris en charge.', 'push.needKey': 'Push nécessite une clé VAPID publique.',
  'push.enabled': 'Notifications activées', 'push.denied': 'Permission refusée.',
  'push.failed': 'Impossible d’activer les notifications.',
  'i18n.language': 'Langue', 'i18n.hint': 'Change les libellés du site. Certaines pages légales restent en anglais.',
  'transcode.optional': 'Compresser avant l’upload (expérimental)',
  'live.ingestSelfHost': 'Auto-hébergez MediaMTX — docs/mediamtx.md',
  'live.windowShare': 'Partager cet écran (gratuit)', 'live.rtmpReady': 'OBS RTMP prêt',
  'live.rtmpOff': 'OBS RTMP pas encore connecté', 'live.onNow': 'En ce moment',
  'social.connect': 'Connecter', 'social.publish': 'Publier',
  'social.needsOAuth': 'Ajoutez des clés d’app gratuites pour publier.',
  'social.handleOnly': 'Enregistrez un @ — publier nécessite OAuth.',
  'studio.overview': 'Aperçu', 'studio.content': 'Contenu', 'studio.analytics': 'Analytique',
  'studio.earnings': 'Revenus', 'studio.settings': 'Réglages',
  'checkout.title': 'Checkout calabi', 'checkout.pay': 'Payer', 'creators.title': 'Top créateurs',
}

const PT = {
  'nav.home': 'Início', 'nav.clips': 'Clips', 'nav.pics': 'Fotos', 'nav.live': 'Ao vivo', 'nav.news': 'Notícias',
  'nav.shop': 'Loja', 'nav.create': 'Criar', 'nav.creators': 'Top criadores', 'nav.following': 'Seguindo',
  'nav.subscriptions': 'Assinaturas', 'nav.history': 'Histórico', 'nav.liked': 'Curtidos', 'nav.watchLater': 'Assistir depois',
  'nav.watchAgain': 'Assistir de novo', 'nav.hearts': 'Corações', 'nav.library': 'Biblioteca', 'nav.explore': 'Explorar',
  'nav.search': 'Pesquisar', 'nav.coins': 'Moedas', 'nav.orders': 'Pedidos', 'nav.wallet': 'Carteira',
  'nav.monetize': 'Monetizar', 'nav.help': 'Ajuda', 'nav.settings': 'Configurações', 'nav.studio': 'Painel do criador',
  'nav.liveStream': 'Live Stream', 'nav.appeals': 'Portal de recursos', 'nav.messages': 'Mensagens',
  'nav.account': 'Conta', 'nav.admin': 'Admin', 'nav.logout': 'Sair',
  'nav.themeLight': 'Tema claro', 'nav.themeDark': 'Tema escuro',
  'common.save': 'Salvar', 'common.cancel': 'Cancelar', 'common.dismiss': 'Fechar',
  'common.loading': 'Carregando…', 'common.signIn': 'Entrar', 'common.signOut': 'Sair',
  'common.back': 'Voltar', 'common.refresh': 'Atualizar', 'common.follow': 'Seguir', 'common.message': 'Mensagem',
  'wallet.title': 'Carteira', 'wallet.orders': 'Pedidos', 'wallet.buy': 'Comprar moedas',
  'wallet.noOrders': 'Ainda sem pedidos.', 'monetize.title': 'Monetize no calabi',
  'monetize.hero': 'Ganhe com tips, assinatura e moedas', 'earnings.title': 'Ganhos',
  'earnings.available': 'Disponível', 'earnings.pending': 'Pendente', 'earnings.withdraw': 'Solicitar saque',
  'earnings.feeHint': 'Você fica com 80% do preço.', 'fee.label': 'Taxa da plataforma',
  'fee.explainer': 'Plataforma e antifraude', 'connect.stripe': 'Conectar Stripe',
  'connect.stripeSoon': 'Stripe Express desligado — use saques em Ganhos',
  'connect.stripeHint': 'Salve um método em Estúdio → Ganhos.',
  'push.enable': 'Ativar notificações', 'push.disable': 'Desativar notificações',
  'push.unsupported': 'Push não suportado.', 'push.needKey': 'Push precisa de chave VAPID pública.',
  'push.enabled': 'Notificações ativas', 'push.denied': 'Permissão negada.',
  'push.failed': 'Não foi possível ativar.',
  'i18n.language': 'Idioma', 'i18n.hint': 'Muda os rótulos do site. Algumas páginas legais ficam em inglês.',
  'transcode.optional': 'Comprimir antes do upload (experimental)',
  'live.ingestSelfHost': 'Auto-hospede MediaMTX — docs/mediamtx.md',
  'live.windowShare': 'Compartilhar esta tela (grátis)', 'live.rtmpReady': 'OBS RTMP pronto',
  'live.rtmpOff': 'OBS RTMP ainda não conectado', 'live.onNow': 'Agora',
  'social.connect': 'Conectar', 'social.publish': 'Publicar',
  'social.needsOAuth': 'Adicione chaves de app gratuitas para publicar.',
  'social.handleOnly': 'Salve um @ — publicar precisa de OAuth.',
  'studio.overview': 'Visão geral', 'studio.content': 'Conteúdo', 'studio.analytics': 'Analytics',
  'studio.earnings': 'Ganhos', 'studio.settings': 'Configurações',
  'checkout.title': 'Checkout calabi', 'checkout.pay': 'Pagar', 'creators.title': 'Top criadores',
}

const DE = {
  'nav.home': 'Start', 'nav.clips': 'Clips', 'nav.pics': 'Bilder', 'nav.live': 'Live', 'nav.news': 'News',
  'nav.shop': 'Shop', 'nav.create': 'Erstellen', 'nav.creators': 'Top-Creator', 'nav.following': 'Folgen',
  'nav.subscriptions': 'Abos', 'nav.history': 'Verlauf', 'nav.liked': 'Geliked', 'nav.watchLater': 'Später ansehen',
  'nav.watchAgain': 'Nochmal', 'nav.hearts': 'Herzen', 'nav.library': 'Mediathek', 'nav.explore': 'Entdecken',
  'nav.search': 'Suche', 'nav.coins': 'Münzen', 'nav.orders': 'Bestellungen', 'nav.wallet': 'Wallet',
  'nav.monetize': 'Monetarisierung', 'nav.help': 'Hilfe', 'nav.settings': 'Einstellungen', 'nav.studio': 'Creator-Dashboard',
  'nav.liveStream': 'Livestream', 'nav.appeals': 'Einspruch-Portal', 'nav.messages': 'Nachrichten',
  'nav.account': 'Konto', 'nav.admin': 'Admin', 'nav.logout': 'Abmelden',
  'nav.themeLight': 'Helles Design', 'nav.themeDark': 'Dunkles Design',
  'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.dismiss': 'Schließen',
  'common.loading': 'Lädt…', 'common.signIn': 'Anmelden', 'common.signOut': 'Abmelden',
  'common.back': 'Zurück', 'common.refresh': 'Aktualisieren', 'common.follow': 'Folgen', 'common.message': 'Nachricht',
  'wallet.title': 'Wallet', 'wallet.orders': 'Bestellungen', 'wallet.buy': 'Münzen kaufen',
  'wallet.noOrders': 'Noch keine Bestellungen.', 'monetize.title': 'Mit calabi verdienen',
  'monetize.hero': 'Tips, Mitgliedschaft und Münzen', 'earnings.title': 'Einnahmen',
  'earnings.available': 'Verfügbar', 'earnings.pending': 'Ausstehend', 'earnings.withdraw': 'Auszahlung anfordern',
  'earnings.feeHint': 'Du behältst 80 % des Preises.', 'fee.label': 'Plattformgebühr',
  'fee.explainer': 'Plattform- und Betrugsschutz', 'connect.stripe': 'Stripe verbinden',
  'connect.stripeSoon': 'Stripe Express ist aus — nutze Auszahlungen',
  'connect.stripeHint': 'Speichere eine Methode unter Studio → Einnahmen.',
  'push.enable': 'Benachrichtigungen aktivieren', 'push.disable': 'Benachrichtigungen aus',
  'push.unsupported': 'Push wird nicht unterstützt.', 'push.needKey': 'Push braucht einen öffentlichen VAPID-Schlüssel.',
  'push.enabled': 'Benachrichtigungen an', 'push.denied': 'Berechtigung verweigert.',
  'push.failed': 'Konnte nicht aktivieren.',
  'i18n.language': 'Sprache', 'i18n.hint': 'Ändert Labels auf der Seite. Manche Rechtstexte bleiben Englisch.',
  'transcode.optional': 'Vor dem Upload komprimieren (experimentell)',
  'live.ingestSelfHost': 'MediaMTX selbst hosten — docs/mediamtx.md',
  'live.windowShare': 'Diesen Bildschirm teilen (kostenlos)', 'live.rtmpReady': 'OBS RTMP bereit',
  'live.rtmpOff': 'OBS RTMP noch nicht verbunden', 'live.onNow': 'Jetzt live',
  'social.connect': 'Verbinden', 'social.publish': 'Veröffentlichen',
  'social.needsOAuth': 'Kostenlose App-Keys zum Veröffentlichen hinzufügen.',
  'social.handleOnly': '@ speichern — Publish braucht OAuth.',
  'studio.overview': 'Übersicht', 'studio.content': 'Inhalt', 'studio.analytics': 'Analysen',
  'studio.earnings': 'Einnahmen', 'studio.settings': 'Einstellungen',
  'checkout.title': 'calabi Checkout', 'checkout.pay': 'Zahlen', 'creators.title': 'Top-Creator',
}

const ZH = {
  'nav.home': '首页', 'nav.clips': '短视频', 'nav.pics': '图片', 'nav.live': '直播', 'nav.news': '资讯',
  'nav.shop': '商店', 'nav.create': '创作', 'nav.creators': '热门创作者', 'nav.following': '关注',
  'nav.subscriptions': '订阅', 'nav.history': '历史', 'nav.liked': '喜欢', 'nav.watchLater': '稍后再看',
  'nav.watchAgain': '再看一次', 'nav.hearts': '爱心', 'nav.library': '媒体库', 'nav.explore': '发现',
  'nav.search': '搜索', 'nav.coins': '金币', 'nav.orders': '订单', 'nav.wallet': '钱包',
  'nav.monetize': '变现', 'nav.help': '帮助', 'nav.settings': '设置', 'nav.studio': '创作者中心',
  'nav.liveStream': '直播管理', 'nav.appeals': '申诉中心', 'nav.messages': '私信',
  'nav.account': '账户', 'nav.admin': '管理', 'nav.logout': '退出',
  'nav.themeLight': '浅色主题', 'nav.themeDark': '深色主题',
  'common.save': '保存', 'common.cancel': '取消', 'common.dismiss': '关闭',
  'common.loading': '加载中…', 'common.signIn': '登录', 'common.signOut': '退出',
  'common.back': '返回', 'common.refresh': '刷新', 'common.follow': '关注', 'common.message': '私信',
  'wallet.title': '钱包', 'wallet.orders': '订单', 'wallet.buy': '购买金币',
  'wallet.noOrders': '暂无订单。', 'monetize.title': '在 calabi 变现',
  'monetize.hero': '打赏、会员与金币', 'earnings.title': '收益',
  'earnings.available': '可用', 'earnings.pending': '待结算', 'earnings.withdraw': '申请提现',
  'earnings.feeHint': '你保留标价的 80%。', 'fee.label': '平台费',
  'fee.explainer': '平台与风控', 'connect.stripe': '连接 Stripe',
  'connect.stripeSoon': 'Stripe Express 已关闭 — 请使用收益提现',
  'connect.stripeHint': '在工作室 → 收益保存收款方式。',
  'push.enable': '开启通知', 'push.disable': '关闭通知',
  'push.unsupported': '此浏览器不支持推送。', 'push.needKey': '推送需要部署 VAPID 公钥。',
  'push.enabled': '通知已开启', 'push.denied': '通知权限被拒绝。',
  'push.failed': '无法开启通知。',
  'i18n.language': '语言', 'i18n.hint': '切换站点标签。部分法律页面仍为英文。',
  'transcode.optional': '上传前压缩（实验）',
  'live.ingestSelfHost': '使用 MediaMTX 自建推流 — docs/mediamtx.md',
  'live.windowShare': '共享此屏幕（免费）', 'live.rtmpReady': 'OBS RTMP 就绪',
  'live.rtmpOff': 'OBS RTMP 尚未连接', 'live.onNow': '正在直播',
  'social.connect': '连接', 'social.publish': '发布',
  'social.needsOAuth': '添加免费开发者密钥以发布。',
  'social.handleOnly': '先保存 @ — 发布需要 OAuth。',
  'studio.overview': '概览', 'studio.content': '内容', 'studio.analytics': '数据',
  'studio.earnings': '收益', 'studio.settings': '设置',
  'checkout.title': 'calabi 结账', 'checkout.pay': '支付', 'creators.title': '热门创作者',
}

const HI = {
  'nav.home': 'होम', 'nav.clips': 'क्लिप', 'nav.pics': 'फ़ोटो', 'nav.live': 'लाइव', 'nav.news': 'समाचार',
  'nav.shop': 'दुकान', 'nav.create': 'बनाएँ', 'nav.creators': 'टॉप क्रिएटर', 'nav.following': 'फ़ॉलोइंग',
  'nav.subscriptions': 'सदस्यता', 'nav.history': 'इतिहास', 'nav.liked': 'पसंद', 'nav.watchLater': 'बाद में देखें',
  'nav.watchAgain': 'फिर देखें', 'nav.hearts': 'हार्ट्स', 'nav.library': 'लाइब्रेरी', 'nav.explore': 'खोजें',
  'nav.search': 'खोज', 'nav.coins': 'सिक्के', 'nav.orders': 'ऑर्डर', 'nav.wallet': 'वॉलेट',
  'nav.monetize': 'कमाई', 'nav.help': 'मदद', 'nav.settings': 'सेटिंग्स', 'nav.studio': 'क्रिएटर डैशबोर्ड',
  'nav.liveStream': 'लाइव स्ट्रीम', 'nav.appeals': 'अपील पोर्टल', 'nav.messages': 'संदेश',
  'nav.account': 'खाता', 'nav.admin': 'एडमिन', 'nav.logout': 'लॉग आउट',
  'nav.themeLight': 'लाइट थीम', 'nav.themeDark': 'डार्क थीम',
  'common.save': 'सेव', 'common.cancel': 'रद्द', 'common.dismiss': 'बंद',
  'common.loading': 'लोड हो रहा है…', 'common.signIn': 'साइन इन', 'common.signOut': 'साइन आउट',
  'common.back': 'वापस', 'common.refresh': 'रीफ़्रेश', 'common.follow': 'फ़ॉलो', 'common.message': 'संदेश',
  'wallet.title': 'वॉलेट', 'wallet.orders': 'ऑर्डर', 'wallet.buy': 'सिक्के खरीदें',
  'wallet.noOrders': 'अभी कोई ऑर्डर नहीं।', 'monetize.title': 'calabi पर कमाएँ',
  'monetize.hero': 'टिप, मेंबरशिप और सिक्के', 'earnings.title': 'कमाई',
  'earnings.available': 'उपलब्ध', 'earnings.pending': 'लंबित', 'earnings.withdraw': 'निकासी अनुरोध',
  'earnings.feeHint': 'आपको कीमत का 80% मिलता है।', 'fee.label': 'प्लेटफ़ॉर्म शुल्क',
  'fee.explainer': 'प्लेटफ़ॉर्म और धोखाधड़ी सुरक्षा', 'connect.stripe': 'Stripe जोड़ें',
  'connect.stripeSoon': 'Stripe Express बंद — कमाई निकासी उपयोग करें',
  'connect.stripeHint': 'स्टूडियो → कमाई में भुगतान विधि सेव करें।',
  'push.enable': 'नोटिफ़िकेशन चालू करें', 'push.disable': 'नोटिफ़िकेशन बंद करें',
  'push.unsupported': 'पुश समर्थित नहीं।', 'push.needKey': 'पुश के लिए VAPID सार्वजनिक कुंजी चाहिए।',
  'push.enabled': 'नोटिफ़िकेशन चालू', 'push.denied': 'अनुमति अस्वीकृत।',
  'push.failed': 'चालू नहीं हो सका।',
  'i18n.language': 'भाषा', 'i18n.hint': 'साइट के लेबल बदलता है। कुछ कानूनी पेज अंग्रेज़ी में रह सकते हैं।',
  'transcode.optional': 'अपलोड से पहले संपीड़ित करें (प्रयोगात्मक)',
  'live.ingestSelfHost': 'MediaMTX स्वयं होस्ट करें — docs/mediamtx.md',
  'live.windowShare': 'यह स्क्रीन साझा करें (मुफ़्त)', 'live.rtmpReady': 'OBS RTMP तैयार',
  'live.rtmpOff': 'OBS RTMP अभी कनेक्ट नहीं', 'live.onNow': 'अभी लाइव',
  'social.connect': 'कनेक्ट', 'social.publish': 'प्रकाशित',
  'social.needsOAuth': 'प्रकाशित करने के लिए मुफ़्त ऐप कुंजियाँ जोड़ें।',
  'social.handleOnly': '@ सेव करें — प्रकाशित करने के लिए OAuth।',
  'studio.overview': 'ओवरव्यू', 'studio.content': 'सामग्री', 'studio.analytics': 'एनालिटिक्स',
  'studio.earnings': 'कमाई', 'studio.settings': 'सेटिंग्स',
  'checkout.title': 'calabi चेकआउट', 'checkout.pay': 'भुगतान', 'creators.title': 'टॉप क्रिएटर',
}

const AR = {
  'nav.home': 'الرئيسية', 'nav.clips': 'مقاطع', 'nav.pics': 'صور', 'nav.live': 'مباشر', 'nav.news': 'أخبار',
  'nav.shop': 'متجر', 'nav.create': 'إنشاء', 'nav.creators': 'أبرز المبدعين', 'nav.following': 'أتابع',
  'nav.subscriptions': 'الاشتراكات', 'nav.history': 'السجل', 'nav.liked': 'أعجبني', 'nav.watchLater': 'المشاهدة لاحقًا',
  'nav.watchAgain': 'إعادة المشاهدة', 'nav.hearts': 'قلوب', 'nav.library': 'المكتبة', 'nav.explore': 'استكشاف',
  'nav.search': 'بحث', 'nav.coins': 'عملات', 'nav.orders': 'طلبات', 'nav.wallet': 'محفظة',
  'nav.monetize': 'الربح', 'nav.help': 'مساعدة', 'nav.settings': 'الإعدادات', 'nav.studio': 'لوحة المبدع',
  'nav.liveStream': 'البث المباشر', 'nav.appeals': 'بوابة الاعتراضات', 'nav.messages': 'الرسائل',
  'nav.account': 'الحساب', 'nav.admin': 'المشرف', 'nav.logout': 'خروج',
  'nav.themeLight': 'مظهر فاتح', 'nav.themeDark': 'مظهر داكن',
  'common.save': 'حفظ', 'common.cancel': 'إلغاء', 'common.dismiss': 'إغلاق',
  'common.loading': 'جارٍ التحميل…', 'common.signIn': 'تسجيل الدخول', 'common.signOut': 'خروج',
  'common.back': 'رجوع', 'common.refresh': 'تحديث', 'common.follow': 'متابعة', 'common.message': 'رسالة',
  'wallet.title': 'المحفظة', 'wallet.orders': 'الطلبات', 'wallet.buy': 'شراء عملات',
  'wallet.noOrders': 'لا طلبات بعد.', 'monetize.title': 'الربح على calabi',
  'monetize.hero': 'إكراميات وعضوية وعملات', 'earnings.title': 'الأرباح',
  'earnings.available': 'متاح', 'earnings.pending': 'قيد الانتظار', 'earnings.withdraw': 'طلب سحب',
  'earnings.feeHint': 'تحتفظ بـ 80٪ من السعر.', 'fee.label': 'رسوم المنصة',
  'fee.explainer': 'المنصة ومكافحة الاحتيال', 'connect.stripe': 'ربط Stripe',
  'connect.stripeSoon': 'Stripe Express متوقف — استخدم سحب الأرباح',
  'connect.stripeHint': 'احفظ طريقة دفع في الاستوديو → الأرباح.',
  'push.enable': 'تفعيل الإشعارات', 'push.disable': 'إيقاف الإشعارات',
  'push.unsupported': 'الدفع غير مدعوم.', 'push.needKey': 'يتطلب مفتاح VAPID عامًا.',
  'push.enabled': 'الإشعارات مفعّلة', 'push.denied': 'تم رفض الإذن.',
  'push.failed': 'تعذّر التفعيل.',
  'i18n.language': 'اللغة', 'i18n.hint': 'يغيّر تسميات الموقع. بعض الصفحات القانونية تبقى بالإنجليزية.',
  'transcode.optional': 'ضغط قبل الرفع (تجريبي)',
  'live.ingestSelfHost': 'استضف MediaMTX بنفسك — docs/mediamtx.md',
  'live.windowShare': 'مشاركة هذه الشاشة (مجاني)', 'live.rtmpReady': 'OBS RTMP جاهز',
  'live.rtmpOff': 'OBS RTMP غير متصل بعد', 'live.onNow': 'الآن',
  'social.connect': 'ربط', 'social.publish': 'نشر',
  'social.needsOAuth': 'أضف مفاتيح تطبيق مجانية للنشر.',
  'social.handleOnly': 'احفظ @ — النشر يحتاج OAuth.',
  'studio.overview': 'نظرة عامة', 'studio.content': 'المحتوى', 'studio.analytics': 'التحليلات',
  'studio.earnings': 'الأرباح', 'studio.settings': 'الإعدادات',
  'checkout.title': 'دفع calabi', 'checkout.pay': 'ادفع', 'creators.title': 'أبرز المبدعين',
}

const JA = {
  'nav.home': 'ホーム', 'nav.clips': 'クリップ', 'nav.pics': '写真', 'nav.live': 'ライブ', 'nav.news': 'ニュース',
  'nav.shop': 'ショップ', 'nav.create': '作成', 'nav.creators': '人気クリエイター', 'nav.following': 'フォロー中',
  'nav.subscriptions': 'メンバーシップ', 'nav.history': '履歴', 'nav.liked': '高評価', 'nav.watchLater': '後で見る',
  'nav.watchAgain': 'もう一度', 'nav.hearts': 'ハート', 'nav.library': 'ライブラリ', 'nav.explore': '探索',
  'nav.search': '検索', 'nav.coins': 'コイン', 'nav.orders': '注文', 'nav.wallet': 'ウォレット',
  'nav.monetize': '収益化', 'nav.help': 'ヘルプ', 'nav.settings': '設定', 'nav.studio': 'クリエイターダッシュボード',
  'nav.liveStream': 'ライブ配信', 'nav.appeals': '異議申し立て', 'nav.messages': 'メッセージ',
  'nav.account': 'アカウント', 'nav.admin': '管理', 'nav.logout': 'ログアウト',
  'nav.themeLight': 'ライトテーマ', 'nav.themeDark': 'ダークテーマ',
  'common.save': '保存', 'common.cancel': 'キャンセル', 'common.dismiss': '閉じる',
  'common.loading': '読み込み中…', 'common.signIn': 'ログイン', 'common.signOut': 'ログアウト',
  'common.back': '戻る', 'common.refresh': '更新', 'common.follow': 'フォロー', 'common.message': 'メッセージ',
  'wallet.title': 'ウォレット', 'wallet.orders': '注文', 'wallet.buy': 'コインを購入',
  'wallet.noOrders': '注文はまだありません。', 'monetize.title': 'calabiで収益化',
  'monetize.hero': 'チップ・メンバーシップ・コイン', 'earnings.title': '収益',
  'earnings.available': '利用可能', 'earnings.pending': '保留中', 'earnings.withdraw': '出金を申請',
  'earnings.feeHint': '価格の80%があなたのもの。', 'fee.label': 'プラットフォーム手数料',
  'fee.explainer': 'プラットフォームと不正防止', 'connect.stripe': 'Stripeを接続',
  'connect.stripeSoon': 'Stripe Expressはオフ — 収益出金を使用',
  'connect.stripeHint': 'スタジオ → 収益で受取方法を保存。',
  'push.enable': '通知をオン', 'push.disable': '通知をオフ',
  'push.unsupported': 'プッシュ非対応。', 'push.needKey': 'VAPID公開鍵が必要です。',
  'push.enabled': '通知オン', 'push.denied': '許可が拒否されました。',
  'push.failed': '有効にできませんでした。',
  'i18n.language': '言語', 'i18n.hint': 'サイトの表示言語を切り替えます。一部の法的ページは英語のままです。',
  'transcode.optional': 'アップロード前に圧縮（実験的）',
  'live.ingestSelfHost': 'MediaMTXを自ホスト — docs/mediamtx.md',
  'live.windowShare': 'この画面を共有（無料）', 'live.rtmpReady': 'OBS RTMP準備完了',
  'live.rtmpOff': 'OBS RTMP未接続', 'live.onNow': '配信中',
  'social.connect': '接続', 'social.publish': '公開',
  'social.needsOAuth': '公開には無料の開発者キーが必要です。',
  'social.handleOnly': '@を保存 — 公開にはOAuth。',
  'studio.overview': '概要', 'studio.content': 'コンテンツ', 'studio.analytics': '分析',
  'studio.earnings': '収益', 'studio.settings': '設定',
  'checkout.title': 'calabiチェックアウト', 'checkout.pay': '支払う', 'creators.title': '人気クリエイター',
}

const KO = {
  'nav.home': '홈', 'nav.clips': '클립', 'nav.pics': '사진', 'nav.live': '라이브', 'nav.news': '뉴스',
  'nav.shop': '쇼핑', 'nav.create': '만들기', 'nav.creators': '인기 크리에이터', 'nav.following': '팔로잉',
  'nav.subscriptions': '멤버십', 'nav.history': '기록', 'nav.liked': '좋아요', 'nav.watchLater': '나중에 보기',
  'nav.watchAgain': '다시 보기', 'nav.hearts': '하트', 'nav.library': '보관함', 'nav.explore': '탐색',
  'nav.search': '검색', 'nav.coins': '코인', 'nav.orders': '주문', 'nav.wallet': '지갑',
  'nav.monetize': '수익화', 'nav.help': '도움말', 'nav.settings': '설정', 'nav.studio': '크리에이터 대시보드',
  'nav.liveStream': '라이브 스트림', 'nav.appeals': '이의 신청', 'nav.messages': '메시지',
  'nav.account': '계정', 'nav.admin': '관리', 'nav.logout': '로그아웃',
  'nav.themeLight': '라이트 테마', 'nav.themeDark': '다크 테마',
  'common.save': '저장', 'common.cancel': '취소', 'common.dismiss': '닫기',
  'common.loading': '로딩 중…', 'common.signIn': '로그인', 'common.signOut': '로그아웃',
  'common.back': '뒤로', 'common.refresh': '새로고침', 'common.follow': '팔로우', 'common.message': '메시지',
  'wallet.title': '지갑', 'wallet.orders': '주문', 'wallet.buy': '코인 구매',
  'wallet.noOrders': '주문 내역이 없습니다.', 'monetize.title': 'calabi에서 수익화',
  'monetize.hero': '팁, 멤버십, 코인', 'earnings.title': '수익',
  'earnings.available': '출금 가능', 'earnings.pending': '대기 중', 'earnings.withdraw': '출금 요청',
  'earnings.feeHint': '정가의 80%를 받습니다.', 'fee.label': '플랫폼 수수료',
  'fee.explainer': '플랫폼 및 사기 방지', 'connect.stripe': 'Stripe 연결',
  'connect.stripeSoon': 'Stripe Express 비활성 — 수익 출금 사용',
  'connect.stripeHint': '스튜디오 → 수익에서 지급 수단 저장.',
  'push.enable': '알림 켜기', 'push.disable': '알림 끄기',
  'push.unsupported': '푸시를 지원하지 않습니다.', 'push.needKey': 'VAPID 공개 키가 필요합니다.',
  'push.enabled': '알림 켜짐', 'push.denied': '권한이 거부되었습니다.',
  'push.failed': '켤 수 없습니다.',
  'i18n.language': '언어', 'i18n.hint': '사이트 문구를 바꿉니다. 일부 법률 페이지는 영어입니다.',
  'transcode.optional': '업로드 전 압축(실험)',
  'live.ingestSelfHost': 'MediaMTX 자체 호스팅 — docs/mediamtx.md',
  'live.windowShare': '이 화면 공유(무료)', 'live.rtmpReady': 'OBS RTMP 준비됨',
  'live.rtmpOff': 'OBS RTMP 미연결', 'live.onNow': '지금 방송',
  'social.connect': '연결', 'social.publish': '게시',
  'social.needsOAuth': '게시를 위해 무료 개발자 키를 추가하세요.',
  'social.handleOnly': '@ 저장 — 게시는 OAuth 필요.',
  'studio.overview': '개요', 'studio.content': '콘텐츠', 'studio.analytics': '분석',
  'studio.earnings': '수익', 'studio.settings': '설정',
  'checkout.title': 'calabi 결제', 'checkout.pay': '결제', 'creators.title': '인기 크리에이터',
}

export const LOCALES = {
  en: EN,
  es: ES,
  fr: FR,
  pt: PT,
  de: DE,
  zh: ZH,
  hi: HI,
  ar: AR,
  ja: JA,
  ko: KO,
}

let locale = 'en'
const listeners = new Set()

function normalize(next) {
  const v = String(next || 'en').trim().toLowerCase().slice(0, 8)
  return SUPPORTED_LOCALES.some((l) => l.id === v) ? v : 'en'
}

function localeMeta(id = locale) {
  return SUPPORTED_LOCALES.find((l) => l.id === id) || SUPPORTED_LOCALES[0]
}

export function getLocale() {
  return locale
}

export function setLocale(next) {
  locale = normalize(next)
  try { lsSet(LOCALE_KEY, locale) } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    try {
      document.documentElement.lang = locale
      document.documentElement.dir = localeMeta(locale).dir || 'ltr'
    } catch { /* ignore */ }
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

/** Every listed locale has native label + EN fallback for missing keys. */
export function i18nReady() {
  return SUPPORTED_LOCALES.length >= 10
    && SUPPORTED_LOCALES.every((l) => l.label && LOCALES[l.id])
    && Object.keys(EN).every((k) => typeof EN[k] === 'string' && EN[k].length > 0)
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
