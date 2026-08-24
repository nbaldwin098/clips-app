import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Bell,
  LogIn,
  Menu,
  Plus,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  Radio,
  Compass,
  Tv,
  SlidersHorizontal,
  Film,
  Clapperboard,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'
import BrandMark from './BrandMark'
import { subscribeNotifications, unreadCount } from '../lib/notifications'

function SiteClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <time
      dateTime={now.toISOString()}
      title={now.toLocaleString()}
      className="hidden sm:block text-[11px] tabular-nums text-zinc-500 pr-1"
    >
      {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
    </time>
  )
}

export default function StreamingNavbar({
  onNavigate,
  onOpenAuth,
  onCreate,
  onToggleSidebar,
  currentView,
  searchQuery,
  onSearchChange,
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const menuRef = useRef(null)
  const createRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
      if (createRef.current && !createRef.current.contains(e.target)) {
        setCreateOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setUnread(0)
      return undefined
    }
    const refresh = () => setUnread(unreadCount(user.id))
    refresh()
    return subscribeNotifications(refresh)
  }, [user?.id])

  const handleNav = (v) => {
    setMenuOpen(false)
    onNavigate(v)
  }

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b border-[#272730] bg-[#000000]/95 backdrop-blur-md">
      <div className="flex h-full w-full items-center justify-between px-2 sm:px-4 gap-2">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-[#1f1f27] hover:text-white transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <BrandMark size={32} />
          </button>

          <nav className="hidden lg:flex items-center gap-1 pl-2">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                currentView === 'home' ? 'text-white bg-[#1f1f27]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181f]'
              )}
            >
              Recommended
            </button>
            <button
              type="button"
              onClick={() => handleNav('live')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                currentView === 'live' ? 'text-white bg-[#1f1f27]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181f]'
              )}
            >
              <Radio className="h-4 w-4 text-white" />
              Live
            </button>
            <button
              type="button"
              onClick={() => handleNav('explore')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                currentView === 'explore' ? 'text-white bg-[#1f1f27]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181f]'
              )}
            >
              <Compass className="h-4 w-4" />
              Explore
            </button>
            <button
              type="button"
              onClick={() => handleNav('clips')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                currentView === 'clips' || currentView === 'shorts' ? 'text-white bg-[#1f1f27]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181f]'
              )}
            >
              <Sparkles className="h-4 w-4" />
              Clips
            </button>
          </nav>
        </div>

        <div className="flex-1 max-w-md mx-2 md:mx-4">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="search"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => handleNav('explore')}
              placeholder="Search videos, clips, and pics..."
              className="w-full h-9 rounded-full border border-[#272730] bg-[#16161d] pl-9 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all focus:bg-[#1a1a23] focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <SiteClock />
          <div className="relative" ref={createRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setCreateOpen((o) => !o)
              }}
              className="flex h-9 w-9 items-center justify-center text-white hover:text-zinc-300 active:scale-90 transition-transform"
              title="Upload a video, clip, or go live"
              aria-label="Create"
              aria-expanded={createOpen}
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
            {createOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#2d2d38] bg-[#14141b] shadow-2xl py-1 z-50">
                <p className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Create
                </p>
                {[
                  { id: 'video', label: 'Video', hint: 'Upload a longer video', Icon: Film },
                  { id: 'clip', label: 'Clip', hint: 'Upload a short', Icon: Clapperboard },
                  { id: 'live', label: 'Go live', hint: 'Start a broadcast', Icon: Radio },
                ].map(({ id, label, hint, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setCreateOpen(false)
                      onCreate?.(id)
                    }}
                    className="w-full flex items-start gap-2.5 px-3.5 py-2 text-left hover:bg-[#1f1f2a]"
                  >
                    <Icon className="h-4 w-4 text-white mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-xs font-semibold text-white">{label}</span>
                      <span className="block text-[11px] text-zinc-500">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => handleNav('notifications')}
                className="relative h-9 w-9 flex items-center justify-center rounded-lg text-zinc-300 hover:bg-[#1f1f27] hover:text-white transition-colors"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-white text-black text-[10px] font-bold leading-4">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-lg bg-[#181822] border border-[#272730] hover:border-[#3b3b47] transition-all"
                >
                  <div className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-extrabold bg-white/10 text-white border border-white/25">
                    {user?.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#2d2d38] bg-[#14141b] shadow-2xl py-1 z-50">
                    <div className="px-3.5 py-2.5 border-b border-[#23232d]">
                      <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'User'}</p>
                      <p className="text-[11px] text-zinc-400 truncate">@{user?.handle || 'viewer'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNav('channel')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <Tv className="h-4 w-4 text-white" /> Channel Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('dashboard')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-zinc-400" /> Creator Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('settings')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <Settings className="h-4 w-4 text-zinc-400" /> Settings
                    </button>
                    <div className="border-t border-[#23232d] my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        logout()
                        setMenuOpen(false)
                        handleNav('home')
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#3b3b47] bg-[#181822] text-xs font-semibold text-white hover:bg-[#23232f] transition-colors shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
