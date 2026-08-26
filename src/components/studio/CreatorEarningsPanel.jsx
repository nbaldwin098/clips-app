import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getCreatorEarnings,
  getCoinBalance,
  earningsSeriesByDay,
  listWithdrawMethods,
  listWithdrawRequests,
  saveWithdrawMethod,
  removeWithdrawMethod,
  requestWithdrawal,
  refreshEarningsFromCloud,
  refreshWalletFromCloud,
} from '../../lib/calabiCash'
import { creatorBalance } from '../../lib/payouts'
import { buildMethodSummary, storePayoutSecret, removePayoutSecret } from '../../lib/payoutVault'
import {
  SettingsCard,
  SettingsKpiGrid,
  SettingsButton,
  SettingsNotice,
  SettingsPageHeader,
} from '../settings/SettingsTemplates'

function usd(n) {
  return `$${(Number(n) || 0).toFixed(2)}`
}

function IncomeChart({ series }) {
  const rows = Array.isArray(series) && series.length ? series : [{ day: '', usd: 0 }]
  const max = Math.max(1, ...rows.map((r) => Number(r.usd) || 0))
  const w = 560
  const h = 160
  const pad = 12
  const denom = Math.max(1, rows.length - 1)
  const pts = rows.map((r, i) => {
    const x = pad + (i / denom) * (w - pad * 2)
    const y = h - pad - ((Number(r.usd) || 0) / max) * (h - pad * 2)
    return `${x},${y}`
  })
  const poly = pts.join(' ')
  const area = `${pad},${h - pad} ${poly} ${w - pad},${h - pad}`
  const last = Number(rows[rows.length - 1]?.usd) || 0
  const prev = Number(rows[rows.length - 2]?.usd) || 0
  const delta = last - prev
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0e] p-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs text-zinc-400">Income / day (30d)</p>
        <p className={`text-xs font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta >= 0 ? '+' : ''}{(Number(delta) || 0).toFixed(2)} vs yesterday
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
        <defs>
          <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#earnFill)" />
        <polyline points={poly} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
        <span>{rows[0]?.day || '—'}</span>
        <span>{rows[rows.length - 1]?.day || '—'}</span>
      </div>
    </div>
  )
}

export default function CreatorEarningsPanel() {
  const { user } = useAuth()
  const uid = user?.id
  const [, bump] = useState(0)
  const [amount, setAmount] = useState('25')
  const [methodId, setMethodId] = useState('')
  const [type, setType] = useState('bank')
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [chain, setChain] = useState('sol')
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid) return
    Promise.all([refreshEarningsFromCloud(uid), refreshWalletFromCloud(uid)])
      .then(() => bump((n) => n + 1))
      .catch(() => {})
  }, [uid])

  const raw = getCreatorEarnings(uid)
  const earnings = {
    availableUsd: Number(raw?.availableUsd) || 0,
    pendingUsd: Number(raw?.pendingUsd) || 0,
    lifetimeUsd: Number(raw?.lifetimeUsd) || 0,
    tipsUsd: Number(raw?.tipsUsd) || 0,
    subsUsd: Number(raw?.subsUsd) || 0,
    packsUsd: Number(raw?.packsUsd) || 0,
    daily: Array.isArray(raw?.daily) ? raw.daily : [],
  }
  const series = useMemo(
    () => earningsSeriesByDay(uid, 30) || [],
    [uid, earnings.lifetimeUsd, earnings.daily.length],
  )
  const methods = listWithdrawMethods(uid) || []
  const requests = listWithdrawRequests(uid, 10) || []
  const payout = creatorBalance(uid, user?.handle) || { views: 0, paid: 0 }
  const coins = Number(getCoinBalance(uid)) || 0

  useEffect(() => {
    if (!methodId && methods[0]?.id) setMethodId(methods[0].id)
  }, [methods, methodId])

  const onAddMethod = async () => {
    if (!uid) return
    setBusy(true)
    setNote('')
    const fields = type === 'bank'
      ? { routingNumber, accountNumber, accountName, label: accountName || 'Bank account' }
      : type === 'crypto'
        ? { chain, address: cryptoAddress, label: chain === 'btc' ? 'Bitcoin' : 'Solana' }
        : { email: paypalEmail, label: 'PayPal' }

    if (type === 'bank' && (!String(routingNumber).replace(/\D/g, '') || !String(accountNumber).replace(/\D/g, ''))) {
      setBusy(false)
      setNote('Enter routing and account numbers.')
      return
    }
    if (type === 'crypto' && !String(cryptoAddress).trim()) {
      setBusy(false)
      setNote('Enter your wallet address.')
      return
    }
    if (type === 'paypal' && !String(paypalEmail).trim()) {
      setBusy(false)
      setNote('Enter your PayPal email.')
      return
    }

    const summary = buildMethodSummary(type, fields)
    const id = `wm_${Date.now()}`
    storePayoutSecret(uid, id, summary.secret)
    const res = await saveWithdrawMethod(uid, {
      id,
      type,
      label: summary.label,
      details: summary.details,
      primary: methods.length === 0,
    })
    setBusy(false)
    if (!res.ok) {
      removePayoutSecret(uid, id)
      setNote(res.error || 'Could not save')
      return
    }
    setNote('Payout method saved in the secure vault.')
    setRoutingNumber('')
    setAccountNumber('')
    setAccountName('')
    setCryptoAddress('')
    setPaypalEmail('')
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

  return (
    <div className="space-y-5 max-w-3xl overflow-y-auto h-full pr-1">
      <SettingsPageHeader
        title="Earnings"
        subtitle="Cloud balances, sales, and withdrawals — same account across devices."
      />
      <SettingsKpiGrid
        items={[
          { label: 'Available', value: usd(earnings.availableUsd) },
          { label: 'Pending', value: usd(earnings.pendingUsd) },
          { label: 'Lifetime', value: usd(earnings.lifetimeUsd) },
          { label: 'Your Coins', value: String(coins) },
        ]}
      />
      <IncomeChart series={series} />
      <div className="grid gap-3 sm:grid-cols-3">
        <SettingsCard title="Tips">
          <p className="text-lg font-semibold text-white">{usd(earnings.tipsUsd)}</p>
        </SettingsCard>
        <SettingsCard title="Memberships">
          <p className="text-lg font-semibold text-white">{usd(earnings.subsUsd)}</p>
        </SettingsCard>
        <SettingsCard title="Pack share">
          <p className="text-lg font-semibold text-white">{usd(earnings.packsUsd)}</p>
        </SettingsCard>
      </div>
      <SettingsNotice>
        <p>
          Legacy payout ledger: {usd(payout?.paid)} paid
          {payout?.views != null ? ` · ${Number(payout.views) || 0} tracked views` : ''}.
          Bank and crypto details are stored in a secure payout vault (masked on screen).
        </p>
      </SettingsNotice>

      <SettingsCard
        title="Withdraw"
        description="Add a bank or crypto payout method, then request a withdrawal. Minimum $10."
      >
        <div className="space-y-4">
          {methods.length === 0 ? (
            <p className="text-xs text-zinc-500">No payout methods yet — add one below.</p>
          ) : methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 border border-zinc-800 px-3 py-2 text-sm">
              <div>
                <p className="text-white">{m.label}{m.primary ? ' · Primary' : ''}</p>
                <p className="text-[11px] text-zinc-500">{m.type} · {m.details}</p>
              </div>
              <SettingsButton
                variant="ghost"
                className="text-xs"
                onClick={async () => {
                  await removeWithdrawMethod(uid, m.id)
                  removePayoutSecret(uid, m.id)
                  bump((n) => n + 1)
                }}
              >
                Remove
              </SettingsButton>
            </div>
          ))}

          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-300">Add payment method</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'bank', label: 'Bank' },
                { id: 'crypto', label: 'Crypto' },
                { id: 'paypal', label: 'PayPal' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`h-9 px-3 text-xs font-semibold border ${type === t.id ? 'border-white text-white' : 'border-zinc-700 text-zinc-400'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {type === 'bank' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Account name"
                  className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white sm:col-span-2"
                />
                <input
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="Routing number"
                  className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white"
                  inputMode="numeric"
                />
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))}
                  placeholder="Account number"
                  className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white"
                  inputMode="numeric"
                />
              </div>
            ) : null}

            {type === 'crypto' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChain('sol')}
                    className={`h-9 px-3 text-xs font-semibold border ${chain === 'sol' ? 'border-white text-white' : 'border-zinc-700 text-zinc-400'}`}
                  >
                    SOL
                  </button>
                  <button
                    type="button"
                    onClick={() => setChain('btc')}
                    className={`h-9 px-3 text-xs font-semibold border ${chain === 'btc' ? 'border-white text-white' : 'border-zinc-700 text-zinc-400'}`}
                  >
                    BTC
                  </button>
                </div>
                <input
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value.trim())}
                  placeholder={chain === 'btc' ? 'Bitcoin address' : 'Solana address'}
                  className="h-9 w-full border border-zinc-800 bg-black px-2 text-xs text-white"
                />
              </div>
            ) : null}

            {type === 'paypal' ? (
              <input
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="PayPal email"
                className="h-9 w-full border border-zinc-800 bg-black px-2 text-xs text-white"
              />
            ) : null}

            <SettingsButton disabled={busy} onClick={onAddMethod}>Save payment method</SettingsButton>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-300">Request withdrawal</p>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs text-zinc-400">
                Amount (USD)
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block h-9 w-28 border border-zinc-800 bg-black px-2 text-sm text-white" />
              </label>
              <label className="text-xs text-zinc-400">
                Method
                <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className="mt-1 block h-9 min-w-[12rem] border border-zinc-800 bg-black px-2 text-sm text-white">
                  <option value="">Select…</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </label>
              <SettingsButton disabled={busy || !methodId} onClick={onWithdraw}>Request withdrawal</SettingsButton>
            </div>
            {requests.length ? (
              <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                {requests.map((r) => (
                  <li key={r.id}>
                    {usd(r.amountUsd)} · {r.status || 'pending'} · {r.methodLabel || '—'} · {String(r.createdAt || '').slice(0, 16)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </SettingsCard>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}
    </div>
  )
}
