import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMembershipPrice, setMembershipPrice } from '../../lib/engagement'
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsInput,
  SettingsNotice,
  SettingsButton,
  SettingsSaveHint,
} from './SettingsTemplates'

export default function MonetizationSettings({ onNavigate }) {
  const { user } = useAuth()
  const approved = user?.creatorStatus === 'approved'
  const [price, setPrice] = useState(() => getMembershipPrice(user?.id))

  useEffect(() => {
    if (!user?.id) return
    setMembershipPrice(user.id, price)
  }, [user?.id, price])

  return (
    <div className="space-y-8 pb-8">
      <SettingsPageHeader
        title="Monetization"
        subtitle="Posts and clips are free. The only price you set is premium membership for livestream. Stripe still has its own Payment Link amount. Views do not pay a dollar rate."
      />

      <SettingsSection title="Membership list price">
        <SettingsInput
          label="USD per month ($1–$50)"
          type="number"
          min="1"
          max="50"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="max-w-xs"
        />
        <SettingsSaveHint />
      </SettingsSection>

      <SettingsSection title="Earn" divider description="Site ads always run, but ad money is not a creator share and no ad earnings show on your dashboard.">
        {!approved ? (
          <SettingsNotice>
            <p>Anyone can create. You have to apply to earn.</p>
            <SettingsButton onClick={() => onNavigate?.('creator-apply')}>Apply to earn</SettingsButton>
          </SettingsNotice>
        ) : (
          <SettingsNotice tone="success">
            <p>You are approved. Save where to send money on Revenue or Wallet. Stripe Connect is not connected, so there is no withdraw button.</p>
            <div className="flex flex-wrap gap-2">
              <SettingsButton variant="ghost" onClick={() => onNavigate?.('settings', 'revenue')}>
                Revenue dashboard
              </SettingsButton>
              <SettingsButton variant="ghost" onClick={() => onNavigate?.('wallet')}>
                Wallet
              </SettingsButton>
            </div>
          </SettingsNotice>
        )}
      </SettingsSection>
    </div>
  )
}
