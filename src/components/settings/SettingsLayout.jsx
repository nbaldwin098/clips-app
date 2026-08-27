import { cn } from '../../lib/utils'
import {
  User, Shield, Bell, FileText,
} from 'lucide-react'

/** Site / account settings only — opened from the profile dropdown. */
export const SITE_SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'legal', label: 'Legal', icon: FileText },
]

/** Creator tools live in Creator Studio → Settings (not a second settings app). */
export const CREATOR_SETTING_PAGES = [
  { id: 'chat', label: 'Chat' },
  { id: 'comments', label: 'Comments' },
  { id: 'roles', label: 'Roles' },
  { id: 'monetization', label: 'Membership' },
  { id: 'copyright', label: 'Copyright' },
]

/** @deprecated kept for redirects — creator pages open in Studio */
export const CREATOR_SECTIONS = CREATOR_SETTING_PAGES.map((s) => ({
  ...s,
  icon: User,
  group: 'Creator',
}))

export const ALL_SETTINGS_SECTIONS = [...SITE_SECTIONS, ...CREATOR_SECTIONS]

export function settingsModeForSection(section) {
  if (CREATOR_SETTING_PAGES.some((s) => s.id === section) || section === 'revenue' || section === 'analytics') {
    return 'creator'
  }
  return 'site'
}

export function isCreatorSettingsSection(section) {
  return settingsModeForSection(section) === 'creator'
}

export default function SettingsLayout({ section, onSection, children }) {
  const sections = SITE_SECTIONS
  const active = sections.some((s) => s.id === section) ? section : 'account'

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      <div className="lg:hidden p-3 border-b border-zinc-800 w-full">
        <select
          value={active}
          onChange={(e) => onSection(e.target.value)}
          className="w-full h-10 border border-zinc-800 bg-[#121218] px-3 text-sm text-white"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-[#050506] p-3">
        <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Settings</p>
        <nav className="space-y-0.5 flex-1">
          {sections.map((s) => {
            const Icon = s.icon
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-left',
                  isActive ? 'bg-[#1f1f27] text-white' : 'text-zinc-400 hover:bg-[#18181f] hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 p-4 md:p-6 max-w-3xl">
        {children}
      </div>
    </div>
  )
}
