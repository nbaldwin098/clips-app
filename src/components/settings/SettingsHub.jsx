import SettingsLayout from './SettingsLayout'
import AccountSettings from './AccountSettings'
import SecuritySettings from './SecuritySettings'
import ChannelSettings from './ChannelSettings'
import StreamSettings from './StreamSettings'
import ChatSettings from './ChatSettings'
import MonetizationSettings from './MonetizationSettings'
import NotificationsSettings from './NotificationsSettings'
import RolesSettings from './RolesSettings'
import AnalyticsSettings from './AnalyticsSettings'
import CopyrightSettings from './CopyrightSettings'
import LegalSettings from './LegalSettings'

const PAGES = {
  account: AccountSettings,
  security: SecuritySettings,
  channel: ChannelSettings,
  stream: StreamSettings,
  chat: ChatSettings,
  monetization: MonetizationSettings,
  notifications: NotificationsSettings,
  roles: RolesSettings,
  analytics: AnalyticsSettings,
  copyright: CopyrightSettings,
  legal: LegalSettings,
}

export default function SettingsHub({ section, onNavigate }) {
  const id = PAGES[section] ? section : 'account'
  const Page = PAGES[id]
  return (
    <SettingsLayout section={id} onSection={(next) => onNavigate?.('settings', next)}>
      <Page onNavigate={onNavigate} />
    </SettingsLayout>
  )
}
