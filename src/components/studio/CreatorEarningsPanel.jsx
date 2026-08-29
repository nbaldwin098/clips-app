import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getCreatorEarnings, getCoinBalance, earningsSeriesByDay,
  listWithdrawMethods, listWithdrawRequests, saveWithdrawMethod,
  removeWithdrawMethod, requestWithdrawal, refreshEarningsFromCloud, refreshWalletFromCloud,
} from '../../lib/calabiCash'
import { buildMethodSummary, storePayoutSecret, removePayoutSecret, pullPayoutSecretsCloud } from '../../lib/payoutVault'
import { getMembershipPrice, setMembershipPrice } from '../../lib/engagement'
import { StudioCard, StudioKpi, StudioAreaChart } from '../dash/StudioShell'
import { SettingsCard, SettingsButton } from '../settings/SettingsTemplates'

function usd(n) { return `$${(Number(n) || 0).toFixed(2)}` }

function MembershipPriceEditor({ userId }) {
  const [price, setPrice] = useState(() => getMembershipPrice(userId))
  useEffect(() => { setPrice(getMembershipPrice(userId)) }, [userId])
  return (
    <label className="block min-w-[200px] flex-1">
      <span className="text-xs font-medium text-zinc-500">USD / month</span>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-lg font-semibold text-white">$</span>
        <input type="number" min={1} max={50} step={0.01} value={price} onChange={(e) => { setPrice(e.target.value); if (userId) setMembershipPrice(userId, e.target.value) }} className="h-11 w-full max-w-[200px] border border-[#272727] bg-[#0f0f0f] px-3 text-base font-semibold text-white tabular-nums" />
      </div>
    </label>
  )
}

export default function CreatorEarningsPanel() {
  const { user } = useAuth()
  const uid = user?.id
  const [, bump] = useState(0)
  const [amount, setAmount] = useState('25')
  const [methodId, setMethodId] = useState('')
  const [type, setType] = useState('paypal')
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [chain, setChain] = useState('sol')
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [venmoHandle, setVenmoHandle] = useState('')
  const [cashTag, setCashTag] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid) return
    Promise.all([refreshEarningsFromCloud(uid), refreshWalletFromCloud(uid), pullPayoutSecretsCloud(uid)]).then(() => bump((n) => n + 1)).catch(() => {})
  }, [uid])

  const raw = getCreatorEarnings(uid)
  const earnings = {
    availableUsd: Number(raw?.availableUsd) || 0,
    pendingUsd: Number(raw?.pendingUsd) || 0,
    lifetimeUsd: Number(raw?.lifetimeUsd) || 0,
    daily: Array.isArray(raw?.daily) ? raw.daily : [],
  }
  const series = useMemo(() => earningsSeriesByDay(uid, 30) || [], [uid, earnings.lifetimeUsd, earnings.daily.length])
  const methods = listWithdrawMethods(uid) || []
  const requests = listWithdrawRequests(uid, 10) || []
  const coins = Number(getCoinBalance(uid)) || 0
  useEffect(() => { if (!methodId && methods[0]?.id) setMethodId(methods[0].id) }, [methods, methodId])

  const onAddMethod = async () => {
    if (!uid) return
    setBusy(true)
    setNote('')
    const fields = type === 'bank'
      ? { routingNumber, accountNumber, accountName, label: accountName || 'Bank account' }
      : type === 'crypto' ? { chain, address: cryptoAddress, label: chain === 'btc' ? 'Bitcoin' : 'Solana' }
      : type === 'venmo' ? { handle: venmoHandle, label: 'Venmo' }
      : type === 'cashapp' ? { tag: cashTag, label: 'Cash App' }
      : { email: paypalEmail, label: 'PayPal' }
    if (type === 'bank' && (!String(routingNumber).replace(/\D/g, '') || !String(accountNumber).replace(/\D/g, ''))) { setBusy(false); setNote('Enter routing and account numbers.'); return }
    if (type === 'crypto' && !String(cryptoAddress).trim()) { setBusy(false); setNote('Enter your wallet address.'); return }
    if (type === 'paypal' && !String(paypalEmail).trim()) { setBusy(false); setNote('Enter your PayPal email.'); return }
    if (type === 'venmo' && !String(venmoHandle).trim()) { setBusy(false); setNote('Enter your Venmo username.'); return }
    if (type === 'cashapp' && !String(cashTag).trim()) { setBusy(false); setNote('Enter your Cash App $cashtag.'); return }
    const summary = buildMethodSummary(type, fields)
    const id = `wm_${Date.now()}`
    storePayoutSecret(uid, id, summary.secret)
    const res = await saveWithdrawMethod(uid, { id, type, label: summary.label, details: summary.details, primary: methods.length === 0 })
    setBusy(false)
    if (!res.ok) { removePayoutSecret(uid, id); setNote(res.error || 'Could not save'); return }
    setNote('Payout method saved.')
    setRoutingNumber(''); setAccountNumber(''); setAccountName(''); setCryptoAddress(''); setPaypalEmail(''); setVenmoHandle(''); setCashTag('')
    bump((n) => n + 1)
  }

  const onWithdraw = async () => {
    if (!uid) return
    setBusy(true)
    const res = await requestWithdrawal(uid, amount, methodId)
    setBusy(false)
    setNote(res.ok ? `Withdrawal of $${Number(amount).toFixed(2)} requested.` : (res.error || 'Request failed'))
    bump((n) => n + 1)
  }

  const field = 'h-9 w-full border border-[#272727] bg-[#0f0f0f] px-2 text-xs text-white'

  return (
    <div className="space-y-5 overflow-y-auto h-full pr-1">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StudioKpi label="Available" value={usd(earnings.availableUsd)} />
        <StudioKpi label="Pending" value={usd(earnings.pendingUsd)} />
        <StudioKpi label="Lifetime" value={usd(earnings.lifetimeUsd)} />
        <StudioKpi label="Coins" value={String(coins)} />
      </div>
      <StudioCard title="Membership price"><MembershipPriceEditor userId={uid} /></StudioCard>
      <StudioCard title="Income / day"><StudioAreaChart seriesA={(series || []).map((r) => Number(r.usd) || 0)} height={160} /></StudioCard>
      <SettingsCard title="Withdraw" description="Add a payout method, then request a withdrawal.">
        <div className="space-y-4">
          {methods.length === 0 ? <p className="text-xs text-zinc-500">No payout methods yet.</p> : methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 border border-[#272727] px-3 py-2 text-sm">
              <div><p className="text-white">{m.label}</p><p className="text-[11px] text-zinc-500">{m.type} · {m.details}</p></div>
              <SettingsButton variant="ghost" className="text-xs" onClick={async () => { await removeWithdrawMethod(uid, m.id); removePayoutSecret(uid, m.id); bump((n) => n + 1) }}>Remove</SettingsButton>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {['paypal','venmo','cashapp','bank','crypto'].map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`h-9 px-3 text-xs font-semibold border ${type === t ? 'border-white text-white' : 'border-[#272727] text-zinc-400'}`}>{t}</button>
            ))}
          </div>
          {type === 'bank' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" className={`${field} sm:col-span-2`} />
              <input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="Routing number" className={field} />
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))} placeholder="Account number" className={field} />
            </div>
          ) : null}
          {type === 'crypto' ? <input value={cryptoAddress} onChange={(e) => setCryptoAddress(e.target.value.trim())} placeholder={chain === 'btc' ? 'Bitcoin address' : 'Solana address'} className={field} /> : null}
          {type === 'paypal' ? <input value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="PayPal email" className={field} /> : null}
          {type === 'venmo' ? <input value={venmoHandle} onChange={(e) => setVenmoHandle(e.target.value)} placeholder="@venmo-username" className={field} /> : null}
          {type === 'cashapp' ? <input value={cashTag} onChange={(e) => setCashTag(e.target.value)} placeholder="$cashtag" className={field} /> : null}
          <SettingsButton disabled={busy} onClick={onAddMethod}>Save payment method</SettingsButton>
          <div className="flex flex-wrap gap-2 items-end">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 w-28 border border-[#272727] bg-[#0f0f0f] px-2 text-sm text-white" />
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className="h-9 min-w-[12rem] border border-[#272727] bg-[#0f0f0f] px-2 text-sm text-white">
              <option value="">Select…</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <SettingsButton disabled={busy || !methodId || user?.creatorStatus !== 'approved'} onClick={onWithdraw}>Request withdrawal</SettingsButton>
          </div>
          {requests.map((r) => <p key={r.id} className="text-xs text-zinc-500">{usd(r.amountUsd)} · {r.status || 'pending'}</p>)}
        </div>
      </SettingsCard>
      {note ? <p className="text-xs text-amber-400">{note}</p> : null}
    </div>
  )
}
