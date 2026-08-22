import { useState } from 'react'
import SettingsLayout from './settings/SettingsLayout'
import AccountSettings from './settings/AccountSettings'
import SecuritySettings from './settings/SecuritySettings'
import StreamSettings from './settings/StreamSettings'
import ChatSettings from './settings/ChatSettings'
import MonetizationSettings from './settings/MonetizationSettings'
import ChannelSettings from './settings/ChannelSettings'
import CopyrightSettings from './settings/CopyrightSettings'
import NotificationsSettings from './settings/NotificationsSettings'
import RolesSettings from './settings/RolesSettings'
import AnalyticsSettings from './settings/AnalyticsSettings'

export default function SettingsPage({ initialSection } = {}) {
  const [section, setSection] = useState(initialSection || 'account')

  return (
    <SettingsLayout section={section} onSection={setSection}>
      {section === 'account' && <AccountSettings />}
      {section === 'security' && <SecuritySettings />}
      {section === 'stream' && <StreamSettings />}
      {section === 'chat' && <ChatSettings />}
      {section === 'monetization' && <MonetizationSettings />}
      {section === 'channel' && <ChannelSettings />}
      {section === 'notifications' && <NotificationsSettings />}
      {section === 'roles' && <RolesSettings />}
      {section === 'analytics' && <AnalyticsSettings />}
      {section === 'copyright' && <CopyrightSettings />}
      {section === 'legal' && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold text-slate-900">Legal & Data</h1>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
            <li>Full Terms, Privacy, Creator Agreement, and Community Guidelines are available from the footer.</li>
            <li>Copyright & DMCA tools live under the Copyright section.</li>
            <li>Data export and account deletion controls live under Security.</li>
          </ul>
        </div>
      )}
    </SettingsLayout>
  )
}
