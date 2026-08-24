import { useState, useRef, useEffect } from 'react'
import { Search, Bell, LogIn, Menu, Plus, User, Tv, Settings, LogOut, ChevronDown } from 'lucide-react'
import BrandMark from './BrandMark'

export default function Navbar({ onNavigate, onOpenAuth, onOpenUpload, onToggleSidebar }) {
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const go = (view) => {
    setMenuOpen(false)
    onNavigate(view)
  }

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-md">
      <div className="flex h-full w-full items-center px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onToggleSidebar} className="h-9 w-9 flex items-center justify-center rounded-lg text-white hover:bg-zinc-800" style={{ color: '#ffffff' }} aria-label="Menu">
            <Menu className="h-5 w-5" color="#ffffff" stroke="#ffffff" />
          </button>
          <button type="button" onClick={() => onNavigate('home')} className="flex items-center gap-2">
            <BrandMark size={32} wordClassName="hidden sm:block text-lg font-semibold tracking-tight text-white" />
          </button>
        </div>
        <div className="flex-1 flex justify-center px-2">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input type="search" placeholder="Search" onFocus={() => onNavigate('explore')} className="w-full h-9 rounded-full border border-zinc-800 bg-[#121218] pl-9 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white" />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onOpenUpload} className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200" title="Create"><Plus className="h-5 w-5" /></button>
          {isAuthenticated ? (
            <>
              <button type="button" onClick={() => onNavigate('notifications')} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-800">
                <Bell className="h-5 w-5 text-white" color="#ffffff" />
              </button>
              <div className="relative" ref={ref}>
                <button type="button" onClick={() => setMenuOpen((o) => !o)} className="h-8 pl-1 pr-2 rounded-full bg-white/20 flex items-center gap-1 text-xs font-semibold text-white">
                  <span className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center">{user?.displayName?.[0]?.toUpperCase() || 'U'}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-[#121218] shadow-xl py-1 z-50">
                    <p className="px-3 py-2 text-[10px] text-zinc-500 truncate">{user?.email}</p>
                    <button type="button" onClick={() => go('settings')} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-zinc-800"><User className="h-4 w-4" /> Account</button>
                    <button type="button" onClick={() => go('channel')} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-zinc-800"><Tv className="h-4 w-4" /> Channel</button>
                    <button type="button" onClick={() => go('settings')} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-zinc-800"><Settings className="h-4 w-4" /> Settings</button>
                    <div className="border-t border-zinc-800 my-1" />
                    <button type="button" onClick={() => { logout(); setMenuOpen(false); onNavigate('home') }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"><LogOut className="h-4 w-4" /> Sign out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button type="button" onClick={onOpenAuth} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200"><LogIn className="h-4 w-4" />Sign in</button>
          )}
        </div>
      </div>
    </header>
  )
}
