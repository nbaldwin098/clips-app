import {
  Home,
  Clapperboard,
  Radio,
  Compass,
  History,
  Clock,
  ThumbsUp,
  Settings,
  LayoutDashboard,
  Wallet,
  Music,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { id: 'home', label: 'Recommended', icon: Home },
  { id: 'clips', label: 'Clips', icon: Clapperboard },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'explore', label: 'Search', icon: Compass },
  { id: 'sounds', label: 'Sounds', icon: Music },
]

const LIBRARY = [
  { id: 'history', label: 'History', icon: History },
  { id: 'watch-later', label: 'Watch later', icon: Clock },
  { id: 'liked', label: 'Liked', icon: ThumbsUp },
]

export default function Sidebar({
  currentView,
  onNavigate,
  open,
  onClose,
  collapsed,
}) {
  const { mode, isAuthenticated } = useAuth()

  const body = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 md:hidden">
        <span className="text-sm font-semibold text-[#007ACC]">Menu</span>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-800"
        >
          <X className="h-4 w-4 text-[#007ACC]" />
        </button>
      </div>

      <nav className="p-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = currentView === item.id || (item.id === 'home' && currentView === 'home')
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id)
                onClose?.()
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#007acc]/20 text-[#0098ff]'
                  : 'text-[#007ACC] hover:bg-zinc-800/80 hover:text-[#23A9F2]'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" color="currentColor" />
              {!collapsed && item.label}
            </button>
          )
        })}
      </nav>

      <div className="mx-3 border-t border-zinc-800" />

      <div className="p-2">
        {!collapsed && (
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Library
          </p>
        )}
        <div className="space-y-0.5">
          {LIBRARY.map((item) => {
            const Icon = item.icon
            const active = currentView === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id)
                  onClose?.()
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#007acc]/20 text-[#0098ff]'
                    : 'text-[#007ACC] hover:bg-zinc-800/80 hover:text-[#23A9F2]'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" color="currentColor" />
                {!collapsed && item.label}
              </button>
            )
          })}
        </div>
      </div>

      {isAuthenticated && (
        <>
          <div className="mx-3 border-t border-zinc-800" />
          <div className="p-2 space-y-0.5">
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Creator
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                onNavigate('dashboard')
                onClose?.()
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                currentView === 'dashboard'
                  ? 'bg-[#007acc]/20 text-[#0098ff]'
                  : 'text-[#007ACC] hover:bg-zinc-800/80 hover:text-[#23A9F2]'
              )}
            >
              <LayoutDashboard className="h-5 w-5" color="currentColor" />
              {!collapsed && 'Studio'}
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('wallet')
                onClose?.()
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                currentView === 'wallet'
                  ? 'bg-[#007acc]/20 text-[#0098ff]'
                  : 'text-[#007ACC] hover:bg-zinc-800/80 hover:text-[#23A9F2]'
              )}
            >
              <Wallet className="h-5 w-5" color="currentColor" />
              {!collapsed && 'Wallet'}
            </button>
          </div>
        </>
      )}

      <div className="mx-3 border-t border-zinc-800" />
      <div className="p-2">
        <button
          type="button"
          onClick={() => {
            onNavigate('settings')
            onClose?.()
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            currentView === 'settings'
              ? 'bg-[#007acc]/20 text-[#0098ff]'
              : 'text-[#007ACC] hover:bg-zinc-800/80 hover:text-[#23A9F2]'
          )}
        >
          <Settings className="h-5 w-5 shrink-0" color="currentColor" />
          {!collapsed && 'Settings'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col border-r border-zinc-800 bg-[#121218] h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto transition-all duration-200',
          open ? 'w-56' : 'w-0 overflow-hidden border-0'
        )}
      >
        {open && body}
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#121218] border-r border-zinc-800 overflow-y-auto">
            {body}
          </aside>
        </div>
      )}
    </>
  )
}
