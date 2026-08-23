import { useState, useMemo } from 'react'
import {
  Home, Clapperboard, Radio, Compass, History, Clock, ThumbsUp,
  LayoutDashboard, Wallet, Music, Users, ChevronDown, ChevronRight,
  HelpCircle, FileText, Shield, Scale, BookOpen, Copyright, LifeBuoy,
  ShieldCheck, BarChart3, X, Activity, Megaphone,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { listIndexedUsers } from '../lib/moderation'
import { lsGet } from '../lib/storage'

const itemCls = (active) =>
  cn(
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
    active ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-zinc-800/80 hover:text-white'
  )

function NavBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button type="button" onClick={onClick} className={itemCls(active)}>
      {Icon && <Icon className="h-5 w-5 shrink-0" color="currentColor" />}
      <span>{label}</span>
    </button>
  )
}

export default function Sidebar({ currentView, onNavigate, open, onClose }) {
  const { isAuthenticated, user } = useAuth()
  const isApprovedCreator = user?.creatorStatus === 'approved'
  const [moreOpen, setMoreOpen] = useState(false)

  const go = (id) => {
    onNavigate(id)
    if (typeof window !== 'undefined' && window.innerWidth < 768) onClose?.()
  }

  const recommendedCreators = useMemo(() => {
    const users = listIndexedUsers().filter((u) => u.creatorStatus === 'approved' || u.isCreator)
    const clips = lsGet('user_clips', [])
    const count = {}
    for (const c of clips) {
      const id = c.creatorId || c.userId
      if (id) count[id] = (count[id] || 0) + 1
    }
    return users.map((u) => ({ ...u, n: count[u.id] || 0 })).sort((a, b) => b.n - a.n).slice(0, 5)
  }, [currentView, user?.id])

  const body = (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center justify-between p-3 md:hidden">
        <span className="text-sm font-semibold">Menu</span>
        <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-800" aria-label="Close menu">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="p-2 space-y-0.5">
        <NavBtn active={currentView === 'home'} onClick={() => go('home')} icon={Home} label="Recommended" />
        <NavBtn active={currentView === 'clips' || currentView === 'shorts'} onClick={() => go('clips')} icon={Clapperboard} label="Clips" />
        <NavBtn active={currentView === 'live'} onClick={() => go('live')} icon={Radio} label="Live" />
        <NavBtn active={currentView === 'explore'} onClick={() => go('explore')} icon={Compass} label="Search" />
        <NavBtn active={currentView === 'sounds'} onClick={() => go('sounds')} icon={Music} label="Sounds" />
      </nav>

      <div className="mx-3 border-t border-zinc-800" />
      <div className="p-2 space-y-0.5">
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Library</p>
        <NavBtn active={currentView === 'history'} onClick={() => go('history')} icon={History} label="History" />
        <NavBtn active={currentView === 'watch-later'} onClick={() => go('watch-later')} icon={Clock} label="Watch later" />
        <NavBtn active={currentView === 'liked'} onClick={() => go('liked')} icon={ThumbsUp} label="Liked" />
      </div>

      <div className="mx-3 border-t border-zinc-800" />
      <div className="p-2 space-y-0.5">
        <NavBtn active={currentView === 'subscriptions'} onClick={() => go('subscriptions')} icon={Users} label="Following" />
      </div>

      <div className="mx-3 border-t border-zinc-800" />
      <div className="p-2 space-y-0.5">
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Creator</p>
        {isApprovedCreator && (
          <>
            <NavBtn active={currentView === 'dashboard'} onClick={() => go('dashboard')} icon={LayoutDashboard} label="Studio" />
            <NavBtn active={currentView === 'wallet'} onClick={() => go('wallet')} icon={Wallet} label="Wallet" />
            <NavBtn active={currentView === 'analytics'} onClick={() => go('analytics')} icon={BarChart3} label="Analytics" />
          </>
        )}
        <NavBtn active={currentView === 'creators'} onClick={() => go('creators')} icon={Users} label="All creators" />
        {recommendedCreators.length > 0 && (
          <>
            <p className="px-3 pt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Recommended creators</p>
            {recommendedCreators.map((c) => (
              <button key={c.id} type="button" onClick={() => go('creators')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-zinc-800/80">
                <span className="h-7 w-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-semibold shrink-0">{(c.displayName || '?')[0].toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block text-xs text-zinc-200 truncate">{c.displayName}</span>
                  <span className="block text-[10px] text-zinc-500 truncate">@{c.handle}</span>
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="mx-3 border-t border-zinc-800" />
      <div className="p-2 space-y-0.5">
        <button type="button" onClick={() => setMoreOpen((v) => !v)} className={itemCls(false)}>
          {moreOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <span>… More</span>
        </button>
        {moreOpen && (
          <div className="ml-2 space-y-0.5 border-l border-zinc-800 pl-2">
            <NavBtn active={currentView === 'stats'} onClick={() => go('stats')} icon={Activity} label="Stats" />
            <NavBtn active={currentView === 'support'} onClick={() => go('support')} icon={LifeBuoy} label="Support" />
            {isAuthenticated && user?.creatorStatus !== 'approved' && (
              <NavBtn active={currentView === 'creator-apply'} onClick={() => go('creator-apply')} icon={ShieldCheck} label="Apply to create" />
            )}
            <NavBtn active={currentView === 'advertise' || currentView === 'advertiser-portal'} onClick={() => go('advertise')} icon={Megaphone} label="Advertise with us" />
            <NavBtn active={currentView === 'about'} onClick={() => go('about')} icon={BookOpen} label="About" />
            <NavBtn active={currentView === 'help'} onClick={() => go('help')} icon={HelpCircle} label="Help" />
            <NavBtn active={currentView === 'legal-tos'} onClick={() => go('legal-tos')} icon={FileText} label="Terms of Service" />
            <NavBtn active={currentView === 'legal-privacy'} onClick={() => go('legal-privacy')} icon={Shield} label="Privacy Policy" />
            <NavBtn active={currentView === 'legal-creator'} onClick={() => go('legal-creator')} icon={Scale} label="Creator Agreement" />
            <NavBtn active={currentView === 'legal-community'} onClick={() => go('legal-community')} icon={Users} label="Community Guidelines" />
            <NavBtn active={currentView === 'help'} onClick={() => go('help')} icon={Copyright} label="Copyright & DMCA" />
            <NavBtn active={currentView === 'admin'} onClick={() => go('admin')} icon={ShieldCheck} label="Admin" />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <aside className={cn('hidden md:flex shrink-0 flex-col border-r border-zinc-800 bg-[#121218] h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto transition-all duration-200', open ? 'w-56' : 'w-0 overflow-hidden border-0')}>
        {open && body}
      </aside>
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#121218] border-r border-zinc-800 overflow-y-auto">{body}</aside>
        </div>
      )}
    </>
  )
}
