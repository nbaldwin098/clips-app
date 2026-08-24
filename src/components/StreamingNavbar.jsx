import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Menu,
  Settings,
  LogOut,
  Tv,
  SlidersHorizontal,
  Clapperboard,
  CircleUserRound,
  BarChart3,
  Wallet,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isPlatformOwner } from '../lib/moderation'
import BrandMark from './BrandMark'
import ChannelAvatar from './ChannelAvatar'
import NotificationsMenu from './NotificationsMenu'

export default function StreamingNavbar({
  onNavigate,
  onOpenAuth,
  onToggleSidebar,
  sidebarOpen,
  searchQuery,
  onSearchChange,
  onOpenWatch,
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuDeg, setMenuDeg] = useState(0)
  const lastOpen = useRef(!!sidebarOpen)
  const menuRef = useRef(null)

  useEffect(() => {
    if (lastOpen.current === !!sidebarOpen) return
    lastOpen.current = !!sidebarOpen
    setMenuDeg((d) => d + 90)
  }, [sidebarOpen])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNav = (v) => {
    setMenuOpen(false)
    onNavigate(v)
  }

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b border-[#272727] bg-[#0f0f0f]">
      <div className="flex h-full w-full items-center pr-2 sm:pr-4">
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-14 w-14 items-center justify-center text-zinc-200"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={!!sidebarOpen}
            title={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <Menu
              className="h-5 w-5 origin-center transition-transform duration-300 ease-in-out"
              style={{ transform: `rotate(${menuDeg}deg)` }}
            />
          </button>

          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center text-left focus:outline-none pl-0.5"
          >
            <BrandMark size={32} withWord />
          </button>
        </div>

        <form
          className="flex-1 flex justify-center px-2 sm:px-6"
          onSubmit={(e) => { e.preventDefault(); handleNav('explore') }}
        >
          <div className="flex w-full max-w-[640px]">
            <input
              type="search"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => handleNav('explore')}
              placeholder="Search"
              className="w-full h-10 rounded-l-full border border-[#303030] bg-[#121212] pl-4 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[#3ea6ff] focus:outline-none"
            />
            <button
              type="submit"
              className="h-10 w-16 shrink-0 rounded-r-full border border-l-0 border-[#303030] bg-[#222222] text-zinc-200 hover:bg-[#2a2a2a]"
              aria-label="Search"
            >
              <Search className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              <NotificationsMenu
                onNavigate={handleNav}
                onOpenWatch={onOpenWatch}
                onOpenAuth={onOpenAuth}
              />

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center rounded-full p-0.5 hover:bg-white/10"
                  aria-label="Account"
                >
                  <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={32} />
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
                      <Tv className="h-4 w-4 text-white" /> Channel
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
                      onClick={() => handleNav('analytics')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <BarChart3 className="h-4 w-4 text-zinc-400" /> Analytics
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('wallet')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <Wallet className="h-4 w-4 text-zinc-400" /> Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('vods')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <Clapperboard className="h-4 w-4 text-zinc-400" /> VODs
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('verify')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <BadgeCheck className="h-4 w-4 text-zinc-400" /> Get verified
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('settings')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <Settings className="h-4 w-4 text-zinc-400" /> Settings
                    </button>
                    {isPlatformOwner(user) && (
                      <button
                        type="button"
                        onClick={() => handleNav('admin')}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                      >
                        <ShieldCheck className="h-4 w-4 text-zinc-400" /> Admin
                      </button>
                    )}
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
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-[#3ea6ff] text-sm font-medium text-[#3ea6ff] hover:bg-[#3ea6ff]/10"
            >
              <CircleUserRound className="h-5 w-5" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
