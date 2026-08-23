import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import StreamingNavbar from './components/StreamingNavbar'
import CollapsibleSidebar from './components/CollapsibleSidebar'
import LiveChatPanel from './components/LiveChatPanel'
import HomeFeed from './components/HomeFeed'
import ShortsFeed from './components/ShortsFeed'
import LiveView from './components/LiveView'
import CreatorDashboard from './components/CreatorDashboard'
import CreatorWallet from './components/CreatorWallet'
import SettingsPage from './components/SettingsPage'
import LibraryPage from './components/LibraryPage'
import HistoryPage from './components/HistoryPage'
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
import AnalyticsPage from './components/AnalyticsPage'
import ChannelPage from './components/ChannelPage'
import ProfilePage from './components/ProfilePage'
import SubscriptionsPage from './components/SubscriptionsPage'
import PlaylistsPage from './components/PlaylistsPage'
import CommunityPage from './components/CommunityPage'
import StudioToolsPage from './components/StudioToolsPage'
import StreamSettingsPage from './components/StreamSettingsPage'
import ContentRulesPage from './components/ContentRulesPage'
import WatchPage from './components/WatchPage'
import SoundPage from './components/SoundPage'
import TagPage from './components/TagPage'
import MiniPlayer from './components/MiniPlayer'
import {
  TermsOfService, PrivacyPolicy, CreatorAgreement, CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'
import { lsGet, lsSet } from './lib/storage'
import { syncContentFromCloud } from './lib/contentSync'
import { installRuntimeGuards } from './lib/selfHeal'
import { isAdminSession } from './lib/moderation'
import { getById } from './lib/contentService'
import { parseRoute, pushHash } from './lib/routes'

const KNOWN_VIEWS = new Set([
  'home', 'creators', 'clips', 'shorts', 'live', 'dashboard', 'wallet', 'settings',
  'explore', 'history', 'liked', 'watch-later', 'library', 'stats', 'help', 'about',
  'notifications', 'pics', 'checkout', 'creator-apply', 'advertise', 'advertiser-portal', 'support', 'admin',
  'analytics', 'channel', 'profile', 'content-rules',
  'subscriptions', 'playlists', 'community', 'studio-tools', 'stream-settings',
  'legal-tos', 'legal-privacy', 'legal-creator', 'legal-community',
  'watch', 'sound', 'tag',
])

function AppShell() {
  const { user, isAuthenticated } = useAuth()
  const [view, setView] = useState('home')
  const [routeId, setRouteId] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadKind, setUploadKind] = useState('video')
  const [uploadSound, setUploadSound] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutTarget, setCheckoutTarget] = useState({ id: null, handle: '' })
  const [profileTarget, setProfileTarget] = useState({ handle: '', userId: null })
  const [searchQuery, setSearchQuery] = useState('')
  const [miniItem, setMiniItem] = useState(null)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => lsGet('sidebar_collapsed', false) === true)
  const [chatCollapsed, setChatCollapsed] = useState(() => lsGet('chat_collapsed', false) === true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [focusedLiveStream, setFocusedLiveStream] = useState(null)

  useEffect(() => {
    if (isAuthenticated && user?.id) startSession(user.id)
  }, [isAuthenticated, user?.id])

  useEffect(() => installRuntimeGuards(), [])

  useEffect(() => {
    syncContentFromCloud()
    const interval = setInterval(syncContentFromCloud, 45_000)
    const onFocus = () => syncContentFromCloud()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const applyRoute = (hash) => {
    const { kind, id } = parseRoute(hash)
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
      setProfileTarget({ handle: String(id || '').replace(/^@/, ''), userId: null })
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
    applyRoute(window.location.hash)
    const onPop = () => applyRoute(window.location.hash)
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [])

  const dockWatchIfNeeded = (leavingWatch) => {
    if (!leavingWatch) return
    const current = getById(routeId)
    if (current?.type === 'video') setMiniItem(current)
  }

  const navigate = (next, id = '') => {
    try {
      const dest = next === 'shorts' ? 'clips' : String(next || 'home')
      dockWatchIfNeeded(view === 'watch' && dest !== 'watch')
      setView(dest)
      const nextId = dest === 'profile' ? (id || profileTarget.handle) : id
      setRouteId(nextId || '')
      if (dest === 'profile') {
        pushHash('profile', nextId)
      } else {
        pushHash(dest, nextId)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setView('home')
    }
  }

  const openWatch = (itemOrId) => {
    const item = typeof itemOrId === 'string' ? getById(itemOrId) : itemOrId
    if (!item) return
    if (item.type === 'pic') {
      openPic(item)
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
      if (user?.creatorStatus !== 'approved') {
        navigate('creator-apply')
        return
      }
      navigate('live')
    }
  }
  const openProfile = (handle, userId = null) => {
    dockWatchIfNeeded(view === 'watch')
    setProfileTarget({ handle: String(handle || '').replace(/^@/, ''), userId })
    setView('profile')
    pushHash('profile', String(handle || '').replace(/^@/, ''))
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

  const focusLiveStream = (entry) => setFocusedLiveStream(entry)
  const selectLiveStreamFromSidebar = (entry) => {
    setFocusedLiveStream(entry)
    navigate('live')
  }

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileSidebarOpen((v) => !v)
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev
        lsSet('sidebar_collapsed', next)
        return next
      })
    }
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

  const lockedCreator = (v) =>
    (v === 'dashboard' || v === 'wallet' || v === 'analytics' || v === 'studio-tools' || v === 'stream-settings') &&
    isAuthenticated &&
    user?.creatorStatus !== 'approved'

  const renderMain = () => {
    if (!KNOWN_VIEWS.has(view)) return <NotFoundPage onNavigate={navigate} />
    if (lockedCreator(view)) {
      return (
        <div className="p-8 max-w-md mx-auto text-center">
          <p className="text-sm text-zinc-200 font-medium">Creator tools locked</p>
          <p className="text-xs text-zinc-500 mt-2">Apply and wait for admin approval.</p>
          <button type="button" onClick={() => navigate('creator-apply')} className="mt-4 h-10 px-4 rounded-lg bg-white text-black font-bold text-sm">Apply to create</button>
          <button type="button" onClick={() => navigate('home')} className="mt-3 block mx-auto text-xs text-white">← Back to Recommended</button>
        </div>
      )
    }
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
    if (view === 'stream-settings' && !isAuthenticated)
      return <AuthRequired title="Stream settings" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'admin' && !isAdminSession(user))
      return <AdminPortal onNavigate={navigate} />

    switch (view) {
      case 'home': return <HomeFeed onPlayItem={openWatch} onOpenPic={openPic} />
      case 'creators': return <CreatorsPage />
      case 'clips':
      case 'shorts':
        return (
          <ShortsFeed
            onOpenAuth={openAuth}
            onOpenProfile={openProfile}
            onOpenSound={openSound}
            focusId={routeId}
          />
        )
      case 'watch':
        return (
          <WatchPage
            itemId={routeId}
            onBack={() => navigate('home')}
            onPlayItem={openWatch}
            onOpenSound={openSound}
            onOpenTag={openTag}
            onOpenProfile={openProfile}
            onOpenAuth={openAuth}
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
          />
        )
      case 'dashboard': return <CreatorDashboard onOpenImport={openImport} onOpenUpload={openUpload} onNavigate={navigate} />
      case 'wallet': return <CreatorWallet onNavigate={navigate} />
      case 'analytics': return <AnalyticsPage onNavigate={navigate} />
      case 'channel': return <ChannelPage onNavigate={navigate} />
      case 'profile': return <ProfilePage onNavigate={navigate} profileHandle={profileTarget.handle} profileUserId={profileTarget.userId} onPlayItem={openWatch} onOpenPic={openPic} />
      case 'subscriptions': return <SubscriptionsPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'playlists': return <PlaylistsPage onNavigate={navigate} onOpenAuth={openAuth} onPlayItem={openWatch} onOpenPic={openPic} playlistId={routeId} />
      case 'community': return <CommunityPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'studio-tools': return <StudioToolsPage onNavigate={navigate} />
      case 'stream-settings': return <StreamSettingsPage onNavigate={navigate} />
      case 'settings': return <SettingsPage onNavigate={navigate} />
      case 'explore': return <ExplorePage onPlayItem={openWatch} onOpenPic={openPic} onOpenTag={openTag} initialQuery={searchQuery} />
      case 'pics': return <PicsPage onOpenAuth={openAuth} initialPicId={routeId} />
      case 'checkout': return <CheckoutPage onNavigate={navigate} creatorId={checkoutTarget.id} />
      case 'creator-apply': return <CreatorApplyPage onOpenAuth={openAuth} />
      case 'advertise': return <AdvertisePage onNavigate={navigate} />
      case 'advertiser-portal': return <AdvertiserPortal onNavigate={navigate} />
      case 'support': return <SupportPage onOpenAuth={openAuth} />
      case 'admin': return <AdminPortal onNavigate={navigate} />
      case 'content-rules': return <ContentRulesPage />
      case 'history': return <HistoryPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'liked': return <LikedPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'watch-later': return <WatchLaterPage onNavigate={navigate} onPlayItem={openWatch} />
      case 'stats': return <StatsPage onNavigate={navigate} />
      case 'library': return <LibraryPage />
      case 'help': return <HelpPage />
      case 'about': return <AboutPage />
      case 'notifications': return <NotificationsPage onNavigate={navigate} onOpenWatch={openWatch} />
      case 'legal-tos': return <TermsOfService />
      case 'legal-privacy': return <PrivacyPolicy />
      case 'legal-creator': return <CreatorAgreement />
      case 'legal-community': return <CommunityGuidelines />
      default: return <NotFoundPage onNavigate={navigate} />
    }
  }

  const isLiveView = view === 'live'

  return (
    <div className="min-h-screen bg-[#09090c] text-zinc-100 flex flex-col selection:bg-white selection:text-black">
      <StreamingNavbar
        onNavigate={navigate}
        onOpenAuth={openAuth}
        onCreate={openCreate}
        onToggleSidebar={toggleSidebar}
        currentView={view}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q)
          if (view !== 'explore') navigate('explore')
        }}
      />

      <div className="flex flex-1 min-h-0 relative">
        <CollapsibleSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          currentView={view}
          onNavigate={navigate}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          onSelectLiveStream={selectLiveStreamFromSidebar}
          focusedStreamUserId={focusedLiveStream?.userId}
        />

        <main className="flex-1 min-w-0 overflow-y-auto bg-[#09090c]">{renderMain()}</main>

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
      <UploadModal
        key={`${uploadKind}-${uploadSound?.id || 'none'}`}
        open={uploadOpen}
        initialKind={uploadKind}
        initialSound={uploadSound}
        onClose={() => { setUploadOpen(false); setUploadSound(null) }}
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
