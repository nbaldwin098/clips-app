import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Bell,
  Menu,
  Plus,
  Settings,
  LogOut,
  Tv,
  SlidersHorizontal,
  Film,
  Clapperboard,
  CircleUserRound,
  Radio,
  BarChart3,
  Wallet,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'
import BrandMark from './BrandMark'
import ChannelAvatar from './ChannelAvatar'
import { subscribeNotifications, unreadCount } from '../lib/notifications'

export default function StreamingNavbar({
  onNavigate,
  onOpenAuth,
  onCreate,
  onToggleSidebar,
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
    <header className="sticky top-0 z-50 h-14 w-full border-b border-[#272727] bg-[#0f0f0f]">
      <div className="flex h-full w-full items-center px-2 sm:px-4 gap-2">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 hover:bg-white/10 transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center text-left focus:outline-none"
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
          <div className="relative" ref={createRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setCreateOpen((o) => !o)
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#272727] px-3 text-sm font-medium text-white hover:bg-[#3f3f3f]"
              title="Upload a video, clip, or go live"
              aria-label="Create"
              aria-expanded={createOpen}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden md:inline">Create</span>
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
                className="relative h-10 w-10 flex items-center justify-center rounded-full text-zinc-200 hover:bg-white/10 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#eb0400] text-white text-[10px] font-bold leading-4">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

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
                    {(user?.isPlatformAdmin || user?.id === 'owner-cs1') && (
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
