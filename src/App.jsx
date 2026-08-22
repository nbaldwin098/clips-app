import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import HomeFeed from './components/HomeFeed'
import ShortsFeed from './components/ShortsFeed'
import LiveView from './components/LiveView'
import CreatorDashboard from './components/CreatorDashboard'
import CreatorWallet from './components/CreatorWallet'
import SettingsPage from './components/SettingsPage'
import ImportShortModal from './components/ImportShortModal'
import CostSimulatorModal from './components/CostSimulatorModal'

function AppShell() {
  const [view, setView] = useState('home')
  const [importOpen, setImportOpen] = useState(false)
  const [costOpen, setCostOpen] = useState(false)

  const openImport = () => setImportOpen(true)
  const openCost = () => setCostOpen(true)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar
        currentView={view}
        onNavigate={setView}
        onOpenImport={openImport}
        onOpenCostSim={openCost}
      />
      <div className="flex">
        {view !== 'settings' && (
          <Sidebar
            currentView={view}
            onNavigate={setView}
            onOpenImport={openImport}
            onOpenCostSim={openCost}
          />
        )}
        <main className="flex-1 min-w-0">
          {view === 'home' && <HomeFeed onNavigate={setView} onOpenImport={openImport} />}
          {view === 'shorts' && <ShortsFeed onOpenImport={openImport} />}
          {view === 'live' && <LiveView />}
          {view === 'dashboard' && (
            <CreatorDashboard onOpenImport={openImport} onOpenCostSim={openCost} />
          )}
          {view === 'wallet' && <CreatorWallet />}
          {view === 'settings' && <SettingsPage />}
          {view === 'explore' && (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">Explore</p>
              <p className="mt-1 text-xs text-slate-500">Search results will surface real titles, tags, and handles only.</p>
            </div>
          )}
          {(view === 'history' || view === 'watch-later' || view === 'liked') && (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">Library</p>
              <p className="mt-1 text-xs text-slate-500">No items yet. Activity is recorded only for authenticated sessions.</p>
            </div>
          )}
        </main>
      </div>

      <ImportShortModal open={importOpen} onClose={() => setImportOpen(false)} />
      <CostSimulatorModal open={costOpen} onClose={() => setCostOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
