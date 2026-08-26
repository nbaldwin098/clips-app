import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getCreatorEarnings,
  getCalabiCashBalance,
  getCoinBalance,
  earningsSeriesByDay,
  listWithdrawMethods,
  listWithdrawRequests,
  saveWithdrawMethod,
  removeWithdrawMethod,
  requestWithdrawal,
  refreshEarningsFromCloud,
  refreshWalletFromCloud,
  formatCashDollars,
} from '../../lib/calabiCash'
import { creatorBalance } from '../../lib/payouts'
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
  const [label, setLabel] = useState('PayPal')
  const [details, setDetails] = useState('')
  const [type, setType] = useState('paypal')
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
  // Legacy ledger is { views, paid } — never treat as pending/available cash.
  const payout = creatorBalance(uid, user?.handle) || { views: 0, paid: 0 }
  const cash = Number(getCalabiCashBalance(uid)) || 0
  const coins = Number(getCoinBalance(uid)) || 0

  useEffect(() => {
    if (!methodId && methods[0]?.id) setMethodId(methods[0].id)
  }, [methods, methodId])

  const onAddMethod = async () => {
    if (!uid) return
    setBusy(true)
    const res = await saveWithdrawMethod(uid, { type, label, details, primary: methods.length === 0 })
    setBusy(false)
    setNote(res.ok ? 'Withdrawal method saved on cloud.' : (res.error || 'Could not save'))
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
          { label: 'Your Cash', value: formatCashDollars(cash), hint: `${coins} coins` },
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
          Earnings above sync from Supabase (run migration 0016 if empty).
        </p>
      </SettingsNotice>

      <SettingsCard title="Withdrawal methods" description="PayPal, bank, or crypto payout destination.">
        <div className="space-y-2">
          {methods.length === 0 ? (
            <p className="text-xs text-zinc-500">No methods yet.</p>
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
                  bump((n) => n + 1)
                }}
              >
                Remove
              </SettingsButton>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-3 pt-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white">
              <option value="paypal">PayPal</option>
              <option value="bank">Bank</option>
              <option value="crypto">Crypto</option>
            </select>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white" />
            <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="email / account" className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white" />
          </div>
          <SettingsButton disabled={busy} onClick={onAddMethod}>Add method</SettingsButton>
        </div>
      </SettingsCard>

      <SettingsCard title="Request withdrawal" description="Minimum $10. Processed after review.">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-zinc-400">
            Amount (USD)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block h-9 w-28 border border-zinc-800 bg-black px-2 text-sm text-white" />
          </label>
          <label className="text-xs text-zinc-400">
            Method
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className="mt-1 block h-9 min-w-[10rem] border border-zinc-800 bg-black px-2 text-sm text-white">
              <option value="">Select…</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <SettingsButton disabled={busy || !methodId} onClick={onWithdraw}>Request</SettingsButton>
        </div>
        {requests.length ? (
          <ul className="mt-3 space-y-1 text-xs text-zinc-500">
            {requests.map((r) => (
              <li key={r.id}>
                {usd(r.amountUsd)} · {r.status || 'pending'} · {r.methodLabel || '—'} · {String(r.createdAt || '').slice(0, 16)}
              </li>
            ))}
          </ul>
        ) : null}
      </SettingsCard>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}
    </div>
  )
}
