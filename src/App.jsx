import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import HomeFeed from './components/HomeFeed'
import ShortsFeed from './components/ShortsFeed'
import LiveView from './components/LiveView'
import CreatorDashboard from './components/CreatorDashboard'
import CreatorWallet from './components/CreatorWallet'
import SettingsPage from './components/SettingsPage'
import LibraryPage from './components/LibraryPage'
import ExplorePage from './components/ExplorePage'
import HelpPage from './components/HelpPage'
import AboutPage from './components/AboutPage'
import NotificationsPage from './components/NotificationsPage'
import NotFoundPage from './components/NotFoundPage'
import AuthRequired from './components/AuthRequired'
import ImportShortModal from './components/ImportShortModal'
import AuthModal from './components/AuthModal'
import UploadModal from './components/UploadModal'
import SoundsPage from './components/SoundsPage'
import CheckoutPage from './components/CheckoutPage'
import CreatorApplyPage from './components/CreatorApplyPage'
import SupportPage from './components/SupportPage'
import AdminPortal from './components/AdminPortal'
import CreatorsPage from './components/CreatorsPage'
import AnalyticsPage from './components/AnalyticsPage'
import ChannelPage from './components/ChannelPage'
import SubscriptionsPage from './components/SubscriptionsPage'
import {
  TermsOfService, PrivacyPolicy, CreatorAgreement, CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'
import { lsGet, lsSet } from './lib/storage'

const KNOWN_VIEWS = new Set([
  'home', 'creators', 'clips', 'shorts', 'live', 'dashboard', 'wallet', 'settings',
  'explore', 'history', 'liked', 'watch-later', 'library', 'help', 'about',
  'notifications', 'sounds', 'checkout', 'creator-apply', 'support', 'admin',
  'analytics', 'channel', 'subscriptions',
  'legal-tos', 'legal-privacy', 'legal-creator', 'legal-community',
])

function AppShell() {
  const { user, isAuthenticated } = useAuth()
  const [view, setView] = useState('home')
  const [importOpen, setImportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => lsGet('sidebar_open', true) !== false)

  useEffect(() => {
    if (isAuthenticated && user?.id) startSession(user.id)
  }, [isAuthenticated, user?.id])

  const openAuth = () => setAuthOpen(true)
  const openImport = () => { if (!isAuthenticated) { setAuthOpen(true); return }; setImportOpen(true) }
  const openUpload = () => { if (!isAuthenticated) { setAuthOpen(true); return }; setUploadOpen(true) }
  const navigate = (next) => {
    setView(next === 'shorts' ? 'clips' : next)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }

  const lockedCreator = (v) =>
    (v === 'dashboard' || v === 'wallet' || v === 'analytics') &&
    isAuthenticated && user?.creatorStatus !== 'approved'

  const renderMain = () => {
    if (!KNOWN_VIEWS.has(view)) return <NotFoundPage onNavigate={navigate} />
    if (lockedCreator(view)) {
      return (
        <div className="p-8 max-w-md mx-auto text-center">
          <p className="text-sm text-zinc-200 font-medium">Creator tools locked</p>
          <p className="text-xs text-zinc-500 mt-2">Apply and wait for admin approval.</p>
          <button type="button" onClick={() => navigate('creator-apply')} className="mt-4 h-10 px-4 rounded-lg bg-[#007ACC] text-white text-sm">Apply to create</button>
          <button type="button" onClick={() => navigate('home')} className="mt-3 block mx-auto text-xs text-[#007ACC]">← Back to Recommended</button>
        </div>
      )
    }
    if (view === 'dashboard' && !isAuthenticated) return <AuthRequired title="Creator Studio" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'wallet' && !isAuthenticated) return <AuthRequired title="Wallet" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'settings' && !isAuthenticated) return <AuthRequired title="Settings" description="Sign in." onOpenAuth={openAuth} />
    if (view === 'channel' && !isAuthenticated) return <AuthRequired title="Channel" description="Sign in." onOpenAuth={openAuth} />

    switch (view) {
      case 'home': return <HomeFeed />
      case 'creators': return <CreatorsPage />
      case 'subscriptions': return <SubscriptionsPage onNavigate={navigate} onOpenAuth={openAuth} />
      case 'clips':
      case 'shorts': return <ShortsFeed />
      case 'live': return <LiveView onNavigate={navigate} onOpenAuth={openAuth} />
      case 'dashboard': return <CreatorDashboard onOpenImport={openImport} onOpenUpload={openUpload} onNavigate={navigate} />
      case 'wallet': return <CreatorWallet onNavigate={navigate} />
      case 'analytics': return <AnalyticsPage onNavigate={navigate} />
      case 'channel': return <ChannelPage onNavigate={navigate} />
      case 'settings': return <SettingsPage onNavigate={navigate} />
      case 'explore': return <ExplorePage />
      case 'sounds': return <SoundsPage onOpenAuth={openAuth} />
      case 'checkout': return <CheckoutPage onNavigate={navigate} />
      case 'creator-apply': return <CreatorApplyPage onOpenAuth={openAuth} />
      case 'support': return <SupportPage onOpenAuth={openAuth} />
      case 'admin': return <AdminPortal />
      case 'history': return <LibraryPage initialTab="history" />
      case 'liked': return <LibraryPage initialTab="liked" />
      case 'watch-later': return <LibraryPage initialTab="saved" />
      case 'library': return <LibraryPage />
      case 'help': return <HelpPage />
      case 'about': return <AboutPage />
      case 'notifications': return <NotificationsPage />
      case 'legal-tos': return <TermsOfService />
      case 'legal-privacy': return <PrivacyPolicy />
      case 'legal-creator': return <CreatorAgreement />
      case 'legal-community': return <CommunityGuidelines />
      default: return <NotFoundPage onNavigate={navigate} />
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100 flex flex-col">
      <Navbar onNavigate={navigate} onOpenAuth={openAuth} onOpenUpload={openUpload} onToggleSidebar={() => setSidebarOpen((s) => { const n = !s; lsSet('sidebar_open', n); return n })} />
      <div className="flex flex-1 min-h-0">
        <Sidebar currentView={view} onNavigate={navigate} open={sidebarOpen} onClose={() => { lsSet('sidebar_open', false); setSidebarOpen(false) }} />
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#0b0b0f]">{renderMain()}</main>
      </div>
      <ImportShortModal open={importOpen} onClose={() => setImportOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
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
