import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Settings,
  LogOut,
  SlidersHorizontal,
  CircleUserRound,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isPlatformOwner } from '../lib/moderation'
import BrandMark from './BrandMark'
import ChannelAvatar from './ChannelAvatar'
import NotificationsMenu from './NotificationsMenu'

export default function StreamingNavbar({
  onNavigate,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  onOpenWatch,
}) {
  const { user, isAuthenticated, authReady, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

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
      <div className="flex h-full w-full min-w-0 items-center gap-1 pr-1.5 sm:pr-3">
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex h-14 w-11 sm:w-14 items-center justify-center shrink-0"
            aria-label="Home"
            title="Home"
          >
            <BrandMark size={32} />
          </button>
        </div>

        <form
          className="flex-1 flex justify-center min-w-0 px-1 sm:px-4"
          onSubmit={(e) => { e.preventDefault(); handleNav('explore') }}
        >
          <div className="flex w-full max-w-[640px] min-w-0">
            <input
              type="search"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => handleNav('explore')}
              placeholder="Search"
              className="w-full min-w-0 h-9 border border-[#303030] bg-[#121212] pl-3 pr-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[#3ea6ff] focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 w-11 sm:w-14 shrink-0 border border-l-0 border-[#303030] bg-[#222222] text-zinc-200 hover:bg-[#2a2a2a] flex items-center justify-center"
              aria-label="Search"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 flex-nowrap">
          {!authReady ? (
            <span className="h-9 px-3 inline-flex items-center text-xs text-zinc-500">…</span>
          ) : isAuthenticated ? (
            <>
              <NotificationsMenu
                onNavigate={handleNav}
                onOpenWatch={onOpenWatch}
                onOpenAuth={onOpenAuth}
              />

              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex h-9 w-9 items-center justify-center hover:bg-white/10 shrink-0"
                  aria-label="Account"
                >
                  <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={28} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#2d2d38] bg-[#14141b] shadow-2xl py-1 z-50">
                    <div className="px-3.5 py-2.5 border-b border-[#23232d]">
                      <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'User'}</p>
                      <p className="text-[11px] text-zinc-400 truncate">@{user?.handle || 'viewer'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNav('dashboard')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-zinc-400" /> Creator dashboard
                    </button>
                    <p className="px-3.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                      Site settings
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onNavigate?.('settings', 'account')
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <Settings className="h-4 w-4 text-zinc-400" /> Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onNavigate?.('settings', 'wallet')
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#1f1f2a] hover:text-white"
                    >
                      <Wallet className="h-4 w-4 text-zinc-400" /> Wallet & Cash
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
              className="inline-flex items-center justify-center gap-1.5 h-9 min-w-9 px-2 sm:px-3.5 border border-[#3ea6ff] text-sm font-medium text-[#3ea6ff] hover:bg-[#3ea6ff]/10 shrink-0"
            >
              <CircleUserRound className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
