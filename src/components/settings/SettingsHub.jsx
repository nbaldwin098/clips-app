import { useEffect } from 'react'
import SettingsLayout, { isCreatorSettingsSection } from './SettingsLayout'
import AccountSettings from './AccountSettings'
import SecuritySettings from './SecuritySettings'
import NotificationsSettings from './NotificationsSettings'
import LegalSettings from './LegalSettings'

const SITE_PAGES = {
  account: AccountSettings,
  security: SecuritySettings,
  notifications: NotificationsSettings,
  legal: LegalSettings,
}

/** Site settings shell only. Creator pages open inside Creator Studio. */
export default function SettingsHub({ section, onNavigate, initialTab = null }) {
  const redirectCreator = section === 'revenue' || (isCreatorSettingsSection(section) && !SITE_PAGES[section])

  useEffect(() => {
    if (!redirectCreator) return
    if (section === 'revenue') onNavigate?.('dashboard', 'earnings')
    else if (section === 'analytics') onNavigate?.('dashboard', 'analytics')
    else onNavigate?.('dashboard', 'settings', { tab: section })
  }, [redirectCreator, section, onNavigate])

  if (redirectCreator) {
    return <p className="p-6 text-sm text-zinc-500">Opening Creator Studio…</p>
  }

  const id = SITE_PAGES[section] ? section : 'account'
  const Page = SITE_PAGES[id]
  return (
    <SettingsLayout section={id} onSection={(next) => onNavigate?.('settings', next)}>
      <Page onNavigate={onNavigate} initialTab={initialTab} />
    </SettingsLayout>
  )
}
