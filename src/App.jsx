import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import StreamingNavbar from './components/StreamingNavbar'
import CollapsibleSidebar from './components/CollapsibleSidebar'
import LiveChatPanel from './components/LiveChatPanel'
import HomeFeed from './components/HomeFeed'
import ShortsFeed from './components/ShortsFeed'
import LiveView from './components/LiveView'
import CreatorStudio from './components/studio/CreatorStudio'
import SettingsHub from './components/settings/SettingsHub'
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
import AdvertiserPortal from './components/AdvertiserPortal'
import SupportPage from './components/SupportPage'
import AdminPortal from './components/AdminPortal'
import CreatorsPage from './components/CreatorsPage'
import ChannelPage from './components/ChannelPage'
import ProfilePage from './components/ProfilePage'
import SubscriptionsPage from './components/SubscriptionsPage'
import PlaylistsPage from './components/PlaylistsPage'
import CommunityPage from './components/CommunityPage'
import StudioToolsPage from './components/StudioToolsPage'
import StreamSettingsPage from './components/StreamSettingsPage'
import ContentRulesPage from './components/ContentRulesPage'
import WatchPage from './components/WatchPage'
import CreatePage from './components/CreatePage'
import SoundPage from './components/SoundPage'
import TagPage from './components/TagPage'
import MiniPlayer from './components/MiniPlayer'
import {
  TermsOfService, PrivacyPolicy, CreatorAgreement, CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'
import { lsGet, lsSet } from './lib/storage'
import { syncContentFromCloud, notifyContentChanged } from './lib/contentSync'
import { setGraphActor, syncGraphFromCloud, syncPublicEngagementFromCloud } from './lib/graphSync'
import { installRuntimeGuards } from './lib/selfHeal'
import { pushLibraryCatalogToCloud } from './data/publicMediaSeed'
import { isAdminSession } from './lib/moderation'
import { getById, getWatchItem, stashWatchItem, flushScheduledPublishes, resolvePublicCreator } from './lib/contentService'
import { parseRoute, pushHash, migrateHashToPath } from './lib/routes'
import { syncPromotionsFromCloud } from './lib/promotions'
import PromoBanner from './components/PromoBanner'
import { claimStripeReturn } from './lib/tips'
import { membershipReturnPaid } from './lib/stripeConfig'
import { isOwnerAccount } from './data/ownerLogin'

const KNOWN_VIEWS = new Set([
  'home', 'creators', 'clips', 'shorts', 'live', 'dashboard', 'wallet', 'settings',
  'explore', 'history', 'watch-again', 'hearts', 'liked', 'watch-later', 'library', 'stats', 'help', 'about',
  'notifications', 'pics', 'checkout', 'creator-apply', 'verify', 'advertise', 'advertiser-portal', 'support', 'admin',
  'analytics', 'channel', 'profile', 'content-rules', 'vods',
  'subscriptions', 'playlists', 'community', 'studio-tools', 'stream-settings',
  'legal-tos', 'legal-privacy', 'legal-creator', 'legal-community',
  'watch', 'sound', 'tag', 'create',
])

function AppShell() {
  const { user, isAuthenticated, mfaPending, passwordRecovery } = useAuth()
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
    if (isAuthenticated && user?.id) startSession(user.id)
    setGraphActor(user?.provider === 'supabase' ? user : null)
    if (user?.provider === 'supabase') syncGraphFromCloud().catch(() => {})
  }, [isAuthenticated, user?.id, user?.provider])

  useEffect(() => installRuntimeGuards(), [])

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
    const pull = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      syncContentFromCloud(user)
      flushScheduledPublishes()
      syncPromotionsFromCloud()
      syncGraphFromCloud().catch(() => {})
      syncPublicEngagementFromCloud().catch(() => {})
    }
    pull()
    if (isOwnerAccount(user)) pushLibraryCatalogToCloud().catch(() => {})
    const intervalMs = user?.id ? 90_000 : 180_000
    const interval = setInterval(pull, intervalMs)
    const onFocus = () => pull()
    const onVis = () => { if (document.visibilityState === 'visible') pull() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [user])

  const applyRoute = () => {
    const { kind, id, params } = parseRoute()
    setRouteParams(params || {})
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
    if (KNOWN_VIEWS.has(kind)) {
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

  const dockWatchIfNeeded = (leavingWatch) => {
    if (!leavingWatch) return
    const current = getWatchItem(routeId)
    if (current?.type === 'video') setMiniItem(current)
  }

  const navigate = (next, id = '') => {
    try {
      const dest = next === 'shorts' ? 'clips' : String(next || 'home')
      setSidebarOpen(false)
      dockWatchIfNeeded(view === 'watch' && dest !== 'watch')
      setView(dest)
      const nextId = dest === 'profile' ? (id || profileTarget.handle) : id
      setRouteId(nextId || '')
      if (dest === 'profile') {
        const uid = profileTarget.userId
        pushHash('profile', nextId, uid ? { u: uid } : null)
      } else {
        pushHash(dest, nextId)
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
    setRouteId(item.id)
    setView('watch')
    pushHash('watch', item.id)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }

  const openSound = (key) => {
    dockWatchIfNeeded(view === 'watch')
    const id = String(key || '')
    setRouteId(id)
    setView('sound')
    pushHash('sound', id)
  }

  const openTag = (tag) => {
    dockWatchIfNeeded(view === 'watch')
    const id = String(tag || '').replace(/^#/, '')
    setRouteId(id)
    setView('tag')
    pushHash('tag', id)
  }

  const openPic = (pic) => {
    const id = typeof pic === 'string' ? pic : pic?.id
    if (!id) return
    setRouteId(id)
    setView('pics')
    pushHash('pic', id)
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
    pushHash('profile', h || found?.handle || '', (found?.id || userId) ? { u: found?.id || userId } : null)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }
  if (typeof window !== 'undefined') {
    window.__clipsOpenProfile = openProfile
    window.__clipsOpenSound = openSound
    window.__clipsOpenTag = openTag
    window.__clipsOpenWatch = openWatch
  }
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

  const toggleSidebar = () => setSidebarOpen((v) => !v)

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
    if (view === 'dashboard' && !isAuthenticated)
      return <AuthRequired title="Creator Studio" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'wallet' && !isAuthenticated)
      return <AuthRequired title="Wallet" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'settings' && !isAuthenticated)
      return <AuthRequired title="Settings" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'channel' && !isAuthenticated)
      return <AuthRequired title="Channel" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'analytics' && !isAuthenticated)
      return <AuthRequired title="Analytics" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'studio-tools' && !isAuthenticated)
      return <AuthRequired title="Studio" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'vods' && !isAuthenticated)
      return <AuthRequired title="VODs" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'admin' && !isAdminSession(user))
      return <AdminPortal onNavigate={navigate} />

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
        return <TagPage tag={routeId} onNavigate={navigate} onPlayItem={openWatch} />
      case 'live':
        return (
          <LiveView
            onOpenCheckout={openCheckout}
            focusedStream={focusedLiveStream}
            onFocusStream={focusLiveStream}
            onOpenAuth={openAuth}
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
        return (
          <CreatorStudio
            onOpenImport={openImport}
            onOpenUpload={openUpload}
            onNavigate={navigate}
            onPlayItem={openWatch}
            onOpenAuth={openAuth}
            initialSection="wallet"
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
      case 'subscriptions': return <SubscriptionsPage onNavigate={navigate} onOpenAuth={openAuth} onPlayItem={openWatch} onOpenPic={openPic} onOpenProfile={openProfile} />
      case 'playlists': return <PlaylistsPage onNavigate={navigate} onOpenAuth={openAuth} onPlayItem={openWatch} onOpenPic={openPic} playlistId={routeId} />
      case 'community': return <CommunityPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'studio-tools': return <StudioToolsPage onNavigate={navigate} />
      case 'stream-settings': return <StreamSettingsPage onNavigate={navigate} />
      case 'settings': return <SettingsHub section={routeId} onNavigate={navigate} />
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
      case 'admin': return <AdminPortal onNavigate={navigate} />
      case 'content-rules': return <ContentRulesPage />
      case 'history': return <HistoryPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'watch-again': return <WatchAgainPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'hearts': return <HeartsPage onNavigate={navigate} onOpenPic={openPic} />
      case 'liked': return <LikedPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'watch-later': return <WatchLaterPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'stats': return <StatsPage onNavigate={navigate} />
      case 'library': return <LibraryPage />
      case 'help': return <HelpPage />
      case 'about': return <AboutPage />
      case 'notifications': return <NotificationsPage onNavigate={navigate} onOpenWatch={openWatch} />
      case 'create': return <CreatePage onCreate={openCreate} onOpenAuth={openAuth} onNavigate={navigate} />
      case 'legal-tos': return <TermsOfService />
      case 'legal-privacy': return <PrivacyPolicy />
      case 'legal-creator': return <CreatorAgreement />
      case 'legal-community': return <CommunityGuidelines />
      default: return <NotFoundPage onNavigate={navigate} />
    }
  }

  const isLiveView = view === 'live'
  const isCreatorStudio =
    view === 'dashboard' || view === 'analytics' || view === 'wallet' || view === 'vods' || view === 'verify'
  const lockStage = view === 'clips' || view === 'shorts' || view === 'pics' || isCreatorStudio

  return (
    <div className={`${lockStage ? 'h-dvh overflow-hidden' : 'min-h-screen'} bg-[#000000] text-zinc-100 flex flex-col selection:bg-white selection:text-black`}>
      <StreamingNavbar
        onNavigate={navigate}
        onOpenAuth={openAuth}
        onToggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
        onOpenWatch={openWatch}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q)
          if (view !== 'explore') navigate('explore')
        }}
      />
      <PromoBanner onNavigate={navigate} onOpenWatch={openWatch} />

      <div className="flex flex-1 min-h-0 relative">
        <CollapsibleSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={view}
          onNavigate={navigate}
          onSelectLiveStream={selectLiveStreamFromSidebar}
          focusedStreamUserId={focusedLiveStream?.userId}
        />

        <main className={`flex-1 min-h-0 min-w-0 ${isCreatorStudio ? 'bg-white' : 'bg-[#000000]'} ${lockStage ? 'overflow-hidden' : 'overflow-y-auto'}`}>{renderMain()}</main>

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

      <ImportShortModal open={importOpen} onClose={() => setImportOpen(false)} />
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
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  )
}
