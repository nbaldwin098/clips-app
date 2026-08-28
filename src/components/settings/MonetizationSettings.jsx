import { useEffect } from 'react'
import { SettingsPageHeader, SettingsNotice, SettingsButton } from './SettingsTemplates'

/** Membership lives in Studio → Earnings (single source of truth). */
export default function MonetizationSettings({ onNavigate }) {
  useEffect(() => {
    onNavigate?.('dashboard', 'earnings')
  }, [onNavigate])

  return (
    <div className="space-y-6 pb-8">
      <SettingsPageHeader title="Membership" />
      <SettingsNotice>
        <p>Membership price is set in <strong>Earnings</strong>.</p>
        <SettingsButton onClick={() => onNavigate?.('dashboard', 'earnings')}>
          Open Earnings
        </SettingsButton>
      </SettingsNotice>
    </div>
  )
}
