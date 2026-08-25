import { cn } from '../../lib/utils'
import {
  User, Shield, Bell, Radio, MessageSquare, MessageCircle, Wallet,
  BarChart3, Palette, Users, FileText, Scale, CircleDollarSign,
} from 'lucide-react'

/** Site / account settings — opened from the profile dropdown (YouTube-style). */
export const SITE_SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security & Privacy', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'legal', label: 'Legal & Data', icon: FileText },
]

/** Creator tools — opened from Creator Studio gear. */
export const CREATOR_SECTIONS = [
  { id: 'channel', label: 'Channel & Branding', icon: Palette },
  { id: 'stream', label: 'Stream & Ingest', icon: Radio },
  { id: 'chat', label: 'Chat & Moderation', icon: MessageSquare },
  { id: 'comments', label: 'Comments', icon: MessageCircle },
  { id: 'monetization', label: 'Monetization', icon: Wallet },
  { id: 'revenue', label: 'Revenue', icon: CircleDollarSign },
  { id: 'roles', label: 'Roles & Permissions', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'copyright', label: 'Copyright & DMCA', icon: Scale },
]

export const ALL_SETTINGS_SECTIONS = [...SITE_SECTIONS, ...CREATOR_SECTIONS]

export function settingsModeForSection(section) {
  if (CREATOR_SECTIONS.some((s) => s.id === section)) return 'creator'
  return 'site'
}

export default function SettingsLayout({ section, onSection, children, mode }) {
  const resolved = mode || settingsModeForSection(section)
  const sections = resolved === 'creator' ? CREATOR_SECTIONS : SITE_SECTIONS
  const title = resolved === 'creator' ? 'Creator settings' : 'Account settings'

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      <div className="lg:hidden p-3 border-b border-zinc-800 w-full">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">{title}</p>
        <select
          value={sections.some((s) => s.id === section) ? section : sections[0].id}
          onChange={(e) => onSection(e.target.value)}
          className="w-full h-10 border border-zinc-800 bg-[#121218] px-3 text-sm text-white"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-[#000000] p-3">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
        <nav className="space-y-0.5">
          {sections.map((s) => {
            const Icon = s.icon
            const active = section === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-left',
                  active ? 'bg-[#1f1f27] text-white' : 'text-zinc-400 hover:bg-[#18181f] hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            )
          })}
        </nav>
        {resolved === 'creator' ? (
          <button
            type="button"
            onClick={() => onSection('account')}
            className="mt-4 px-3 text-[11px] text-zinc-500 hover:text-white text-left"
          >
            Account & site settings →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSection('channel')}
            className="mt-4 px-3 text-[11px] text-zinc-500 hover:text-white text-left"
          >
            Creator settings →
          </button>
        )}
      </aside>
      <div className="flex-1 min-w-0 p-4 md:p-6 max-w-3xl">
        {children}
      </div>
    </div>
  )
}
