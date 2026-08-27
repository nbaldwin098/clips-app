import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMembershipPrice, setMembershipPrice } from '../../lib/engagement'
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsInput,
  SettingsSaveHint,
} from './SettingsTemplates'

export default function MonetizationSettings() {
  const { user } = useAuth()
  const [price, setPrice] = useState(() => getMembershipPrice(user?.id))

  useEffect(() => {
    if (!user?.id) return
    setMembershipPrice(user.id, price)
  }, [user?.id, price])

  return (
    <div className="space-y-8 pb-8">
      <SettingsPageHeader title="Membership" />
      <SettingsSection title="Monthly price">
        <SettingsInput
          label="USD per month"
          type="number"
          min="1"
          max="999"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="max-w-xs"
        />
        <SettingsSaveHint />
      </SettingsSection>
    </div>
  )
}
