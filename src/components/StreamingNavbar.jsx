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
  Landmark,
  CircleDollarSign,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isPlatformOwner } from '../lib/moderation'
import BrandMark from './BrandMark'
import ChannelAvatar from './ChannelAvatar'
import NotificationsMenu from './NotificationsMenu'
import { getCoinBalance, refreshWalletFromCloud } from '../lib/calabiCash'
import CoinIcon from './CoinIcon'

function ProfileRow({ icon: Icon, label, onClick, danger = false, indent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-[#1f1f2a] ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-200 hover:text-white'
      } ${indent ? 'pl-9' : ''}`}
    >
      {Icon ? <Icon className={`h-4 w-4 ${danger ? '' : 'text-zinc-400'}`} /> : null}
      {label}
    </button>
  )
}

function ProfileGroup({ label, children }) {
  return (
    <div className="py-1">
      <p className="px-3.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </p>
      {children}
    </div>
  )
}

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
  const [, setWalletTick] = useState(0)
  const coins = getCoinBalance(user?.id)
  const owner = isPlatformOwner(user)

  useEffect(() => {
    if (!user?.id) return
    refreshWalletFromCloud(user.id).then(() => setWalletTick((n) => n + 1)).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || typeof document === 'undefined') return undefined
    let timer = null
    const pull = () => {
      if (document.visibilityState !== 'visible') return
      refreshWalletFromCloud(user.id).then(() => setWalletTick((n) => n + 1)).catch(() => {})
    }
    const onVis = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(pull, 400)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      if (timer) clearTimeout(timer)
    }
  }, [user?.id])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNav = (v, id = '', params = null) => {
    setMenuOpen(false)
    onNavigate(v, id, params)
  }

  const goSettings = (section, params = null) => {
    setMenuOpen(false)
    onNavigate?.('settings', section, params)
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
                  data-avatar-btn
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 shrink-0"
                  aria-label="Account"
                >
                  <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={28} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-60 border border-[#2d2d38] bg-[#14141b] shadow-2xl py-1 z-50">
                    <div className="px-3.5 py-2.5 border-b border-[#23232d]">
                      <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'User'}</p>
                      <p className="text-[11px] text-zinc-400 truncate">@{user?.handle || 'viewer'}</p>
                      <button
                        type="button"
                        onClick={() => goSettings('wallet')}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold hover:text-amber-300"
                      >
                        <CoinIcon className="h-3.5 w-3.5" /> {coins} Coins
                      </button>
                    </div>

                    <ProfileRow
                      icon={SlidersHorizontal}
                      label="Creator dashboard"
                      onClick={() => handleNav('dashboard')}
                    />
                    <ProfileRow
                      icon={MessageSquare}
                      label="Messages"
                      onClick={() => handleNav('messages')}
                    />

                    <ProfileGroup label="Accounts">
                      <ProfileRow
                        icon={CircleDollarSign}
                        label="Payouts"
                        onClick={() => handleNav('dashboard', 'earnings')}
                      />
                      <ProfileRow
                        icon={Wallet}
                        label="Coins"
                        onClick={() => goSettings('wallet')}
                      />
                      <ProfileRow
                        icon={ShoppingBag}
                        label="Orders"
                        indent
                        onClick={() => goSettings('wallet', { tab: 'orders' })}
                      />
                      {owner ? (
                        <>
                          <ProfileRow
                            icon={Landmark}
                            label="Stripe ledger"
                            onClick={() => handleNav('admin', 'finance')}
                          />
                          <ProfileRow
                            icon={Wallet}
                            label="Pay creators"
                            onClick={() => handleNav('admin', 'payouts')}
                          />
                        </>
                      ) : null}
                    </ProfileGroup>

                    <ProfileGroup label="Settings">
                      <ProfileRow
                        icon={Settings}
                        label="Account"
                        onClick={() => goSettings('account')}
                      />
                    </ProfileGroup>

                    {owner ? (
                      <ProfileRow
                        icon={ShieldCheck}
                        label="Admin"
                        onClick={() => handleNav('admin')}
                      />
                    ) : null}

                    <div className="border-t border-[#23232d] my-1" />
                    <ProfileRow
                      icon={LogOut}
                      label="Sign Out"
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
