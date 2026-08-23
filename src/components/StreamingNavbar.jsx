import React, { useState, useRef, useEffect } from 'react'
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
  Gamepad2,
  Tv,
  Check,
  Zap,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

export default function StreamingNavbar({
  onNavigate,
  onOpenAuth,
  onOpenUpload,
  onToggleSidebar,
  currentView,
  searchQuery,
  onSearchChange,
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const { accent, accentKey, setAccent, allAccents } = useTheme()

  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const menuRef = useRef(null)
  const paletteRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
      if (paletteRef.current && !paletteRef.current.contains(e.target)) {
        setPaletteOpen(false)
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
    <header className="sticky top-0 z-50 h-14 w-full border-b border-[#272730] bg-[#0e0e12]/95 backdrop-blur-md">
      <div className="flex h-full w-full items-center justify-between px-2 sm:px-4 gap-2">
        
        {/* Left: Brand + Navigation Quick Links */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-[#1f1f27] hover:text-white transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle Sidebar (Ctrl+B)"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg font-black text-sm tracking-wider shadow-md transition-transform group-hover:scale-105"
              style={{
                backgroundColor: accent.primary,
                color: accentKey === 'green' ? '#000000' : '#ffffff',
                boxShadow: `0 0 12px ${accent.glow}`,
              }}
            >
              <Zap className="h-4.5 w-4.5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                PULSE
                <span
                  className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: accent.badgeBg,
                    color: accent.primary,
                    border: `1px solid ${accent.badgeBorder}`,
                  }}
                >
                  LIVE
                </span>
              </span>
            </div>
          </button>

          {/* Primary View Links */}
          <nav className="hidden lg:flex items-center gap-1 pl-2">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                currentView === 'home' || currentView === 'live'
                  ? 'text-white bg-[#1f1f27]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181f]'
              )}
            >
              <Radio className="h-4 w-4" style={{ color: accent.primary }} />
              Browse Stream
            </button>
            <button
              type="button"
              onClick={() => handleNav('explore')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                currentView === 'explore'
                  ? 'text-white bg-[#1f1f27]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181f]'
              )}
            >
              <Gamepad2 className="h-4 w-4" />
              Categories
            </button>
            <button
              type="button"
              onClick={() => handleNav('clips')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                currentView === 'clips' || currentView === 'shorts'
                  ? 'text-white bg-[#1f1f27]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181f]'
              )}
            >
              <Sparkles className="h-4 w-4" />
              Clips
            </button>
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-2 md:mx-4">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="search"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search streams, games, channels..."
              className="w-full h-9 rounded-full border border-[#272730] bg-[#16161d] pl-9 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all focus:bg-[#1a1a23] focus:border-[#3b3b47] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            />
          </div>
        </div>

        {/* Right: Theme Toggle + User Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Accent Color Switcher Dropdown */}
          <div className="relative" ref={paletteRef}>
            <button
              type="button"
              onClick={() => setPaletteOpen((o) => !o)}
              className="flex h-9 items-center gap-1.5 px-2.5 rounded-lg border border-[#272730] bg-[#16161d] hover:bg-[#1f1f27] text-xs font-semibold text-zinc-200 transition-colors"
              title="Change Accent Style (Twitch Purple vs Kick Neon Green)"
            >
              <span
                className="h-3 w-3 rounded-full shadow-sm"
                style={{
                  backgroundColor: accent.primary,
                  boxShadow: `0 0 6px ${accent.glow}`,
                }}
              />
              <span className="hidden sm:inline">{accent.name.split(' ')[0]}</span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {paletteOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#2d2d38] bg-[#14141b] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-[#23232d] mb-1">
                  Design Theme Accents
                </div>
                {Object.values(allAccents).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setAccent(acc.id)
                      setPaletteOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-[#1f1f2a]',
                      accentKey === acc.id ? 'text-white font-semibold' : 'text-zinc-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{
                          backgroundColor: acc.primary,
                          boxShadow: `0 0 8px ${acc.glow}`,
                        }}
                      />
                      <span>{acc.name}</span>
                    </div>
                    {accentKey === acc.id && (
                      <Check className="h-3.5 w-3.5" style={{ color: acc.primary }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Go Live / Create Action */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex h-9 items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-md hover:brightness-110 active:scale-95"
            style={{
              backgroundColor: accent.primary,
              color: accentKey === 'green' ? '#051800' : '#ffffff',
              boxShadow: `0 0 12px ${accent.glow}`,
            }}
            title="Go Live / Upload Stream"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span className="hidden md:inline">Go Live</span>
          </button>

          {/* User Section */}
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => handleNav('notifications')}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-300 hover:bg-[#1f1f27] hover:text-white transition-colors"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-lg bg-[#181822] border border-[#272730] hover:border-[#3b3b47] transition-all"
                >
                  <div
                    className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-extrabold"
                    style={{
                      backgroundColor: accent.badgeBg,
                      color: accent.primary,
                      border: `1px solid ${accent.badgeBorder}`,
                    }}
                  >
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
                      <Tv className="h-4 w-4" style={{ color: accent.primary }} /> Channel Profile
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
