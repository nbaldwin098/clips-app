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
import { REV_SPLIT_COPY } from '../../lib/revenueSplit'

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
        subtitle="Follow is free. Premium memberships and Calabi Cash tips use an 80/20 creator split. Stripe Payment Link amounts are separate until Connect ships."
      />

      <SettingsSection title={REV_SPLIT_COPY.title} description={REV_SPLIT_COPY.body} />

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

      <SettingsSection title="Earn" divider description="Tips, premium memberships, and Calabi Cash are how creators get paid. Site ads are off — not a creator share and not a payout source.">
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
              <SettingsButton variant="ghost" onClick={() => onNavigate?.('calabi-cash')}>
                Calabi Cash
              </SettingsButton>
            </div>
          </SettingsNotice>
        )}
      </SettingsSection>
    </div>
  )
}
