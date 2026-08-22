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
import ImportShortModal from './components/ImportShortModal'
import AuthModal from './components/AuthModal'
import UploadModal from './components/UploadModal'
import {
  TermsOfService,
  PrivacyPolicy,
  CreatorAgreement,
  CommunityGuidelines,
} from './components/legal/LegalPages'
import { startSession } from './lib/algorithmEngine'

function AppShell() {
  const { user, isAuthenticated } = useAuth()
  const [view, setView] = useState('home')
  const [importOpen, setImportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      startSession(user.id)
    }
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

  const showSidebar = !view.startsWith('legal-') && view !== 'settings' && view !== 'help'

  return (
    <div className="min-h-screen bg-[#FAFCFF] text-slate-900 flex flex-col">
      <Navbar
        currentView={view}
        onNavigate={setView}
        onOpenImport={openImport}
        onOpenAuth={openAuth}
        onOpenUpload={openUpload}
      />
      <div className="flex flex-1 min-h-0">
        {showSidebar && (
          <Sidebar
            currentView={view}
            onNavigate={setView}
            onOpenImport={openImport}
            onOpenUpload={openUpload}
          />
        )}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1">
            {view === 'home' && <HomeFeed onNavigate={setView} onOpenImport={openImport} />}
            {view === 'shorts' && <ShortsFeed onOpenImport={openImport} />}
            {view === 'live' && <LiveView />}
            {view === 'dashboard' && <CreatorDashboard onOpenImport={openImport} />}
            {view === 'wallet' && <CreatorWallet />}
            {view === 'settings' && <SettingsPage />}
            {view === 'explore' && <ExplorePage />}
            {view === 'history' && <LibraryPage initialTab="history" />}
            {view === 'liked' && <LibraryPage initialTab="liked" />}
            {view === 'watch-later' && <LibraryPage initialTab="saved" />}
            {view === 'library' && <LibraryPage />}
            {view === 'help' && <HelpPage />}
            {view === 'legal-tos' && <TermsOfService />}
            {view === 'legal-privacy' && <PrivacyPolicy />}
            {view === 'legal-creator' && <CreatorAgreement />}
            {view === 'legal-community' && <CommunityGuidelines />}
          </div>
          <Footer onNavigate={setView} />
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
