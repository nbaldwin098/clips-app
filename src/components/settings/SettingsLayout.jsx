import {
  User, Shield, Bell, FileText,
} from 'lucide-react'
import StudioShell from '../dash/StudioShell'

/** Site / account settings only — opened from the profile dropdown. TikTok-white (B). */
export const SITE_SECTIONS = [
  { id: 'account', label: 'Account', icon: User, group: 'Settings' },
  { id: 'security', label: 'Security', icon: Shield, group: 'Settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Settings' },
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

export default function SettingsLayout({ section, onSection, children, onBack, onNavigate }) {
  const sections = SITE_SECTIONS
  const active = sections.some((s) => s.id === section) ? section : 'account'

  return (
    <StudioShell
      tone="dark"
      title="Settings"
      nav={sections}
      activeId={active}
      onNav={onSection}
      onBack={onBack}
      backLabel="Back"
      onNotify={() => onNavigate?.('notifications')}
      onHelp={() => onNavigate?.('help')}
    >
      <div className="max-w-3xl">
        {children}
      </div>
    </StudioShell>
  )
}
