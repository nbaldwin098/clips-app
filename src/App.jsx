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
import VideoPlayerModal from './components/VideoPlayerModal'
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
import {
  TermsOfService, PrivacyPolicy, CreatorAgreement, CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'
import { lsGet, lsSet } from './lib/storage'

const KNOWN_VIEWS = new Set([
  'home', 'creators', 'clips', 'shorts', 'live', 'dashboard', 'wallet', 'settings',
  'explore', 'history', 'liked', 'watch-later', 'library', 'stats', 'help', 'about',
  'notifications', 'pics', 'checkout', 'creator-apply', 'advertise', 'advertiser-portal', 'support', 'admin',
  'analytics', 'channel', 'profile', 'content-rules',
  'subscriptions', 'playlists', 'community', 'studio-tools', 'stream-settings',
  'legal-tos', 'legal-privacy', 'legal-creator', 'legal-community',
])

function AppShell() {
  const { user, isAuthenticated } = useAuth()
  const [view, setView] = useState('home')
  const [importOpen, setImportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutTarget, setCheckoutTarget] = useState({ id: null, handle: '' })
  const [profileTarget, setProfileTarget] = useState({ handle: '', userId: null })
  const [activePlayItem, setActivePlayItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => lsGet('sidebar_collapsed', false) === true)
  const [chatCollapsed, setChatCollapsed] = useState(() => lsGet('chat_collapsed', false) === true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [focusedLiveStream, setFocusedLiveStream] = useState(null)

  useEffect(() => {
    if (isAuthenticated && user?.id) startSession(user.id)
  }, [isAuthenticated, user?.id])

  const openAuth = () => setAuthOpen(true)
  const openImport = () => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setImportOpen(true)
  }
  const openUpload = () => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setUploadOpen(true)
  }
  const openCreate = (kind) => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    if (kind === 'video') {
      setUploadOpen(true)
      return
    }
    if (kind === 'clip') {
      setImportOpen(true)
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
    setProfileTarget({ handle: String(handle || '').replace(/^@/, ''), userId })
    setView('profile')
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }
  if (typeof window !== 'undefined') window.__clipsOpenProfile = openProfile
  const openCheckout = (creatorId, creatorHandle) => {
    if (!isAuthenticated) { setAuthOpen(true); return }
    setCheckoutTarget({ id: creatorId || null, handle: creatorHandle || '' })
    setCheckoutOpen(true)
  }
  const navigate = (next) => {
    try {
      const id = next === 'shorts' ? 'clips' : String(next || 'home')
      setView(id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setView('home')
    }
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

    switch (view) {
      case 'home': return <HomeFeed onPlayItem={setActivePlayItem} />
      case 'creators': return <CreatorsPage />
      case 'clips':
      case 'shorts': return <ShortsFeed onPlayItem={setActivePlayItem} />
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
      case 'profile': return <ProfilePage onNavigate={navigate} profileHandle={profileTarget.handle} profileUserId={profileTarget.userId} onPlayItem={setActivePlayItem} />
      case 'subscriptions': return <SubscriptionsPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'playlists': return <PlaylistsPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'community': return <CommunityPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'studio-tools': return <StudioToolsPage onNavigate={navigate} />
      case 'stream-settings': return <StreamSettingsPage onNavigate={navigate} />
      case 'settings': return <SettingsPage onNavigate={navigate} />
      case 'explore': return <ExplorePage onPlayItem={setActivePlayItem} />
      case 'pics': return <PicsPage onOpenAuth={openAuth} />
      case 'checkout': return <CheckoutPage onNavigate={navigate} creatorId={checkoutTarget.id} />
      case 'creator-apply': return <CreatorApplyPage onOpenAuth={openAuth} />
      case 'advertise': return <AdvertisePage onNavigate={navigate} />
      case 'advertiser-portal': return <AdvertiserPortal onNavigate={navigate} />
      case 'support': return <SupportPage onOpenAuth={openAuth} />
      case 'admin': return <AdminPortal onNavigate={navigate} />
      case 'content-rules': return <ContentRulesPage />
      case 'history': return <HistoryPage onNavigate={navigate} onPlayItem={setActivePlayItem} />
      case 'liked': return <LikedPage onNavigate={navigate} onPlayItem={setActivePlayItem} />
      case 'watch-later': return <WatchLaterPage onNavigate={navigate} onPlayItem={setActivePlayItem} />
      case 'stats': return <StatsPage onNavigate={navigate} />
      case 'library': return <LibraryPage />
      case 'help': return <HelpPage />
      case 'about': return <AboutPage />
      case 'notifications': return <NotificationsPage onNavigate={navigate} />
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
        onSearchChange={setSearchQuery}
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
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onOpenAuth={openAuth} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} creatorId={checkoutTarget.id} creatorHandle={checkoutTarget.handle} />
      {activePlayItem && (
        <VideoPlayerModal item={activePlayItem} onClose={() => setActivePlayItem(null)} />
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
