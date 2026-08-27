import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from './context/AuthContext'
import { warnIfSupabaseMissing } from './lib/supabaseClient'
import { initLocale } from './lib/i18n'
import { initTheme } from './lib/theme'
import ErrorBoundary from './components/ErrorBoundary'
import StreamingNavbar from './components/StreamingNavbar'
import CollapsibleSidebar from './components/CollapsibleSidebar'
import LiveChatPanel from './components/LiveChatPanel'
import MfaGate from './components/MfaGate'
import HomeFeed from './components/HomeFeed'
import ShortsFeed from './components/ShortsFeed'
import LiveView from './components/LiveView'
import SettingsHub from './components/settings/SettingsHub'
import WalletSettings from './components/settings/WalletSettings'
import LibraryPage from './components/LibraryPage'
import HistoryPage from './components/HistoryPage'
import WatchAgainPage from './components/WatchAgainPage'
import HeartsPage from './components/HeartsPage'
import LikedPage from './components/LikedPage'
import WatchLaterPage from './components/WatchLaterPage'
import StatsPage from './components/StatsPage'
import ExplorePage from './components/ExplorePage'
import HelpPage from './components/HelpPage'
import AboutPage from './components/AboutPage'
import NotificationsPage from './components/NotificationsPage'
import NotFoundPage from './components/NotFoundPage'
import AuthRequired from './components/AuthRequired'
import ImportShortModal from './components/ImportShortModal'
import AuthModal from './components/AuthModal'
import PasswordRecoveryGate from './components/PasswordRecoveryGate'
import UploadModal from './components/UploadModal'
import PicsPage from './components/PicsPage'
import CheckoutPage from './components/CheckoutPage'
import CheckoutModal from './components/CheckoutModal'
import CreatorApplyPage from './components/CreatorApplyPage'
import AdvertisePage from './components/AdvertisePage'
import SupportPage from './components/SupportPage'
import CreatorsPage from './components/CreatorsPage'
import ChannelPage from './components/ChannelPage'
import ProfilePage from './components/ProfilePage'
import SubscriptionsPage from './components/SubscriptionsPage'
import FollowingPage from './components/FollowingPage'
import PlaylistsPage from './components/PlaylistsPage'
import CommunityPage from './components/CommunityPage'
import StudioToolsPage from './components/StudioToolsPage'
import ContentRulesPage from './components/ContentRulesPage'
import CreatePage from './components/CreatePage'
import SoundPage from './components/SoundPage'
import TagPage from './components/TagPage'
import MiniPlayer from './components/MiniPlayer'
import {
  TermsOfService, PrivacyPolicy, CreatorAgreement, CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'
import { lsGet, lsSet } from './lib/storage'
import { syncContentFromCloud, notifyContentChanged, subscribeCloudCatalog } from './lib/contentSync'
import { pullLiveFeatureState } from './lib/liveFeatureSync'
import { setGraphActor, syncGraphFromCloud, syncPublicEngagementFromCloud } from './lib/graphSync'
import { promoteDeviceUploadsToCloud } from './lib/promoteUploads'
import { installRuntimeGuards } from './lib/selfHeal'
import { pushLibraryCatalogToCloud } from './data/publicMediaSeed'
import { isOwnerAccount } from './data/ownerLogin'
import { getById, getWatchItem, stashWatchItem, flushScheduledPublishes, resolvePublicCreator } from './lib/contentService'
import { parseRoute, pushHash, migrateHashToPath, buildHash } from './lib/routes'
import { useNextNav } from './lib/NextNavContext'
import { syncPromotionsFromCloud } from './lib/promotions'
import PromoBanner from './components/PromoBanner'
import EnvConfigBanner from './components/EnvConfigBanner'
import ToastLiveRegion from './components/ToastLiveRegion'
import { claimStripeReturn } from './lib/tips'
import { membershipReturnPaid } from './lib/stripeConfig'
import { addPremiumSub } from './lib/engagement'
import { isPlatformOwner, isAdminSession } from './lib/moderation'

const CreatorStudio = lazy(() => import('./components/studio/CreatorStudio'))
const WatchPage = lazy(() => import('./components/WatchPage'))
const AdminPortal = lazy(() => import('./components/AdminPortal'))
const AdvertiserPortal = lazy(() => import('./components/AdvertiserPortal'))
const CalabiStudioPage = lazy(() => import('./components/CalabiStudioPage'))
const ShopPage = lazy(() => import('./components/ShopPage'))
const SellerPortal = lazy(() => import('./components/SellerPortal'))
const NewsPage = lazy(() => import('./components/NewsPage'))
const MessagesPage = lazy(() => import('./components/MessagesPage'))
const BubbleApiPage = lazy(() => import('./components/BubbleApiPage'))
const AppealsPage = lazy(() => import('./components/AppealsPage'))

const KNOWN_VIEWS = new Set([
  'home', 'creators', 'clips', 'shorts', 'live', 'dashboard', 'wallet', 'settings',
  'explore', 'history', 'watch-again', 'hearts', 'liked', 'watch-later', 'library', 'stats', 'help', 'about',
  'notifications', 'pics', 'checkout', 'creator-apply', 'verify', 'advertise', 'advertiser-portal', 'support', 'admin',
  'analytics', 'channel', 'profile', 'content-rules', 'vods',
  'subscriptions', 'following', 'playlists', 'community', 'studio-tools', 'stream-settings',
  'calabi-studio', 'calabi-cash', 'shop', 'marketplace', 'seller', 'seller-portal', 'news',
  'legal-tos', 'legal-privacy', 'legal-creator', 'legal-community',
  'watch', 'sound', 'tag', 'create', 'messages', 'api', 'appeals',
])

function AppShell() {
  const { user, isAuthenticated, mfaPending, passwordRecovery } = useAuth()
  const nextNav = useNextNav()
  const pathname = nextNav?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const [view, setView] = useState('home')
  const [routeId, setRouteId] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadKind, setUploadKind] = useState('video')
  const [uploadSound, setUploadSound] = useState(null)
  const [uploadStitch, setUploadStitch] = useState(null)
  const [routeParams, setRouteParams] = useState({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutTarget, setCheckoutTarget] = useState({ id: null, handle: '' })
  const [profileTarget, setProfileTarget] = useState({ handle: '', userId: null })
  const [searchQuery, setSearchQuery] = useState('')
  const [miniItem, setMiniItem] = useState(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(() => lsGet('chat_collapsed', false) === true)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [focusedLiveStream, setFocusedLiveStream] = useState(null)

  useEffect(() => {
    warnIfSupabaseMissing()
    try { initLocale() } catch { /* ignore */ }
    try { initTheme() } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (isAuthenticated && user?.id) startSession(user.id)
    setGraphActor(user?.provider === 'supabase' ? user : null)
    if (user?.provider === 'supabase') {
      syncGraphFromCloud().catch(() => {})
      // Legacy device-only blobs → cloud links, then drop the device copy.
      promoteDeviceUploadsToCloud(user).catch(() => {})
    }
  }, [isAuthenticated, user?.id, user?.provider])

  useEffect(() => installRuntimeGuards(), [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const titles = {
      home: 'Recommended',
      clips: 'Shorts',
      shorts: 'Shorts',
      pics: 'Pics',
      live: 'Live',
      news: 'News',
      shop: 'Shop',
      marketplace: 'Shop',
      explore: 'Explore',
      creators: 'Top creators',
      create: 'Create',
      following: 'Following',
      subscriptions: 'Subscriptions',
      history: 'History',
      'watch-again': 'Watch again',
      'watch-later': 'Watch later',
      liked: 'Liked',
      hearts: 'Hearts',
      playlists: 'Playlists',
      library: 'Library',
      messages: 'Messages',
      notifications: 'Notifications',
      settings: 'Settings',
      wallet: 'Wallet',
      'calabi-cash': 'Wallet',
      rewards: 'Wallet',
      help: 'Help',
      about: 'About',
      support: 'Support',
      appeals: 'Appeals',
      stats: 'Stats',
      api: 'API',
      seller: 'Seller portal',
      'seller-portal': 'Seller portal',
      advertise: 'Monetize',
      'advertiser-portal': 'Monetize',
      admin: 'Admin',
      watch: 'Watch',
      profile: profileTarget.handle ? `@${profileTarget.handle}` : 'Profile',
      checkout: 'Premium',
      dashboard: 'Creator Studio',
      analytics: 'Analytics',
      vods: 'VODs',
      verify: 'Get verified',
      'legal-tos': 'Terms',
      'legal-privacy': 'Privacy',
      'legal-creator': 'Creator Agreement',
      'legal-community': 'Community Guidelines',
    }
    document.title = titles[view] ? `${titles[view]} · calabi` : 'calabi'
  }, [view, routeId, profileTarget.handle])

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return
    if (!membershipReturnPaid(routeParams, window.location.search)) return
    const claimed = claimStripeReturn(user, routeParams, window.location.search)
    if (claimed.ok) notifyContentChanged()
    if (claimed.kind === 'premium') {
      addPremiumSub(user.id, claimed.creatorId || checkoutTarget.id || user.id)
    }
  }, [user?.id, routeParams, checkoutTarget.id])

  useEffect(() => {
    const pull = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      // #1: videos / clips / pics catalog before live features, graph, promotions.
      try {
        await syncContentFromCloud(user)
      } catch {}
      flushScheduledPublishes()
      // Secondary (non-blocking): live state, shop-adjacent graph, promos.
      pullLiveFeatureState().catch(() => {})
      syncPromotionsFromCloud()
      syncGraphFromCloud().catch(() => {})
      syncPublicEngagementFromCloud().catch(() => {})
    }
    pull()
    if (isOwnerAccount(user)) pushLibraryCatalogToCloud().catch(() => {})
    const intervalMs = user?.id ? 45_000 : 90_000
    const interval = setInterval(pull, intervalMs)
    const onFocus = () => pull()
    const onVis = () => { if (document.visibilityState === 'visible') pull() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    let unsubLive = () => {}
    subscribeCloudCatalog(() => {}).then((off) => { unsubLive = off || (() => {}) }).catch(() => {})
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      try { unsubLive() } catch {}
    }
  }, [user])

  const applyRoute = () => {
    const parsed = parseRoute()
    // Friendly legal URLs: /terms /privacy (and short aliases).
    const LEGAL_ALIASES = {
      terms: 'legal-tos',
      tos: 'legal-tos',
      privacy: 'legal-privacy',
      'creator-agreement': 'legal-creator',
      guidelines: 'legal-community',
    }
    const kind = LEGAL_ALIASES[parsed.kind] || parsed.kind
    const rawRouteId = parsed.id
    const params = parsed.params
    // Never stash objects in routeId — coerce to string id only.
    const id = rawRouteId && typeof rawRouteId === 'object'
      ? String(rawRouteId.id || '')
      : String(rawRouteId || '')
    setRouteParams(params && typeof params === 'object' ? params : {})
    // Bare calabi.us/<id> (and /content/<id>) → open the right player by type.
    if ((kind === 'content' || kind === 'v') && id) {
      setMiniItem(null)
      setRouteId(id)
      const item = getWatchItem(id)
      if (item?.type === 'pic') {
        setView('pics')
        return
      }
      if (item?.type === 'short') {
        setView('clips')
        return
      }
      setView('watch')
      return
    }
    if (kind === 'watch' && id) {
      setMiniItem(null)
      setRouteId(id)
      setView('watch')
      return
    }
    if (kind === 'sound' && id) {
      setRouteId(id)
      setView('sound')
      return
    }
    if (kind === 'tag' && id) {
      setRouteId(id)
      setView('tag')
      return
    }
    if (kind === 'profile') {
      const handle = String(id || '').replace(/^@/, '')
      const uid = params?.u || null
      const found = resolvePublicCreator(handle, uid)
      setProfileTarget({ handle: found?.handle || handle, userId: found?.id || uid || null })
      setView('profile')
      return
    }
    if (kind === 'playlist' && id) {
      setRouteId(id)
      setView('playlists')
      return
    }
    if (kind === 'pic' && id) {
      setRouteId(id)
      setView('pics')
      return
    }
    if (kind === 'checkout') {
      const creatorId = params?.creator || params?.c || id || ''
      if (creatorId) {
        setCheckoutTarget({
          id: creatorId,
          handle: String(params?.handle || params?.h || '').replace(/^@/, ''),
        })
      }
      setView('checkout')
      setRouteId(id || '')
      return
    }
    if (KNOWN_VIEWS.has(kind)) {
      if (kind === 'explore' && params?.q) setSearchQuery(String(params.q))
      setView(kind === 'shorts' ? 'clips' : kind)
      setRouteId(id || '')
    }
  }

  useEffect(() => {
    migrateHashToPath()
    applyRoute()
    const onPop = () => applyRoute()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  // Keep SpaShell view in sync when Next App Router changes the path.
  useEffect(() => {
    applyRoute()
  }, [pathname])

  const goPath = (kind, id = '', params = null) => {
    const path = buildHash(kind, id, params)
    try {
      if (nextNav?.router?.push) nextNav.router.push(path)
      else pushHash(kind, id, params)
    } catch {
      pushHash(kind, id, params)
    }
    return path
  }

  const dockWatchIfNeeded = (leavingWatch) => {
    if (!leavingWatch) return
    const current = getWatchItem(routeId)
    if (current?.type === 'video') setMiniItem(current)
  }

  const navigate = (next, id = '', params = null) => {
    try {
      const dest = next === 'shorts' ? 'clips' : String(next || 'home')
      setSidebarOpen(false)
      dockWatchIfNeeded(view === 'watch' && dest !== 'watch')
      setView(dest)
      // Never stash objects in routeId — that broke clips focus and sideways layout jumps.
      const rawId = dest === 'profile' ? (id || profileTarget.handle) : id
      const nextId = rawId && typeof rawId === 'object' ? String(rawId.id || '') : String(rawId || '')
      setRouteId(nextId || '')
      setRouteParams(params && typeof params === 'object' ? params : {})
      if (dest === 'profile') {
        const uid = (params && params.u) || profileTarget.userId
        goPath('profile', nextId, uid ? { u: uid, ...(params || {}) } : params)
      } else if ((dest === 'clips' || dest === 'watch' || dest === 'pics') && nextId) {
        // Posts use bare /{id} share URLs; clip/pic/watch lists stay /clips etc.
        goPath('content', nextId)
      } else {
        goPath(dest, nextId, params)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setView('home')
    }
  }

  const openWatch = (itemOrId) => {
    setSidebarOpen(false)
    const item = typeof itemOrId === 'string' ? getWatchItem(itemOrId) : itemOrId
    if (!item) return
    stashWatchItem(item)
    if (item.type === 'pic') {
      openPic(item)
      return
    }
    if (item.type === 'short') {
      setMiniItem(null)
      navigate('clips', item.id)
      return
    }
    setMiniItem(null)
    setRouteId(String(item.id || ''))
    setView('watch')
    goPath('content', String(item.id || ''))
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }

  const openSound = (key) => {
    dockWatchIfNeeded(view === 'watch')
    const id = String(key || '')
    setRouteId(id)
    setView('sound')
    goPath('sound', id)
  }

  const openTag = (tag) => {
    dockWatchIfNeeded(view === 'watch')
    const id = String(tag || '').replace(/^#/, '')
    setRouteId(id)
    setView('tag')
    goPath('tag', id)
  }

  const openPic = (pic) => {
    const id = typeof pic === 'string' ? pic : pic?.id
    if (!id) return
    setRouteId(id)
    setView('pics')
    goPath('content', id)
  }

  const openAuth = () => setAuthOpen(true)
  const openImport = () => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setImportOpen(true)
  }
  const openUpload = (kind = 'video') => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setUploadKind(kind === 'short' || kind === 'clip' ? 'short' : 'video')
    setUploadOpen(true)
  }
  const openCreate = (kind) => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    if (kind === 'video') {
      openUpload('video')
      return
    }
    if (kind === 'clip') {
      openUpload('short')
      return
    }
    if (kind === 'live') {
      navigate('live')
    }
    if (kind === 'pic') {
      navigate('pics')
    }
  }
  const openProfile = (handle, userId = null) => {
    dockWatchIfNeeded(view === 'watch')
    const h = String(handle || '').replace(/^@/, '')
    const found = resolvePublicCreator(h, userId)
    setProfileTarget({ handle: h || found?.handle || '', userId: found?.id || userId || null })
    setView('profile')
    goPath('profile', h || found?.handle || '', (found?.id || userId) ? { u: found?.id || userId } : null)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    window.__clipsOpenProfile = openProfile
    window.__clipsOpenSound = openSound
    window.__clipsOpenTag = openTag
    window.__clipsOpenWatch = openWatch
    return () => {
      delete window.__clipsOpenProfile
      delete window.__clipsOpenSound
      delete window.__clipsOpenTag
      delete window.__clipsOpenWatch
    }
  })

  const openCheckout = (creatorId, creatorHandle) => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setCheckoutTarget({ id: creatorId || null, handle: creatorHandle || '' })
    setCheckoutOpen(true)
  }
  const useSound = (sound) => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setUploadSound(sound)
    setUploadKind('short')
    setUploadOpen(true)
  }
  const openStitch = (item) => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setUploadStitch(item)
    setUploadKind('short')
    setUploadOpen(true)
  }

  const focusLiveStream = (entry) => setFocusedLiveStream(entry)
  const selectLiveStreamFromSidebar = (entry) => {
    setFocusedLiveStream(entry)
    navigate('live')
  }

  const toggleChat = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileChatOpen((v) => !v)
    } else {
      setChatCollapsed((prev) => {
        const next = !prev
        lsSet('chat_collapsed', next)
        return next
      })
    }
  }

  const renderMain = () => {
    if (!KNOWN_VIEWS.has(view)) return <NotFoundPage onNavigate={navigate} />
    const needsAuth = (
      view === 'dashboard'
      || view === 'settings'
      || view === 'channel'
      || view === 'analytics'
      || view === 'studio-tools'
      || view === 'calabi-studio'
      || view === 'vods'
      || view === 'verify'
    )
    if (needsAuth && !isAuthenticated) {
      const titles = {
        dashboard: 'Creator Studio',
        settings: 'Settings',
        channel: 'Channel',
        analytics: 'Analytics',
        'studio-tools': 'Studio',
        'calabi-studio': 'Calabi Studio',
        vods: 'VODs',
        verify: 'Verification',
      }
      return <AuthRequired title={titles[view] || 'Sign in'} description="Sign in." onOpenAuth={openAuth} />
    }
    if (view === 'admin') {
      // Signed-in non-owners never see Admin UI (navbar already hides the link).
      if (user && !isPlatformOwner(user) && !isAdminSession(user)) {
        return <NotFoundPage onNavigate={navigate} />
      }
      return <AdminPortal onNavigate={navigate} initialTab={routeId || ''} />
    }

    switch (view) {
      case 'home': return <HomeFeed onPlayItem={openWatch} onOpenPic={openPic} onOpenProfile={openProfile} onNavigate={navigate} />
      case 'creators': return <CreatorsPage />
      case 'clips':
      case 'shorts':
        return (
          <ShortsFeed
            onOpenAuth={openAuth}
            onOpenProfile={openProfile}
            onOpenSound={openSound}
            onStitch={openStitch}
            onNavigate={navigate}
            focusId={routeId}
          />
        )
      case 'watch':
        return (
          <WatchPage
            itemId={routeId}
            startAt={Number(routeParams.t) || 0}
            onBack={() => navigate('home')}
            onPlayItem={openWatch}
            onOpenSound={openSound}
            onOpenTag={openTag}
            onOpenProfile={openProfile}
            onOpenAuth={openAuth}
            onStitch={openStitch}
          />
        )
      case 'sound':
        return (
          <SoundPage
            soundKey={routeId}
            onNavigate={navigate}
            onPlayItem={openWatch}
            onUseSound={useSound}
          />
        )
      case 'tag':
        return <TagPage tag={routeId} onNavigate={navigate} onPlayItem={openWatch} onOpenPic={openPic} onOpenTag={openTag} />
      case 'live':
        return (
          <LiveView
            focusedStream={focusedLiveStream}
            onFocusStream={focusLiveStream}
            onOpenAuth={openAuth}
            onNavigate={navigate}
          />
        )
      case 'dashboard':
        return (
          <CreatorStudio
            onOpenImport={openImport}
            onOpenUpload={openUpload}
            onNavigate={navigate}
            onPlayItem={openWatch}
            onOpenAuth={openAuth}
            initialSection={routeId || 'overview'}
            initialSettingsPage={routeParams.tab || 'chat'}
          />
        )
      case 'vods':
        return (
          <CreatorStudio
            onOpenImport={openImport}
            onOpenUpload={openUpload}
            onNavigate={navigate}
            onPlayItem={openWatch}
            onOpenAuth={openAuth}
            initialSection="vods"
          />
        )
      case 'wallet':
      case 'calabi-cash':
        return (
          <WalletSettings onNavigate={navigate} onOpenAuth={openAuth} initialTab={routeParams.tab} />
        )
      case 'stream-settings':
        return (
          <CreatorStudio
            onOpenImport={openImport}
            onOpenUpload={openUpload}
            onNavigate={navigate}
            onPlayItem={openWatch}
            onOpenAuth={openAuth}
            initialSection="stream"
          />
        )
      case 'analytics':
        return (
          <CreatorStudio
            onOpenImport={openImport}
            onOpenUpload={openUpload}
            onNavigate={navigate}
            onPlayItem={openWatch}
            onOpenAuth={openAuth}
            initialSection="analytics"
          />
        )
      case 'channel': return <ChannelPage onNavigate={navigate} />
      case 'profile': return <ProfilePage onNavigate={navigate} profileHandle={profileTarget.handle} profileUserId={profileTarget.userId} onPlayItem={openWatch} onOpenPic={openPic} onOpenProfile={openProfile} onOpenAuth={openAuth} onOpenCheckout={openCheckout} />
      case 'subscriptions': return <SubscriptionsPage onNavigate={navigate} onOpenAuth={openAuth} onOpenProfile={openProfile} />
      case 'following': return <FollowingPage onNavigate={navigate} onOpenAuth={openAuth} onPlayItem={openWatch} onOpenPic={openPic} onOpenProfile={openProfile} />
      case 'playlists': return <PlaylistsPage onNavigate={navigate} onOpenAuth={openAuth} onPlayItem={openWatch} onOpenPic={openPic} playlistId={routeId} />
      case 'community': return <CommunityPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'studio-tools': return <StudioToolsPage onNavigate={navigate} />
      case 'calabi-studio': return <CalabiStudioPage onNavigate={navigate} onOpenAuth={openAuth} initialMode={routeId || 'edit'} />
      case 'settings': return <SettingsHub section={routeId} onNavigate={navigate} initialTab={routeParams.tab} />
      case 'explore': return <ExplorePage onPlayItem={openWatch} onOpenPic={openPic} onOpenTag={openTag} initialQuery={searchQuery} onApplyQuery={setSearchQuery} />
      case 'pics': return <PicsPage onOpenAuth={openAuth} onOpenProfile={openProfile} initialPicId={routeId} />
      case 'checkout': return <CheckoutPage onNavigate={navigate} creatorId={checkoutTarget.id} returnParams={routeParams} />
      case 'creator-apply': return <CreatorApplyPage onOpenAuth={openAuth} onNavigate={navigate} />
      case 'verify':
        return (
          <CreatorStudio
            onOpenImport={openImport}
            onOpenUpload={openUpload}
            onNavigate={navigate}
            onPlayItem={openWatch}
            onOpenAuth={openAuth}
            initialSection="verify"
          />
        )
      case 'advertise': return <AdvertisePage onNavigate={navigate} />
      case 'advertiser-portal': return <AdvertiserPortal onNavigate={navigate} />
      case 'support': return <SupportPage onOpenAuth={openAuth} />
      case 'news': return <NewsPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'shop':
      case 'marketplace':
        return <ShopPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'seller':
      case 'seller-portal':
        return <SellerPortal onNavigate={navigate} onOpenAuth={openAuth} />
      case 'admin': return null
      case 'content-rules': return <ContentRulesPage />
      case 'history': return <HistoryPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'watch-again': return <WatchAgainPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'hearts': return <HeartsPage onNavigate={navigate} onOpenPic={openPic} />
      case 'liked': return <LikedPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'watch-later': return <WatchLaterPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'stats': return <StatsPage onNavigate={navigate} />
      case 'api': return <BubbleApiPage onNavigate={navigate} />
      case 'library': return <LibraryPage />
      case 'help': return <HelpPage />
      case 'about': return <AboutPage />
      case 'notifications': return <NotificationsPage onNavigate={navigate} onOpenWatch={openWatch} />
      case 'messages':
        return (
          <MessagesPage
            onNavigate={navigate}
            onOpenAuth={openAuth}
            initialPeerId={routeParams.u || routeId || ''}
            initialPeerHandle={routeParams.h || ''}
          />
        )
      case 'appeals':
        return <AppealsPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'rewards':
        // Rewards removed — send old links to Wallet
        return <WalletSettings onNavigate={navigate} onOpenAuth={openAuth} />
      case 'create': return <CreatePage onCreate={openCreate} onOpenAuth={openAuth} onNavigate={navigate} />
      case 'legal-tos': return <TermsOfService />
      case 'legal-privacy': return <PrivacyPolicy />
      case 'legal-creator': return <CreatorAgreement />
      case 'legal-community': return <CommunityGuidelines />
      default: return <NotFoundPage onNavigate={navigate} />
    }
  }

  const isLiveView = view === 'live'
  // Immersive TailAdmin shells — hide Twitch site rail (dashboard pages have their own navy rail).
  const studioChrome = (
    view === 'dashboard'
    || view === 'analytics'
    || view === 'vods'
    || view === 'verify'
    || view === 'wallet'
    || view === 'calabi-cash'
    || view === 'rewards'
    || view === 'settings'
    || view === 'appeals'
    || view === 'messages'
    || view === 'subscriptions'
    || view === 'admin'
  )
  const lockStage = view === 'clips' || view === 'shorts' || view === 'pics' || studioChrome

  // Always bound to the viewport. Inside Next's fixed SpaShell overlay, min-h-screen
  // grows with content and main never overflows — home/explore cannot scroll.
  return (
    <div className="h-dvh overflow-hidden bg-[#000000] text-zinc-100 flex flex-col selection:bg-white selection:text-black">
      <ToastLiveRegion />
      <StreamingNavbar
        onNavigate={navigate}
        onOpenAuth={openAuth}
        onOpenWatch={openWatch}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q)
          setView('explore')
          goPath('explore', '', q?.trim() ? { q: q.trim() } : null)
        }}
      />
      <EnvConfigBanner />
      <PromoBanner onNavigate={navigate} onOpenWatch={openWatch} />

      <div className="flex flex-1 min-h-0 relative">
        {!studioChrome ? (
          <CollapsibleSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentView={view}
            onNavigate={navigate}
            onSelectLiveStream={selectLiveStreamFromSidebar}
            focusedStreamUserId={focusedLiveStream?.userId}
          />
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-h-0 min-w-0 bg-[#000000] ${lockStage ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading…</div>}>
            {renderMain()}
          </Suspense>
        </main>

        {isLiveView && (
          <LiveChatPanel
            channel={focusedLiveStream}
            collapsed={chatCollapsed}
            onToggleCollapse={toggleChat}
            mobileOpen={mobileChatOpen}
            onMobileClose={() => setMobileChatOpen(false)}
            onOpenAuth={openAuth}
          />
        )}
      </div>

      <ImportShortModal open={importOpen} onClose={() => setImportOpen(false)} onOpenAuth={openAuth} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {mfaPending ? <MfaGate /> : null}
      {passwordRecovery ? <PasswordRecoveryGate /> : null}
      <UploadModal
        key={`${uploadKind}-${uploadSound?.id || 'none'}-${uploadStitch?.id || 'none'}`}
        open={uploadOpen}
        initialKind={uploadKind}
        initialSound={uploadSound}
        initialStitch={uploadStitch}
        onClose={() => { setUploadOpen(false); setUploadSound(null); setUploadStitch(null) }}
        onOpenAuth={openAuth}
      />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} creatorId={checkoutTarget.id} creatorHandle={checkoutTarget.handle} />
      {miniItem && view !== 'watch' && (
        <MiniPlayer
          item={miniItem}
          onExpand={() => openWatch(miniItem)}
          onClose={() => setMiniItem(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  )
}
