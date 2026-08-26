import SettingsLayout, { settingsModeForSection } from './SettingsLayout'
import AccountSettings from './AccountSettings'
import SecuritySettings from './SecuritySettings'
import ChannelSettings from './ChannelSettings'
import StreamSettings from './StreamSettings'
import ChatSettings from './ChatSettings'
import CommentSettings from './CommentSettings'
import MonetizationSettings from './MonetizationSettings'
import RevenueSettings from './RevenueSettings'
import NotificationsSettings from './NotificationsSettings'
import RolesSettings from './RolesSettings'
import AnalyticsSettings from './AnalyticsSettings'
import CopyrightSettings from './CopyrightSettings'
import LegalSettings from './LegalSettings'
import WalletSettings from './WalletSettings'

const PAGES = {
  account: AccountSettings,
  security: SecuritySettings,
  channel: ChannelSettings,
  stream: StreamSettings,
  chat: ChatSettings,
  comments: CommentSettings,
  monetization: MonetizationSettings,
  revenue: RevenueSettings,
  notifications: NotificationsSettings,
  roles: RolesSettings,
  analytics: AnalyticsSettings,
  copyright: CopyrightSettings,
  legal: LegalSettings,
  wallet: WalletSettings,
}

export default function SettingsHub({ section, onNavigate, initialTab = null }) {
  const id = PAGES[section] ? section : 'account'
  const Page = PAGES[id]
  const mode = settingsModeForSection(id)
  return (
    <SettingsLayout section={id} mode={mode} onSection={(next) => onNavigate?.('settings', next)}>
      <Page onNavigate={onNavigate} initialTab={initialTab} />
    </SettingsLayout>
  )
}
