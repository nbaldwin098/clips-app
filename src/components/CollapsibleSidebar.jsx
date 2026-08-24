import { useState, useEffect, useCallback } from 'react'
import {
  Radio,
  Home,
  Clapperboard,
  History,
  Clock,
  ThumbsUp,
  Users,
  LayoutDashboard,
  Wallet,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  FileText,
  Shield,
  Scale,
  BookOpen,
  ListVideo,
  LifeBuoy,
  ShieldCheck,
  X,
  Image as ImageIcon,
  Bell,
  Activity,
  Megaphone,
  BadgeCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet } from '../lib/storage'
import { listSidebarCreators } from '../lib/contentService'
import BrandMark from './BrandMark'
import ChannelAvatar from './ChannelAvatar'
import VerifiedBadge from './VerifiedBadge'
import { cn } from '../lib/utils'
import { isOfficialCreator } from '../lib/uiFormat'
import { isVerifiedChannel } from '../lib/verification'

const itemCls = (active) =>
  cn(
    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors',
    active ? 'text-white bg-[#1f1f28]' : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
  )

function NavBtn({ active, onClick, icon: Icon, label, collapsed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(itemCls(active), collapsed && 'justify-center px-0')}
      title={collapsed ? label : undefined}
    >
      {Icon && <Icon className={cn('h-4 w-4 shrink-0', active && 'text-white')} />}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
}

function formatElapsed(startedAt) {
  if (!startedAt) return ''
  const ms = Date.now() - new Date(startedAt).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'new'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

export default function CollapsibleSidebar({
  collapsed,
  onToggleCollapse,
  currentView,
  onNavigate,
  mobileOpen,
  onMobileClose,
  onSelectLiveStream,
  focusedStreamUserId,
}) {
  const { isAuthenticated, user } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [liveNow, setLiveNow] = useState(() => (lsGet('live_board', []) || []).filter((b) => b.isLive))
  const [recommendedCreators, setRecommendedCreators] = useState(() => listSidebarCreators(8))

  const refreshLiveBoard = useCallback(() => {
    setLiveNow((lsGet('live_board', []) || []).filter((b) => b.isLive))
  }, [])

  useEffect(() => {
    refreshLiveBoard()
    const interval = setInterval(refreshLiveBoard, 15000)
    return () => clearInterval(interval)
  }, [refreshLiveBoard, currentView])

  useEffect(() => {
    const next = listSidebarCreators(8)
    if (next.length) setRecommendedCreators(next)
  }, [currentView])

  const go = (id) => {
    onNavigate(id)
    if (typeof window !== 'undefined' && window.innerWidth < 768) onMobileClose?.()
  }

  const selectLive = (entry) => {
    onSelectLiveStream?.(entry)
    if (typeof window !== 'undefined' && window.innerWidth < 768) onMobileClose?.()
  }

  const body = (
    <div className="flex flex-col h-full min-h-0 text-zinc-300">
      <div className="flex items-center justify-between p-2.5 border-b border-[#23232c] md:hidden">
        <span className="text-xs font-semibold text-zinc-200">Menu</span>
        <button type="button" onClick={onMobileClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#1e1e27]" aria-label="Close menu">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="hidden md:flex items-center justify-end p-2 border-b border-[#23232c]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#1e1e27]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-4">
        <nav className="space-y-0.5">
          <NavBtn collapsed={collapsed} active={currentView === 'home'} onClick={() => go('home')} icon={Home} label="Recommended" />
          <NavBtn collapsed={collapsed} active={currentView === 'clips' || currentView === 'shorts'} onClick={() => go('clips')} icon={Clapperboard} label="Short videos" />
          <NavBtn collapsed={collapsed} active={currentView === 'pics'} onClick={() => go('pics')} icon={ImageIcon} label="Pics" />
          <NavBtn collapsed={collapsed} active={currentView === 'live'} onClick={() => go('live')} icon={Radio} label="Live" />
          {isAuthenticated && (
            <NavBtn collapsed={collapsed} active={currentView === 'notifications'} onClick={() => go('notifications')} icon={Bell} label="Notifications" />
          )}
        </nav>

        <div className="pt-3 border-t border-[#1e1e27] space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#eb0400]" />
              Lobby ({liveNow.length})
            </p>
          )}
          {liveNow.length === 0 ? (
            !collapsed && <p className="px-2.5 text-[11px] text-zinc-600">Live video is not on yet. Lobby is empty.</p>
          ) : (
            liveNow.map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => selectLive(s)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors',
                  focusedStreamUserId === s.userId ? 'bg-[#1f1f28]' : 'hover:bg-[#181820]'
                )}
                title={collapsed ? `${s.displayName} · Lobby` : undefined}
              >
                <span className="relative shrink-0">
                  <span className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#eb0400] bg-white/10 text-white">
                    {(s.displayName || s.handle || '?')[0]?.toUpperCase()}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#eb0400] ring-1 ring-[#000000] animate-pulse" />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-zinc-200 truncate">{s.displayName}</span>
                    <span className="block text-[10px] text-zinc-500 truncate">{s.title}</span>
                  </span>
                )}
                {!collapsed && <span className="text-[10px] text-zinc-500 shrink-0">{formatElapsed(s.startedAt)}</span>}
              </button>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-[#1e1e27] space-y-0.5">
          {!collapsed && <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Library</p>}
          <NavBtn collapsed={collapsed} active={currentView === 'history'} onClick={() => go('history')} icon={History} label="History" />
          <NavBtn collapsed={collapsed} active={currentView === 'watch-later'} onClick={() => go('watch-later')} icon={Clock} label="Watch later" />
          <NavBtn collapsed={collapsed} active={currentView === 'liked'} onClick={() => go('liked')} icon={ThumbsUp} label="Liked" />
          <NavBtn collapsed={collapsed} active={currentView === 'playlists'} onClick={() => go('playlists')} icon={ListVideo} label="Playlists" />
        </div>

        <div className="pt-3 border-t border-[#1e1e27] space-y-0.5">
          <NavBtn collapsed={collapsed} active={currentView === 'subscriptions'} onClick={() => go('subscriptions')} icon={Users} label="Subscribed" />
        </div>

        <div className="pt-3 border-t border-[#1e1e27] space-y-0.5">
          {!collapsed && <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Top creators</p>}
          {isAuthenticated && (
            <>
              <NavBtn collapsed={collapsed} active={currentView === 'dashboard'} onClick={() => go('dashboard')} icon={LayoutDashboard} label="Creator Dashboard" />
              <NavBtn collapsed={collapsed} active={currentView === 'analytics'} onClick={() => go('analytics')} icon={BarChart3} label="Analytics" />
              <NavBtn collapsed={collapsed} active={currentView === 'wallet'} onClick={() => go('wallet')} icon={Wallet} label="Wallet" />
              <NavBtn collapsed={collapsed} active={currentView === 'vods'} onClick={() => go('vods')} icon={Clapperboard} label="VODs" />
              <NavBtn collapsed={collapsed} active={currentView === 'channel'} onClick={() => go('channel')} icon={Users} label="Channel" />
              <NavBtn collapsed={collapsed} active={currentView === 'settings'} onClick={() => go('settings')} icon={ShieldCheck} label="Creator settings" />
            </>
          )}
          <NavBtn collapsed={collapsed} active={currentView === 'creators'} onClick={() => go('creators')} icon={Users} label="Top creators" />
          {recommendedCreators.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.displayName || c.handle}
              onClick={() => {
                if (typeof window !== 'undefined' && window.__clipsOpenProfile) {
                  window.__clipsOpenProfile(c.handle, c.id)
                  if (window.innerWidth < 768) onMobileClose?.()
                } else {
                  go('creators')
                }
              }}
              className={cn(
                'w-full flex items-center rounded-lg text-left hover:bg-[#181820]',
                collapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2.5 py-1.5'
              )}
            >
              <ChannelAvatar src={c.avatarUrl} name={c.displayName} size={collapsed ? 32 : 28} official={!collapsed && isVerifiedChannel(c.id, c.handle)} />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[12px] text-zinc-200 truncate">
                    {c.displayName}
                    {isVerifiedChannel(c.id, c.handle) ? <VerifiedBadge title={isOfficialCreator(c.id, c.handle) ? 'Official channel' : 'Verified'} /> : null}
                  </span>
                  <span className="block text-[11px] text-[#aaa] truncate">@{c.handle}</span>
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-[#1e1e27] space-y-0.5">
          {collapsed ? (
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className={itemCls(false)} title="More">
              {moreOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className={itemCls(false)}>
              {moreOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>More</span>
            </button>
          )}
          {moreOpen && (
            <div className={cn('space-y-0.5', collapsed ? '' : 'ml-2 border-l border-[#23232c] pl-2')}>
              <NavBtn collapsed={collapsed} active={currentView === 'stats'} onClick={() => go('stats')} icon={Activity} label="Stats" />
              <NavBtn collapsed={collapsed} active={currentView === 'support'} onClick={() => go('support')} icon={LifeBuoy} label="Support" />
              {isAuthenticated && (
                <NavBtn collapsed={collapsed} active={currentView === 'verify'} onClick={() => go('verify')} icon={BadgeCheck} label="Get verified" />
              )}
              <NavBtn collapsed={collapsed} active={currentView === 'advertise' || currentView === 'advertiser-portal'} onClick={() => go('advertise')} icon={Megaphone} label="Advertise with us" />
              <NavBtn collapsed={collapsed} active={currentView === 'about'} onClick={() => go('about')} icon={BookOpen} label="About" />
              <NavBtn collapsed={collapsed} active={currentView === 'help'} onClick={() => go('help')} icon={HelpCircle} label="Help" />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-tos'} onClick={() => go('legal-tos')} icon={FileText} label="Terms of Service" />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-privacy'} onClick={() => go('legal-privacy')} icon={Shield} label="Privacy Policy" />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-creator'} onClick={() => go('legal-creator')} icon={Scale} label="Creator Agreement" />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-community'} onClick={() => go('legal-community')} icon={Users} label="Community Guidelines" />
              {(user?.isPlatformAdmin || user?.id === 'owner-cs1') && (
                <NavBtn collapsed={collapsed} active={currentView === 'admin'} onClick={() => go('admin')} icon={ShieldCheck} label="Admin" />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t border-[#23232c] p-2">
        <button
          type="button"
          onClick={() => go('home')}
          className={cn(
            'w-full flex items-center rounded-lg hover:bg-[#181820] text-left',
            collapsed ? 'justify-center p-1' : 'gap-2 px-1.5 py-1.5'
          )}
          title="calabi"
        >
          <BrandMark size={collapsed ? 28 : 32} withWord={!collapsed} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 bg-[#000000] border-r border-[#23232c] transition-all duration-200 z-30 overflow-hidden',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        {body}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative w-64 max-w-[80vw] h-full bg-[#000000] border-r border-[#23232c] shadow-2xl z-10">
            {body}
          </div>
        </div>
      )}
    </>
  )
}
