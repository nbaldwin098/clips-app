import {
  Home,
  Clapperboard,
  Radio,
  Compass,
  History,
  Clock,
  ThumbsUp,
  Settings,
  Upload,
  LayoutDashboard,
  Wallet,
  Users,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'shorts', label: 'Shorts', icon: Clapperboard },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'explore', label: 'Explore', icon: Compass },
]

const LIBRARY = [
  { id: 'history', label: 'History', icon: History },
  { id: 'watch-later', label: 'Watch later', icon: Clock },
  { id: 'liked', label: 'Liked videos', icon: ThumbsUp },
]

export default function Sidebar({ currentView, onNavigate, onOpenImport }) {
  const { mode, isAuthenticated } = useAuth()

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-sm h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
      <nav className="p-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mx-3 border-t border-slate-200" />

      <div className="p-3">
        <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Library
        </p>
        <div className="space-y-1">
          {LIBRARY.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {isAuthenticated && mode === 'creator' && (
        <>
          <div className="mx-3 border-t border-slate-200" />
          <div className="p-3">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Creator Tools
            </p>
            <div className="space-y-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  currentView === 'dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </button>
              <button
                onClick={onOpenImport}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Upload className="h-5 w-5" />
                Import Short
              </button>
              <button
                onClick={() => onNavigate('wallet')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  currentView === 'wallet'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Wallet className="h-5 w-5" />
                Wallet
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mx-3 border-t border-slate-200" />
      <div className="p-3">
        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Settings className="h-5 w-5 shrink-0" />
          Settings
        </button>
      </div>
      <div className="mt-auto p-4 text-xs text-slate-400">
        <p>Clips MVP</p>
        <p className="mt-1">Link import · zero binary storage</p>
      </div>
    </aside>
  )
}
