import { Search, Bell, LogIn, Menu, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ onNavigate, onOpenAuth, onOpenUpload, onToggleSidebar }) {
  const { user, isAuthenticated } = useAuth()
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-md">
      <div className="flex h-full w-full items-center px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onToggleSidebar} className="h-9 w-9 flex items-center justify-center rounded-lg text-[#007ACC] hover:bg-zinc-800" style={{ color: '#007ACC' }} aria-label="Menu">
            <Menu className="h-5 w-5" color="#007ACC" stroke="#007ACC" />
          </button>
          <button type="button" onClick={() => onNavigate('home')} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#007ACC] text-white font-bold text-sm">C</div>
            <span className="hidden sm:block text-lg font-semibold tracking-tight text-[#007ACC]">Clips</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center px-2">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input type="search" placeholder="Search" onFocus={() => onNavigate('explore')} className="w-full h-9 rounded-full border border-zinc-800 bg-[#121218] pl-9 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#007ACC]" />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onOpenUpload} className="h-9 w-9 flex items-center justify-center rounded-full bg-[#007ACC] text-white hover:bg-[#0098ff]" title="Create"><Plus className="h-5 w-5" /></button>
          {isAuthenticated ? (
            <>
              <button type="button" onClick={() => onNavigate('notifications')} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-800" title="Notifications"><Bell className="h-5 w-5 text-[#007ACC]" color="#007ACC" /></button>
              <button type="button" onClick={() => onNavigate('settings')} className="h-8 w-8 rounded-full bg-[#007acc]/25 flex items-center justify-center text-xs font-semibold text-[#007ACC]" title="Account">{user?.displayName?.[0]?.toUpperCase() || 'U'}</button>
            </>
          ) : (
            <button type="button" onClick={onOpenAuth} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#007ACC] text-white text-sm font-medium hover:bg-[#0098ff]"><LogIn className="h-4 w-4" />Sign in</button>
          )}
        </div>
      </div>
    </header>
  )
}
