import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
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
import {
  TermsOfService,
  PrivacyPolicy,
  CreatorAgreement,
  CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'

const KNOWN_VIEWS = new Set([
  'home',
  'clips',
  'shorts',
  'live',
  'dashboard',
  'wallet',
  'settings',
  'explore',
  'history',
  'liked',
  'watch-later',
  'library',
  'help',
  'about',
  'notifications',
  'sounds',
  'checkout',
  'legal-tos',
  'legal-privacy',
  'legal-creator',
  'legal-community',
])

function AppShell() {
  const { user, isAuthenticated } = useAuth()
  const [view, setView] = useState('home')
  const [importOpen, setImportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user?.id) startSession(user.id)
  }, [isAuthenticated, user?.id])

  const openAuth = () => setAuthOpen(true)
  const openImport = () => {
    if (!isAuthenticated) {
      setAuthOpen(true)
      return
    }
    setImportOpen(true)
  }
  const openUpload = () => {
    if (!isAuthenticated) {
      setAuthOpen(true)
      return
    }
    setUploadOpen(true)
  }

  const navigate = (next) => {
    const map = next === 'shorts' ? 'clips' : next
    setView(map)
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {}
  }

  const showSidebarChrome = !String(view).startsWith('legal-')

  const renderMain = () => {
    if (!KNOWN_VIEWS.has(view)) return <NotFoundPage onNavigate={navigate} />

    if (view === 'dashboard' && !isAuthenticated) {
      return (
        <AuthRequired
          title="Creator Studio"
          description="Sign in to manage clips, uploads, and live."
          onOpenAuth={openAuth}
        />
      )
    }
    if (view === 'wallet' && !isAuthenticated) {
      return (
        <AuthRequired title="Wallet" description="Sign in to view payouts." onOpenAuth={openAuth} />
      )
    }
    if (view === 'settings' && !isAuthenticated) {
      return (
        <AuthRequired
          title="Settings"
          description="Sign in to manage your account."
          onOpenAuth={openAuth}
        />
      )
    }
    if (view === 'checkout' && !isAuthenticated) {
      return (
        <AuthRequired title="Checkout" description="Sign in to continue." onOpenAuth={openAuth} />
      )
    }

    switch (view) {
      case 'home':
        return <HomeFeed />
      case 'clips':
      case 'shorts':
        return <ShortsFeed />
      case 'live':
        return <LiveView onNavigate={navigate} />
      case 'dashboard':
        return (
          <CreatorDashboard
            onOpenImport={openImport}
            onOpenUpload={openUpload}
            onNavigate={navigate}
          />
        )
      case 'wallet':
        return <CreatorWallet />
      case 'settings':
        return <SettingsPage />
      case 'explore':
        return <ExplorePage />
      case 'sounds':
        return <SoundsPage />
      case 'checkout':
        return <CheckoutPage />
      case 'history':
        return <LibraryPage initialTab="history" />
      case 'liked':
        return <LibraryPage initialTab="liked" />
      case 'watch-later':
        return <LibraryPage initialTab="saved" />
      case 'library':
        return <LibraryPage />
      case 'help':
        return <HelpPage />
      case 'about':
        return <AboutPage />
      case 'notifications':
        return <NotificationsPage />
      case 'legal-tos':
        return <TermsOfService />
      case 'legal-privacy':
        return <PrivacyPolicy />
      case 'legal-creator':
        return <CreatorAgreement />
      case 'legal-community':
        return <CommunityGuidelines />
      default:
        return <NotFoundPage onNavigate={navigate} />
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100 flex flex-col">
      <Navbar
        currentView={view}
        onNavigate={navigate}
        onOpenAuth={openAuth}
        onOpenUpload={openUpload}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />
      <div className="flex flex-1 min-h-0">
        {showSidebarChrome && (
          <Sidebar
            currentView={view}
            onNavigate={navigate}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1">{renderMain()}</div>
          <Footer onNavigate={navigate} />
        </main>
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
