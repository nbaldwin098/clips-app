import { useState } from 'react'
import SettingsLayout from './settings/SettingsLayout'
import AccountSettings from './settings/AccountSettings'
import SecuritySettings from './settings/SecuritySettings'
import StreamSettings from './settings/StreamSettings'
import ChatSettings from './settings/ChatSettings'
import MonetizationSettings from './settings/MonetizationSettings'
import ChannelSettings from './settings/ChannelSettings'

export default function SettingsPage() {
  const [section, setSection] = useState('account')

  return (
    <SettingsLayout section={section} onSection={setSection}>
      {section === 'account' && <AccountSettings />}
      {section === 'security' && <SecuritySettings />}
      {section === 'stream' && <StreamSettings />}
      {section === 'chat' && <ChatSettings />}
      {section === 'monetization' && <MonetizationSettings />}
      {section === 'channel' && <ChannelSettings />}
      {section === 'notifications' && (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
          <p className="mt-2 text-sm text-slate-500">Email and push preferences will be configurable here once the notification service is connected.</p>
        </div>
      )}
      {section === 'roles' && (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Roles & Permissions</h1>
          <p className="mt-2 text-sm text-slate-500">Assign Moderators, VIPs, and Editors with granular toggles. No secondary roles assigned yet.</p>
        </div>
      )}
      {section === 'analytics' && (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-2 text-sm text-slate-500">Channel performance, retention curves, and traffic sources appear after real traffic is recorded.</p>
        </div>
      )}
      {section === 'legal' && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold text-slate-900">Legal & Data</h1>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
            <li>Terms of Service (draft required before public launch)</li>
            <li>Privacy Policy (draft required before public launch)</li>
            <li>Creator Agreement (100% sub pass-through + 90/10 ad pool)</li>
            <li>Data export and account deletion controls live under Security</li>
          </ul>
        </div>
      )}
    </SettingsLayout>
  )
}
