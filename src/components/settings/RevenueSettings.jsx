import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { creatorBalance, getPayoutContact, setPayoutContact, listPayoutLedger } from '../../lib/payouts'
import { getMembershipPrice } from '../../lib/engagement'
import { KICK_TWITCH_PARITY, statusLabel } from '../../lib/creatorStudioCatalog'
import {
  connectOnboardingAvailable,
  startConnectOnboarding,
  fetchConnectStatus,
  connectStatusLabel,
} from '../../lib/stripeConnect'
import { t } from '../../lib/i18n'
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
  const [connectBusy, setConnectBusy] = useState(false)
  const [connectNote, setConnectNote] = useState('')
  const [connect, setConnect] = useState({
    status: 'unknown',
    payoutsEnabled: false,
    detailsSubmitted: false,
    accountId: '',
  })
  const mine = listPayoutLedger().filter((r) => r.userId === user?.id)
  const canTryConnect = connectOnboardingAvailable()

  useEffect(() => {
    if (!user?.id || !approved) return
    setPayoutContact(user.id, contact)
  }, [user?.id, approved, contact])

  useEffect(() => {
    if (!user?.id || !approved || !canTryConnect) return
    let cancelled = false
    fetchConnectStatus().then((res) => {
      if (cancelled) return
      setConnect({
        status: res.status || 'unknown',
        payoutsEnabled: !!res.payoutsEnabled,
        detailsSubmitted: !!res.detailsSubmitted,
        accountId: res.accountId || '',
      })
      if (res.message && res.status === 'not_deployed') setConnectNote(res.message)
    })
    return () => { cancelled = true }
  }, [user?.id, approved, canTryConnect])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const c = params.get('connect')
    if (!c) return
    if (c === 'return') setConnectNote('Checking Stripe Connect status…')
    if (c === 'refresh') setConnectNote('Restart Connect onboarding if the link expired.')
    params.delete('connect')
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash || ''}`
    window.history.replaceState({}, '', next)
    if (approved && canTryConnect) {
      fetchConnectStatus().then((res) => {
        setConnect({
          status: res.status || 'unknown',
          payoutsEnabled: !!res.payoutsEnabled,
          detailsSubmitted: !!res.detailsSubmitted,
          accountId: res.accountId || '',
        })
        setConnectNote(
          res.payoutsEnabled
            ? 'Stripe Connect is ready — tips can auto-pay out (80% creator).'
            : connectStatusLabel(res.status),
        )
      })
    }
  }, [approved, canTryConnect])

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

  const connectReady = connect.payoutsEnabled || connect.status === 'ready'

  return (
    <div className="space-y-8 pb-8">
      {!hideHeader ? (
        <SettingsPageHeader
          title="Revenue"
          subtitle={
            connectReady
              ? 'Earnings overview. Stripe Connect can auto-pay 80% of tips and memberships.'
              : 'Earnings overview. Connect Stripe for auto payouts, or keep a manual payout contact.'
          }
        />
      ) : null}

      <SettingsKpiGrid items={kpis} />

      {!approved ? (
        <SettingsNotice tone="warn">
          <p>Anyone can post and go live. Apply to earn if you want payouts.</p>
          <SettingsButton onClick={() => onNavigate?.('creator-apply')}>Apply to earn</SettingsButton>
        </SettingsNotice>
      ) : (
        <SettingsSection title="Payout contact" description="Fallback if Connect is off. Nicholas can still mark money sent by hand.">
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
        title="Stripe Connect"
        description="Creators keep 80% of tips and memberships. Platform keeps 20%."
        divider
      >
        <SettingsCard>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {connectReady
              ? 'Your Express account can receive Transfers after each paid tip or membership.'
              : (
                <>
                  Finish Stripe Express onboarding to receive auto payouts.
                  Setup guide: <code className="text-zinc-300">docs/OWN_CONNECT.md</code>.
                  Until then, use the payout contact above.
                </>
              )}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Status: <span className="text-zinc-300">{connectStatusLabel(connect.status)}</span>
            {connect.accountId ? (
              <span className="text-zinc-600"> · {connect.accountId.slice(0, 10)}…</span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SettingsButton
              disabled={connectBusy || !canTryConnect || !approved}
              title={!approved ? 'Apply to earn first' : (!canTryConnect ? 'Needs Supabase' : t('connect.stripe'))}
              onClick={async () => {
                setConnectBusy(true)
                setConnectNote('')
                const res = await startConnectOnboarding()
                setConnectBusy(false)
                if (res.ok && res.url) {
                  window.location.assign(res.url)
                  return
                }
                setConnectNote(res.message || t('connect.stripeSoon'))
              }}
            >
              {connectReady ? 'Update Stripe payouts' : (canTryConnect ? t('connect.stripe') : t('connect.stripeSoon'))}
            </SettingsButton>
            {connectNote ? <p className="text-xs text-zinc-500 w-full">{connectNote}</p> : null}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Monetization shortcuts"
        description="Membership pricing and Coins are configured separately."
        divider
      >
        <div className="flex flex-wrap gap-2">
          <SettingsButton variant="ghost" onClick={() => onNavigate?.('settings', 'monetization')}>
            Membership price
          </SettingsButton>
          <SettingsButton variant="ghost" onClick={() => onNavigate?.('settings', 'wallet')}>
            Open Coins
          </SettingsButton>
        </div>
      </SettingsSection>

      <SettingsSection title="Platform parity" description="What calabi has today vs the big streaming platforms." divider>
        <SettingsCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="font-medium px-2 py-2">Feature</th>
                  <th className="font-medium px-2 py-2">Kick</th>
                  <th className="font-medium px-2 py-2">Twitch</th>
                  <th className="font-medium px-2 py-2">calabi</th>
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
