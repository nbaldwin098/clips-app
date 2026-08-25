import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { creatorBalance, getPayoutContact, setPayoutContact, listPayoutLedger } from '../../lib/payouts'
import { getMembershipPrice } from '../../lib/engagement'
import { KICK_TWITCH_PARITY, statusLabel } from '../../lib/creatorStudioCatalog'
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsKpiGrid,
  SettingsCard,
  SettingsSelect,
  SettingsInput,
  SettingsNotice,
  SettingsButton,
  SettingsTable,
  SettingsSaveHint,
} from './SettingsTemplates'

export default function RevenueSettings({ hideHeader = false, onNavigate }) {
  const { user } = useAuth()
  const approved = user?.creatorStatus === 'approved'
  const b = creatorBalance(user?.id, user?.handle)
  const membershipPrice = getMembershipPrice(user?.id)
  const [contact, setContact] = useState(() => getPayoutContact(user?.id))
  const mine = listPayoutLedger().filter((r) => r.userId === user?.id)

  useEffect(() => {
    if (!user?.id || !approved) return
    setPayoutContact(user.id, contact)
  }, [user?.id, approved, contact])

  const kpis = [
    { label: 'Paid out', value: `$${b.paid.toFixed(2)}`, hint: 'Marked sent by hand' },
    { label: 'Post views', value: String(b.views), hint: 'Views do not pay a rate' },
    { label: 'Membership', value: `$${membershipPrice.toFixed(2)}/mo`, hint: 'Listed premium membership price' },
    { label: 'Ad share', value: '—', hint: 'Site ads are not a creator share' },
  ]

  const ledgerColumns = [
    { key: 'amount', label: 'Amount', render: (r) => `$${Number(r.amount).toFixed(2)}` },
    { key: 'sentVia', label: 'Via', muted: true },
    { key: 'at', label: 'Date', align: 'right', muted: true, render: (r) => r.at?.slice(0, 10) || '—' },
  ]

  return (
    <div className="space-y-8 pb-8">
      {!hideHeader ? (
        <SettingsPageHeader
          title="Revenue"
          subtitle="Kick and Twitch-style earnings overview. Payouts are sent by hand after approval — Stripe Connect is not connected."
        />
      ) : null}

      <SettingsKpiGrid items={kpis} />

      {!approved ? (
        <SettingsNotice tone="warn">
          <p>Anyone can post and go live. Apply to earn if you want manual payouts.</p>
          <SettingsButton onClick={() => onNavigate?.('creator-apply')}>Apply to earn</SettingsButton>
        </SettingsNotice>
      ) : (
        <SettingsSection title="Payout contact" description="Saved as you type. Nicholas marks money sent from Admin after you save a pay-to handle.">
          <SettingsCard>
            <div className="space-y-3 max-w-md">
              <SettingsSelect
                label="Method"
                value={contact.method}
                onChange={(e) => setContact((c) => ({ ...c, method: e.target.value }))}
              >
                <option value="paypal">PayPal</option>
                <option value="venmo">Venmo</option>
                <option value="cashapp">Cash App</option>
                <option value="other">Other</option>
              </SettingsSelect>
              <SettingsInput
                label="Handle or email"
                value={contact.handle}
                onChange={(e) => setContact((c) => ({ ...c, handle: e.target.value }))}
                placeholder="PayPal email / Venmo / Cash tag"
              />
              <SettingsInput
                label="Note for the owner"
                value={contact.note}
                onChange={(e) => setContact((c) => ({ ...c, note: e.target.value }))}
                placeholder="Optional note"
              />
              <SettingsSaveHint />
            </div>
          </SettingsCard>
        </SettingsSection>
      )}

      <SettingsSection title="Payout history" divider>
        <SettingsCard>
          <SettingsTable columns={ledgerColumns} rows={mine} emptyMessage="Nothing marked sent yet." />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Monetization shortcuts"
        description="Membership pricing and premium posts are configured separately."
        divider
      >
        <div className="flex flex-wrap gap-2">
          <SettingsButton variant="ghost" onClick={() => onNavigate?.('settings', 'monetization')}>
            Membership price
          </SettingsButton>
          <SettingsButton variant="ghost" onClick={() => onNavigate?.('wallet')}>
            Open wallet
          </SettingsButton>
        </div>
      </SettingsSection>

      <SettingsSection title="Kick & Twitch parity" description="What Clips has today vs the big platforms." divider>
        <SettingsCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="font-medium px-2 py-2">Feature</th>
                  <th className="font-medium px-2 py-2">Kick</th>
                  <th className="font-medium px-2 py-2">Twitch</th>
                  <th className="font-medium px-2 py-2">Clips</th>
                </tr>
              </thead>
              <tbody>
                {KICK_TWITCH_PARITY.filter((r) =>
                  /revenue|payout|membership|subscription|ad|stripe|analytics/i.test(r.feature)
                ).map((row) => (
                  <tr key={row.feature} className="border-b border-zinc-900 last:border-0">
                    <td className="px-2 py-2 text-zinc-300">{row.feature}</td>
                    <td className="px-2 py-2 text-zinc-500">{statusLabel(row.kick)}</td>
                    <td className="px-2 py-2 text-zinc-500">{statusLabel(row.twitch)}</td>
                    <td className="px-2 py-2 text-white">{statusLabel(row.clips)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
