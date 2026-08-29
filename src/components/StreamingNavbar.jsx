import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Settings,
  LogOut,
  SlidersHorizontal,
  CircleUserRound,
  ShieldCheck,
  Wallet,
  MessageSquare,
  Send,
  RadioTower,
  Scale,
  Users,
  Languages,
  Moon,
  Sun,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isPlatformOwner } from '../lib/moderation'
import ChannelAvatar from './ChannelAvatar'
import NotificationsMenu from './NotificationsMenu'
import { getCoinBalance, refreshWalletFromCloud } from '../lib/calabiCash'
import { getLocale, setLocale, listLocales, t, subscribeLocale } from '../lib/i18n'
import { getTheme, toggleTheme } from '../lib/theme'

function ProfileRow({ icon: Icon, label, onClick, danger = false, trailing = null, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-100 hover:bg-[#272727] ${
        danger ? 'text-zinc-100' : ''
      } ${active ? 'bg-[#1a1a1a]' : ''}`}
    >
      {Icon ? <Icon className="h-4 w-4 text-zinc-200" /> : null}
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  )
}

function Divider() {
  return <div className="border-t border-[#272727] my-1" />
}

export default function StreamingNavbar({
  onNavigate,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  onOpenWatch,
  currentView = 'home',
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [locale, setLocaleState] = useState(() => getLocale())
  const [theme, setThemeState] = useState(() => getTheme())
  const menuRef = useRef(null)
  const guestRef = useRef(null)
  const searchRef = useRef(null)
  const apex = currentView === 'home'
  const [, setWalletTick] = useState(0)
  const [, bump] = useState(0)
  const coins = getCoinBalance(user?.id)
  const owner = isPlatformOwner(user)
  const locales = listLocales()
  const localeLabel = locales.find((l) => l.id === locale)?.label || locale

  useEffect(() => subscribeLocale((next) => {
    setLocaleState(next)
    bump((n) => n + 1)
  }), [])

  useEffect(() => {
    if (!user?.id) return
    refreshWalletFromCloud(user.id).then(() => setWalletTick((n) => n + 1)).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!apex) return undefined
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [apex])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setLangOpen(false)
      }
      if (guestRef.current && !guestRef.current.contains(e.target)) {
        setGuestOpen(false)
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNav = (v, id = '', params = null) => {
    setMenuOpen(false)
    setGuestOpen(false)
    setLangOpen(false)
    onNavigate(v, id, params)
  }

  const pickLanguage = (id) => {
    setLocale(id)
    setLocaleState(id)
    setLangOpen(false)
    bump((n) => n + 1)
  }

  const onToggleTheme = () => {
    setThemeState(toggleTheme())
  }

  return (
    <header
      className={apex
        ? 'sticky top-0 z-50 h-12 md:h-16 w-full bg-black pt-[env(safe-area-inset-top)]'
        : 'sticky top-0 z-50 h-12 md:h-14 w-full border-b border-[#272727] bg-[#0f0f0f] pt-[env(safe-area-inset-top)]'}
      data-apex={apex ? 'home' : undefined}
    >
      <div className={apex
        ? 'flex h-full w-full min-w-0 items-center gap-3 px-3 sm:px-5'
        : 'flex h-full w-full min-w-0 items-center gap-1 pr-1.5 sm:pr-3'}
      >
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={apex
              ? 'flex h-12 md:h-16 items-center gap-2 shrink-0 pr-2'
              : 'flex h-12 md:h-14 w-11 sm:w-14 items-center justify-center shrink-0'}
            aria-label={t('nav.home')}
            title={t('nav.home')}
          >
            {apex ? <span className="text-white italic font-black tracking-tight text-[20px]">calabi</span> : <span className="text-white font-black text-lg">c</span>}
          </button>
        </div>

        <button
          type="button"
          className="md:hidden ml-auto h-11 w-11 inline-flex items-center justify-center text-white"
          aria-label={t('nav.search')}
          onClick={() => handleNav('explore')}
        >
          <Search className="h-6 w-6" />
        </button>
        <form
          className="hidden md:flex flex-1 justify-center min-w-0 px-1 sm:px-4"
          onSubmit={(e) => { e.preventDefault(); handleNav('explore') }}
        >
          {apex ? (
            <div className="flex w-full max-w-[560px] min-w-0 h-12 items-center gap-2 rounded-full bg-[#1a1a1a] border border-white/10 px-3">
              <Search className="h-5 w-5 text-[#8a8a8a] shrink-0" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onFocus={() => handleNav('explore')}
                placeholder="Search calabi"
                className="flex-1 min-w-0 bg-transparent text-base text-white placeholder:text-[#6b6b6b] outline-none"
              />
              <span className="hidden sm:inline text-[11px] text-[#6b6b6b] font-semibold">⌘K</span>
            </div>
          ) : (
          <div className="flex w-full max-w-[560px] min-w-0">
            <input
              type="search"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => handleNav('explore')}
              placeholder={t('nav.search')}
              className="w-full min-w-0 h-10 border border-[#303030] bg-[#121212] pl-3 pr-2 text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:border-[#3ea6ff] focus:outline-none"
            />
            <button
              type="submit"
              className="h-10 w-12 sm:w-14 shrink-0 border border-l-0 border-[#303030] bg-[#222222] text-zinc-200 hover:bg-[#2a2a2a] flex items-center justify-center"
              aria-label={t('nav.search')}
            >
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
          )}
        </form>

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 flex-nowrap">
          {isAuthenticated ? (
            <>
              <NotificationsMenu
                onNavigate={handleNav}
                onOpenWatch={onOpenWatch}
                onOpenAuth={onOpenAuth}
              />

              {apex ? (
                <button
                  type="button"
                  onClick={() => handleNav('messages')}
                  aria-label={t('nav.messages')}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-full text-white hover:bg-white/10"
                >
                  <Send className="h-6 w-6" />
                </button>
              ) : null}

              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  data-avatar-btn
                  onClick={() => { setMenuOpen((o) => !o); setLangOpen(false) }}
                  className="flex h-11 items-center justify-center gap-0.5 rounded-full hover:bg-white/10 shrink-0 px-0.5"
                  aria-label={t('nav.account')}
                >
                  <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={28} />
                  {apex ? <ChevronDown className="h-3.5 w-3.5 text-[#a0a0a0]" /> : null}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 border border-[#272727] bg-[#0f0f0f] shadow-2xl py-1 z-50 max-h-[min(80vh,520px)] overflow-y-auto">
                    <div className="px-3.5 py-2.5 border-b border-[#272727]">
                      <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'User'}</p>
                      <p className="text-[11px] text-zinc-400 truncate">@{user?.handle || 'viewer'}</p>
                    </div>

                    <ProfileRow
                      icon={SlidersHorizontal}
                      label={t('nav.studio')}
                      onClick={() => handleNav('dashboard')}
                    />
                    <ProfileRow
                      icon={RadioTower}
                      label={t('nav.liveStream')}
                      onClick={() => handleNav('dashboard', 'stream')}
                    />
                    <ProfileRow
                      icon={Scale}
                      label={t('nav.appeals')}
                      onClick={() => handleNav('appeals')}
                    />
                    <ProfileRow
                      icon={MessageSquare}
                      label={t('nav.messages')}
                      onClick={() => handleNav('messages')}
                    />

                    <Divider />

                    <ProfileRow
                      icon={Users}
                      label={t('nav.subscriptions')}
                      onClick={() => handleNav('subscriptions')}
                    />
                    <ProfileRow
                      icon={Wallet}
                      label={t('nav.wallet')}
                      onClick={() => handleNav('wallet')}
                      trailing={<span className="text-[10px] text-zinc-300 tabular-nums">{coins}</span>}
                    />

                    <Divider />

                    <ProfileRow
                      icon={Languages}
                      label={`${t('i18n.language')}: ${localeLabel}`}
                      onClick={() => setLangOpen((o) => !o)}
                    />
                    {langOpen ? (
                      <div className="border-y border-[#272727] bg-[#121212] py-1">
                        {locales.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => pickLanguage(l.id)}
                            className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-zinc-100 hover:bg-[#272727]"
                          >
                            <span className="flex-1 text-left">{l.label}</span>
                            {locale === l.id ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <ProfileRow
                      icon={Settings}
                      label={t('nav.settings')}
                      onClick={() => handleNav('settings', 'account')}
                    />
                    <ProfileRow
                      icon={theme === 'dark' ? Moon : Sun}
                      label={theme === 'dark' ? t('nav.themeDark') : t('nav.themeLight')}
                      onClick={onToggleTheme}
                    />

                    <Divider />
                    {owner ? (
                      <ProfileRow
                        icon={ShieldCheck}
                        label={t('nav.admin')}
                        onClick={() => handleNav('admin')}
                      />
                    ) : null}
                    <ProfileRow
                      icon={LogOut}
                      label={t('nav.logout')}
                      danger
                      onClick={() => {
                        logout()
                        setMenuOpen(false)
                        handleNav('home')
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="relative shrink-0 flex items-center gap-0.5" ref={guestRef}>
              {apex ? (
                <button
                  type="button"
                  onClick={() => handleNav('messages')}
                  aria-label={t('nav.messages')}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-full text-white hover:bg-white/10"
                >
                  <Send className="h-6 w-6" />
                </button>
              ) : null}
              <button
                type="button"
                data-avatar-btn
                onClick={() => { setGuestOpen((o) => !o); setLangOpen(false) }}
                className={apex
                  ? 'flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 shrink-0'
                  : 'flex h-11 w-11 items-center justify-center rounded-full border border-[#3ea6ff]/40 text-[#3ea6ff] hover:bg-[#3ea6ff]/10 shrink-0'}
                aria-label={t('nav.account')}
              >
                <CircleUserRound className="h-6 w-6" />
              </button>
              {guestOpen ? (
                <div className="absolute right-0 mt-2 w-64 border border-[#272727] bg-[#0f0f0f] shadow-2xl py-1 z-50 max-h-[min(80vh,520px)] overflow-y-auto">
                  <ProfileRow
                    icon={CircleUserRound}
                    label={t('common.signIn')}
                    onClick={() => {
                      setGuestOpen(false)
                      onOpenAuth?.()
                    }}
                  />
                  <Divider />
                  <ProfileRow
                    icon={Languages}
                    label={`${t('i18n.language')}: ${localeLabel}`}
                    onClick={() => setLangOpen((o) => !o)}
                  />
                  {langOpen ? (
                    <div className="border-y border-[#272727] bg-[#121212] py-1">
                      {locales.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => pickLanguage(l.id)}
                          className={`w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-left hover:bg-[#272727] ${
                            locale === l.id ? 'bg-[#1a1a1a] text-white' : 'text-zinc-200'
                          }`}
                        >
                          <span className="flex-1">{l.label}</span>
                          {locale === l.id ? <Check className="h-3.5 w-3.5 text-zinc-300" /> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
