import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import HomeFeed from './components/HomeFeed'
import ShortsFeed from './components/ShortsFeed'
import LiveView from './components/LiveView'
import CreatorDashboard from './components/CreatorDashboard'
import CreatorWallet from './components/CreatorWallet'
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
        <Sidebar
          currentView={view}
          onNavigate={setView}
          onOpenImport={openImport}
          onOpenCostSim={openCost}
        />
        <main className="flex-1 min-w-0">
          {view === 'home' && <HomeFeed />}
          {view === 'shorts' && <ShortsFeed />}
          {view === 'live' && <LiveView />}
          {view === 'dashboard' && (
            <CreatorDashboard onOpenImport={openImport} onOpenCostSim={openCost} />
          )}
          {view === 'wallet' && <CreatorWallet />}
          {view === 'explore' && (
            <div className="p-8 text-center text-slate-500 text-sm">
              Explore and search will surface titles, tags, and creator handles.
            </div>
          )}
          {(view === 'history' || view === 'watch-later' || view === 'liked') && (
            <div className="p-8 text-center text-slate-500 text-sm">
              Library views are scaffolded for the MVP.
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
