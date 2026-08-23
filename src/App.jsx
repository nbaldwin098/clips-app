import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import StreamingNavbar from './components/StreamingNavbar'
import CollapsibleSidebar from './components/CollapsibleSidebar'
import StreamMainArea from './components/StreamMainArea'
import LiveChatPanel from './components/LiveChatPanel'
import CategoriesView from './components/CategoriesView'
import ShortsFeed from './components/ShortsFeed'
import CreatorDashboard from './components/CreatorDashboard'
import CreatorWallet from './components/CreatorWallet'
import SettingsPage from './components/SettingsPage'
import LibraryPage from './components/LibraryPage'
import HelpPage from './components/HelpPage'
import AboutPage from './components/AboutPage'
import NotificationsPage from './components/NotificationsPage'
import NotFoundPage from './components/NotFoundPage'
import AuthRequired from './components/AuthRequired'
import ImportShortModal from './components/ImportShortModal'
import AuthModal from './components/AuthModal'
import UploadModal from './components/UploadModal'
import CheckoutModal from './components/CheckoutModal'
import ChannelPage from './components/ChannelPage'
import ProfilePage from './components/ProfilePage'
import {
  TermsOfService, PrivacyPolicy, CreatorAgreement, CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'
import { lsGet, lsSet } from './lib/storage'
import { MOCK_CHANNELS } from './data/mockStreamData'

const KNOWN_VIEWS = new Set([
  'home', 'live', 'explore', 'categories', 'clips', 'shorts', 'dashboard', 'wallet', 'settings',
  'history', 'liked', 'watch-later', 'library', 'help', 'about',
  'notifications', 'sounds', 'checkout', 'creator-apply', 'support', 'admin',
  'analytics', 'channel', 'profile', 'subscriptions',
  'legal-tos', 'legal-privacy', 'legal-creator', 'legal-community',
])

function StreamingAppShell() {
  const { user, isAuthenticated } = useAuth()

  const [view, setView] = useState('home')
  const [channels] = useState(MOCK_CHANNELS)
  const [currentChannel, setCurrentChannel] = useState(MOCK_CHANNELS[0])
  const [searchQuery, setSearchQuery] = useState('')

  // Sidebar & Chat collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => lsGet('sidebar_collapsed', false) === true)
  const [chatCollapsed, setChatCollapsed] = useState(() => lsGet('chat_collapsed', false) === true)

  // Mobile Drawers
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // Modal dialog states
  const [importOpen, setImportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutTarget] = useState({ id: null, handle: '' })
  const [profileTarget, setProfileTarget] = useState({ handle: '', userId: null })

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
  const openProfile = (handle, userId = null) => {
    setProfileTarget({ handle: String(handle || '').replace(/^@/, ''), userId })
    setView('profile')
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }
  if (typeof window !== 'undefined') window.__clipsOpenProfile = openProfile

  const navigate = (next) => {
    try {
      const id = next === 'shorts' ? 'clips' : String(next || 'home')
      setView(id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setView('home')
    }
  }

  const handleSelectChannel = (channel) => {
    setCurrentChannel(channel)
    if (view !== 'home' && view !== 'live') {
      setView('home')
    }
  }

  const toggleSidebar = () => {
    // If mobile, toggle drawer; if desktop, toggle collapsed width
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

  const renderMainContent = () => {
    if (!KNOWN_VIEWS.has(view)) return <NotFoundPage onNavigate={navigate} />

    if (view === 'dashboard' && !isAuthenticated)
      return <AuthRequired title="Creator Studio" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'wallet' && !isAuthenticated)
      return <AuthRequired title="Wallet" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'settings' && !isAuthenticated)
      return <AuthRequired title="Settings" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'channel' && !isAuthenticated)
      return <AuthRequired title="Channel" description="Sign in." onOpenAuth={openAuth} />

    switch (view) {
      case 'home':
      case 'live':
        return (
          <StreamMainArea
            currentChannel={currentChannel}
            channels={channels}
            onSelectChannel={handleSelectChannel}
            onOpenMobileChat={() => setMobileChatOpen(true)}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            searchQuery={searchQuery}
          />
        )
      case 'explore':
      case 'categories':
        return <CategoriesView onSelectChannel={handleSelectChannel} />
      case 'clips':
      case 'shorts':
        return <ShortsFeed />
      case 'dashboard':
        return <CreatorDashboard onOpenImport={openImport} onOpenUpload={openUpload} onNavigate={navigate} />
      case 'wallet':
        return <CreatorWallet onNavigate={navigate} />
      case 'channel':
        return <ChannelPage onNavigate={navigate} />
      case 'profile':
        return <ProfilePage onNavigate={navigate} profileHandle={profileTarget.handle} profileUserId={profileTarget.userId} />
      case 'settings':
        return <SettingsPage onNavigate={navigate} />
      case 'library':
      case 'history':
        return <LibraryPage initialTab={view === 'history' ? 'history' : 'history'} />
      case 'liked':
        return <LibraryPage initialTab="liked" />
      case 'watch-later':
        return <LibraryPage initialTab="saved" />
      case 'notifications':
        return <NotificationsPage />
      case 'about':
        return <AboutPage />
      case 'help':
        return <HelpPage />
      case 'legal-tos':
        return <TermsOfService />
      case 'legal-privacy':
        return <PrivacyPolicy />
      case 'legal-creator':
        return <CreatorAgreement />
      case 'legal-community':
        return <CommunityGuidelines />
      default:
        return (
          <StreamMainArea
            currentChannel={currentChannel}
            channels={channels}
            onSelectChannel={handleSelectChannel}
            onOpenMobileChat={() => setMobileChatOpen(true)}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            searchQuery={searchQuery}
          />
        )
    }
  }

  const isLiveStreamView = view === 'home' || view === 'live'

  return (
    <div className="min-h-screen bg-[#09090c] text-zinc-100 flex flex-col selection:bg-[var(--color-accent-primary)] selection:text-black">
      {/* 1. Fixed Top Navbar */}
      <StreamingNavbar
        onNavigate={navigate}
        onOpenAuth={openAuth}
        onOpenUpload={openUpload}
        onToggleSidebar={toggleSidebar}
        currentView={view}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Core 3-Column Responsive Layout: Collapsible Sidebar + Main Content + Fixed Right Chat */}
      <div className="flex flex-1 min-h-0 relative">
        
        {/* 2. Collapsible Left Sidebar for Channel Lists */}
        <CollapsibleSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          currentChannelId={currentChannel?.id}
          onSelectChannel={handleSelectChannel}
          channels={channels}
          currentView={view}
          onNavigate={navigate}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* 3. Main Content Area featuring Video Player Aspect Ratio Box */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-[#09090c]">
          {renderMainContent()}
        </main>

        {/* 4. Fixed Right-Side Panel for Live Chat Feed (Twitch/Kick style) */}
        {isLiveStreamView && (
          <LiveChatPanel
            channel={currentChannel}
            collapsed={chatCollapsed}
            onToggleCollapse={toggleChat}
            mobileOpen={mobileChatOpen}
            onMobileClose={() => setMobileChatOpen(false)}
          />
        )}
      </div>

      {/* Global Modals */}
      <ImportShortModal open={importOpen} onClose={() => setImportOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} creatorId={checkoutTarget.id} creatorHandle={checkoutTarget.handle} />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <StreamingAppShell />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
