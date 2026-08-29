import { useState, useEffect, useCallback } from 'react'
import {
  Radio,
  Home,
  Clapperboard,
  History,
  Clock,
  ThumbsUp,
  Users,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileText,
  Shield,
  Scale,
  BookOpen,
  ListVideo,
  LifeBuoy,
  Image as ImageIcon,
  Activity,
  Megaphone,
  Plus,
  RotateCcw,
  Heart,
  ShoppingBag,
  Store,
  Newspaper,
  Code2,
} from 'lucide-react'
import { lsGet } from '../lib/storage'
import { listLiveBoard, liveBadgeLabel, isOnAir } from '../lib/liveStatus'
import { FEATURE_ADS } from '../lib/featureFlags'
import { listSidebarCreators } from '../lib/contentService'
import ChannelAvatar from './ChannelAvatar'
import VerifiedBadge from './VerifiedBadge'
import { cn } from '../lib/utils'
import { isOfficialCreator } from '../lib/uiFormat'
import { isVerifiedChannel } from '../lib/verification'
import { t, subscribeLocale } from '../lib/i18n'

const itemCls = (active, collapsed) =>
  cn(
    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors',
    collapsed && 'justify-center px-0',
    active ? 'text-white bg-[#1f1f28]' : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
  )

function NavBtn({ active, onClick, icon: Icon, label, collapsed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={itemCls(active, collapsed)}
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
  open,
  onClose,
  currentView,
  onNavigate,
  onSelectLiveStream,
  focusedStreamUserId,
}) {
  const collapsed = true // Icons-only forever — never expand the left rail
  // width formula kept for layout contract: collapsed ? 'w-14' : 'w-60'
  const [moreOpen, setMoreOpen] = useState(false)
  const [liveNow, setLiveNow] = useState(() => listLiveBoard(lsGet('live_board', []) || []))
  const [recommendedCreators, setRecommendedCreators] = useState(() => listSidebarCreators(8))
  const [, bumpLocale] = useState(0)

  useEffect(() => subscribeLocale(() => bumpLocale((n) => n + 1)), [])

  const refreshLiveBoard = useCallback(() => {
    import('../lib/graphSync').then(({ syncPublicEngagementFromCloud }) => {
      syncPublicEngagementFromCloud?.().then(() => {
        setLiveNow(listLiveBoard(lsGet('live_board', []) || []))
      }).catch(() => {
        setLiveNow(listLiveBoard(lsGet('live_board', []) || []))
      })
    }).catch(() => {
      setLiveNow(listLiveBoard(lsGet('live_board', []) || []))
    })
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

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) onClose?.()
  }

  const go = (id) => {
    onNavigate(id)
    onClose?.()
  }

  const selectLive = (entry) => {
    onSelectLiveStream?.(entry)
    onClose?.()
  }

  const body = (
    <div className="flex flex-col h-full min-h-0 text-zinc-300">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-4">
        <nav className="space-y-0.5">
          <NavBtn collapsed={collapsed} active={currentView === 'home'} onClick={() => go('home')} icon={Home} label={t('nav.home')} />
          <NavBtn collapsed={collapsed} active={currentView === 'clips' || currentView === 'shorts'} onClick={() => go('clips')} icon={Clapperboard} label={t('nav.clips')} />
          <NavBtn collapsed={collapsed} active={currentView === 'pics'} onClick={() => go('pics')} icon={ImageIcon} label={t('nav.pics')} />
          <NavBtn collapsed={collapsed} active={currentView === 'live'} onClick={() => go('live')} icon={Radio} label={t('nav.live')} />
          <NavBtn collapsed={collapsed} active={currentView === 'news'} onClick={() => go('news')} icon={Newspaper} label={t('nav.news')} />
          <NavBtn collapsed={collapsed} active={currentView === 'shop' || currentView === 'marketplace'} onClick={() => go('shop')} icon={ShoppingBag} label={t('nav.shop')} />
          <NavBtn collapsed={collapsed} active={currentView === 'create'} onClick={() => go('create')} icon={Plus} label={t('nav.create')} />
        </nav>

        {/* Following sits under Create */}
        <div className="pt-2 mt-1 border-t border-[#1e1e27] space-y-0.5">
          <NavBtn collapsed={collapsed} active={currentView === 'following'} onClick={() => go('following')} icon={Users} label={t('nav.following')} />
        </div>

        {liveNow.length > 0 ? (
          <div className="pt-3 border-t border-[#1e1e27] space-y-1">
            {!collapsed && (
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#eb0400]" />
                {liveNow.some(isOnAir) ? t('live.onNow') : t('live.lobby')} ({liveNow.length})
              </p>
            )}
            {liveNow.map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => selectLive(s)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors',
                  collapsed && 'justify-center px-0',
                  focusedStreamUserId === s.userId ? 'bg-[#1f1f28]' : 'hover:bg-[#181820]'
                )}
                title={collapsed ? `${s.displayName} · ${liveBadgeLabel(s)}` : undefined}
              >
                <span className="relative shrink-0">
                  <span className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-white/10 text-white',
                    isOnAir(s) ? 'border-[#eb0400]' : 'border-amber-500/80'
                  )}>
                    {(s.displayName || s.handle || '?')[0]?.toUpperCase()}
                  </span>
                  <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-[#000000]',
                    isOnAir(s) ? 'bg-[#eb0400] animate-pulse' : 'bg-amber-500'
                  )} />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-zinc-200 truncate">{s.displayName}</span>
                    <span className="block text-[10px] text-zinc-500 truncate">
                      {liveBadgeLabel(s)} · {s.title}
                    </span>
                  </span>
                )}
                {!collapsed && <span className="text-[10px] text-zinc-500 shrink-0">{formatElapsed(s.startedAt)}</span>}
              </button>
            ))}
          </div>
        ) : null}

        <div className="pt-2 border-t border-[#1e1e27] space-y-0.5">
          {!collapsed && <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{t('nav.creators')}</p>}
          <NavBtn collapsed={collapsed} active={currentView === 'creators'} onClick={() => go('creators')} icon={Users} label={t('nav.creators')} />
          {recommendedCreators.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.displayName || c.handle}
              onClick={() => {
                if (typeof window !== 'undefined' && window.__clipsOpenProfile) {
                  window.__clipsOpenProfile(c.handle, c.id)
                } else {
                  go('creators')
                }
                closeOnMobile()
              }}
              className={cn(
                'w-full flex items-center rounded-lg text-left hover:bg-[#181820]',
                collapsed ? 'justify-center py-1.5' : 'gap-2.5 px-2.5 py-1.5'
              )}
            >
              <ChannelAvatar src={c.avatarUrl} name={c.displayName} size={collapsed ? 32 : 28} />
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
          {!collapsed && <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{t('nav.library')}</p>}
          <NavBtn collapsed={collapsed} active={currentView === 'history'} onClick={() => go('history')} icon={History} label={t('nav.history')} />
          <NavBtn collapsed={collapsed} active={currentView === 'watch-again'} onClick={() => go('watch-again')} icon={RotateCcw} label={t('nav.watchAgain')} />
          <NavBtn collapsed={collapsed} active={currentView === 'watch-later'} onClick={() => go('watch-later')} icon={Clock} label={t('nav.watchLater')} />
          <NavBtn collapsed={collapsed} active={currentView === 'liked'} onClick={() => go('liked')} icon={ThumbsUp} label={t('nav.liked')} />
          <NavBtn collapsed={collapsed} active={currentView === 'hearts'} onClick={() => go('hearts')} icon={Heart} label={t('nav.hearts')} />
          <NavBtn collapsed={collapsed} active={currentView === 'playlists'} onClick={() => go('playlists')} icon={ListVideo} label={t('nav.playlists')} />
        </div>

        <div className="pt-3 border-t border-[#1e1e27] space-y-0.5">
          {collapsed ? (
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className={itemCls(false, true)} title={t('nav.more')}>
              {moreOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className={itemCls(false, false)}>
              {moreOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>{t('nav.more')}</span>
            </button>
          )}
          {moreOpen && (
            <div className={cn('space-y-0.5', collapsed ? '' : 'ml-2 border-l border-[#23232c] pl-2')}>
              <NavBtn collapsed={collapsed} active={currentView === 'seller' || currentView === 'seller-portal'} onClick={() => go('seller')} icon={Store} label={t('nav.seller')} />
              <NavBtn collapsed={collapsed} active={currentView === 'stats'} onClick={() => go('stats')} icon={Activity} label={t('nav.stats')} />
              <NavBtn collapsed={collapsed} active={currentView === 'api'} onClick={() => go('api')} icon={Code2} label={t('nav.api')} />
              <NavBtn collapsed={collapsed} active={currentView === 'support'} onClick={() => go('support')} icon={LifeBuoy} label={t('nav.support')} />
              {FEATURE_ADS ? (
                <NavBtn collapsed={collapsed} active={currentView === 'advertise' || currentView === 'advertiser-portal'} onClick={() => go('advertise')} icon={Megaphone} label={t('nav.advertise')} />
              ) : (
                <NavBtn collapsed={collapsed} active={currentView === 'advertise' || currentView === 'advertiser-portal'} onClick={() => go('advertise')} icon={Megaphone} label={t('nav.monetize')} />
              )}
              <NavBtn collapsed={collapsed} active={currentView === 'about'} onClick={() => go('about')} icon={BookOpen} label={t('nav.about')} />
              <NavBtn collapsed={collapsed} active={currentView === 'help'} onClick={() => go('help')} icon={HelpCircle} label={t('nav.help')} />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-tos'} onClick={() => go('legal-tos')} icon={FileText} label={t('nav.tos')} />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-privacy'} onClick={() => go('legal-privacy')} icon={Shield} label={t('nav.privacy')} />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-creator'} onClick={() => go('legal-creator')} icon={Scale} label={t('nav.creatorAgreement')} />
              <NavBtn collapsed={collapsed} active={currentView === 'legal-community'} onClick={() => go('legal-community')} icon={Users} label={t('nav.community')} />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'flex flex-col shrink-0 h-[calc(100dvh-3.5rem)] sticky top-14 bg-[#0f0f0f] border-r border-[#272727] z-30 overflow-hidden w-14'
        )}
      >
        {body}
      </aside>
    </>
  )
}
