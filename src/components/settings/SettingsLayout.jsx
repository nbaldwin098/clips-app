import { cn } from '../../lib/utils'
import {
  User, Shield, Bell, Radio, MessageSquare, MessageCircle, Wallet,
  BarChart3, Palette, Users, FileText, Scale, CircleDollarSign,
} from 'lucide-react'

/** Site / account settings — opened from the profile dropdown. */
export const SITE_SECTIONS = [
  { id: 'account', label: 'Account', icon: User, group: 'You' },
  { id: 'security', label: 'Security & Privacy', icon: Shield, group: 'You' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'You' },
  { id: 'wallet', label: 'Wallet & Coins', icon: Wallet, group: 'Money' },
  { id: 'legal', label: 'Legal & Data', icon: FileText, group: 'You' },
]

/** Creator tools — opened from Creator Studio. */
export const CREATOR_SECTIONS = [
  { id: 'channel', label: 'Channel & Branding', icon: Palette, group: 'Channel' },
  { id: 'stream', label: 'Stream & Ingest', icon: Radio, group: 'Live' },
  { id: 'chat', label: 'Chat & Moderation', icon: MessageSquare, group: 'Live' },
  { id: 'comments', label: 'Comments', icon: MessageCircle, group: 'Community' },
  { id: 'roles', label: 'Roles & Permissions', icon: Users, group: 'Community' },
  { id: 'monetization', label: 'Membership & tips', icon: Wallet, group: 'Money' },
  { id: 'revenue', label: 'Revenue & payouts', icon: CircleDollarSign, group: 'Money' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Growth' },
  { id: 'copyright', label: 'Copyright & DMCA', icon: Scale, group: 'Safety' },
]

export const ALL_SETTINGS_SECTIONS = [...SITE_SECTIONS, ...CREATOR_SECTIONS]

export function settingsModeForSection(section) {
  if (CREATOR_SECTIONS.some((s) => s.id === section)) return 'creator'
  return 'site'
}

function groupSections(sections) {
  const groups = []
  for (const s of sections) {
    const name = s.group || 'Settings'
    const last = groups[groups.length - 1]
    if (!last || last.name !== name) groups.push({ name, items: [s] })
    else last.items.push(s)
  }
  return groups
}

export default function SettingsLayout({ section, onSection, children, mode }) {
  const resolved = mode || settingsModeForSection(section)
  const sections = resolved === 'creator' ? CREATOR_SECTIONS : SITE_SECTIONS
  const groups = groupSections(sections)
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
          {groups.map((g) => (
            <optgroup key={g.name} label={g.name}>
              {g.items.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-[#050506] p-3">
        <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
        <nav className="space-y-4 flex-1">
          {groups.map((g) => (
            <div key={g.name}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{g.name}</p>
              <div className="space-y-0.5">
                {g.items.map((s) => {
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
              </div>
            </div>
          ))}
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
