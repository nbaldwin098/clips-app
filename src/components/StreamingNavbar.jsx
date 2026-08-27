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
  RadioTower,
  Scale,
  Users,
  Languages,
  Moon,
  Sun,
  Check,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isPlatformOwner } from '../lib/moderation'
import BrandMark from './BrandMark'
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
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [locale, setLocaleState] = useState(() => getLocale())
  const [theme, setThemeState] = useState(() => getTheme())
  const menuRef = useRef(null)
  const guestRef = useRef(null)
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
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setLangOpen(false)
      }
      if (guestRef.current && !guestRef.current.contains(e.target)) setGuestOpen(false)
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
    <header className="sticky top-0 z-50 h-14 w-full border-b border-[#272727] bg-[#0f0f0f]">
      <div className="flex h-full w-full min-w-0 items-center gap-1 pr-1.5 sm:pr-3">
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex h-14 w-11 sm:w-14 items-center justify-center shrink-0"
            aria-label={t('nav.home')}
            title={t('nav.home')}
          >
            <BrandMark size={32} />
          </button>
        </div>

        <form
          className="flex-1 flex justify-center min-w-0 px-1 sm:px-4"
          onSubmit={(e) => { e.preventDefault(); handleNav('explore') }}
        >
          <div className="flex w-full max-w-[560px] min-w-0">
            <input
              type="search"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => handleNav('explore')}
              placeholder={t('nav.search')}
              className="w-full min-w-0 h-8 border border-[#303030] bg-[#121212] pl-3 pr-2 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[#3ea6ff] focus:outline-none"
            />
            <button
              type="submit"
              className="h-8 w-10 sm:w-12 shrink-0 border border-l-0 border-[#303030] bg-[#222222] text-zinc-200 hover:bg-[#2a2a2a] flex items-center justify-center"
              aria-label={t('nav.search')}
            >
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 flex-nowrap">
          {isAuthenticated ? (
            <>
              <NotificationsMenu
                onNavigate={handleNav}
                onOpenWatch={onOpenWatch}
                onOpenAuth={onOpenAuth}
              />

              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  data-avatar-btn
                  onClick={() => { setMenuOpen((o) => !o); setLangOpen(false) }}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 shrink-0"
                  aria-label={t('nav.account')}
                >
                  <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={28} />
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
            <div className="relative shrink-0" ref={guestRef}>
              <button
                type="button"
                data-avatar-btn
                onClick={() => setGuestOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3ea6ff]/40 text-[#3ea6ff] hover:bg-[#3ea6ff]/10 shrink-0"
                aria-label={t('nav.account')}
              >
                <CircleUserRound className="h-5 w-5" />
              </button>
              {guestOpen ? (
                <div className="absolute right-0 mt-2 w-44 border border-[#272727] bg-[#0f0f0f] shadow-2xl py-1 z-50">
                  <ProfileRow
                    icon={CircleUserRound}
                    label={t('common.signIn')}
                    onClick={() => {
                      setGuestOpen(false)
                      onOpenAuth?.()
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
