import { cn } from '../../lib/utils'
import {
  User, Shield, Bell, Radio, MessageSquare, Wallet,
  BarChart3, Palette, Users, FileText, Scale
} from 'lucide-react'

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security & Privacy', icon: Shield },
  { id: 'channel', label: 'Channel & Branding', icon: Palette },
  { id: 'stream', label: 'Stream & Ingest', icon: Radio },
  { id: 'chat', label: 'Chat & Moderation', icon: MessageSquare },
  { id: 'monetization', label: 'Monetization', icon: Wallet },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'roles', label: 'Roles & Permissions', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'copyright', label: 'Copyright & DMCA', icon: Scale },
  { id: 'legal', label: 'Legal & Data', icon: FileText },
]

export default function SettingsLayout({ section, onSection, children }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-[#0e0e12] p-3">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Settings</p>
        <nav className="space-y-0.5">
          {SECTIONS.map(s => {
            const Icon = s.icon
            const active = section === s.id
            return (
              <button
                key={s.id}
                onClick={() => onSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                  active ? 'bg-[#1f1f27] text-white' : 'text-zinc-400 hover:bg-[#18181f] hover:text-white'
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
