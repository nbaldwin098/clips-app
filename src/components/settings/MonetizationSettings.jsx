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
        title="Membership"
        subtitle="Follow is free. Premium memberships and card tips use an 80/20 creator split. Coins are for chat cosmetics."
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

      <SettingsSection title="Earn" divider description="Card tips, premium memberships, and creator-set pricing are how creators get paid. Coins are for chat. Site ads are off — not a creator share.">
        {!approved ? (
          <SettingsNotice>
            <p>Anyone can create. You have to apply to earn.</p>
            <SettingsButton onClick={() => onNavigate?.('creator-apply')}>Apply to earn</SettingsButton>
          </SettingsNotice>
        ) : (
          <SettingsNotice tone="success">
            <p>You are approved. Save payout details on Earnings.</p>
            <div className="flex flex-wrap gap-2">
              <SettingsButton variant="ghost" onClick={() => onNavigate?.('dashboard', 'earnings')}>
                Open Earnings
              </SettingsButton>
              <SettingsButton variant="ghost" onClick={() => onNavigate?.('settings', 'wallet')}>
                Coins
              </SettingsButton>
              <SettingsButton variant="ghost" onClick={() => onNavigate?.('calabi-cash')}>
                Buy Coins
              </SettingsButton>
            </div>
          </SettingsNotice>
        )}
      </SettingsSection>
    </div>
  )
}
