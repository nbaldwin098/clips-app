import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listFinanceTransactions,
  getFinanceTransaction,
  formatCents,
} from '../../lib/adminFinance'

const KINDS = [
  { id: '', label: 'All' },
  { id: 'live_tip', label: 'Live tip' },
  { id: 'post_tip', label: 'Post tip' },
  { id: 'premium', label: 'Premium' },
  { id: 'post_purchase', label: 'Paid post' },
  { id: 'coin_pack', label: 'Coins' },
  { id: 'marketplace', label: 'Shop' },
]

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111113] p-4">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-xl font-semibold text-white mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-zinc-600 mt-1">{hint}</p> : null}
    </div>
  )
}

export default function AdminFinancePanel() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    setBusy(true)
    const res = await listFinanceTransactions({ limit: 100, kind, q })
    setBusy(false)
    if (!res.ok) {
      setNote(res.message || 'Could not load finance')
      setRows([])
      setSummary(null)
      return
    }
    setNote('')
    setRows(res.transactions || [])
    setSummary(res.summary || null)
  }, [kind, q])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (sessionId) => {
    setSelected(sessionId)
    setDetail(null)
    const res = await getFinanceTransaction(sessionId)
    if (res.ok && res.transaction) setDetail(res.transaction)
    else setDetail(rows.find((r) => r.sessionId === sessionId) || null)
  }

  const csv = useMemo(() => {
    const header = [
      'createdAt', 'sessionId', 'kind', 'status', 'listCents', 'feeCents', 'amountCents',
      'creatorShareCents', 'platformShareCents', 'creatorHandle', 'payerHandle', 'transferStatus',
    ]
    const lines = [header.join(',')]
    for (const r of rows) {
      lines.push([
        r.createdAt, r.sessionId, r.kind, r.status, r.listCents, r.feeCents, r.amountCents,
        r.creatorShareCents, r.platformShareCents, r.creatorHandle, r.payerHandle, r.transferStatus,
      ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    }
    return lines.join('\n')
  }, [rows])

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calabi-finance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Master finance</p>
          <p className="text-[11px] text-zinc-500 max-w-xl">
            Every settled card payment on calabi — like Stripe Payments. Money lands in the platform Stripe account.
            Platform fee is tracked per transaction. Creator share is 80% of list price; fee is platform-only.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={busy} className="text-xs text-zinc-400 underline hover:text-white">
            {busy ? 'Loading…' : 'Refresh'}
          </button>
          <button type="button" onClick={downloadCsv} disabled={!rows.length} className="text-xs text-zinc-400 underline hover:text-white disabled:opacity-40">
            Export CSV
          </button>
        </div>
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Transactions" value={String(summary?.count ?? 0)} />
        <Kpi label="Gross volume" value={formatCents(summary?.grossCents)} hint="List + platform fee" />
        <Kpi label="Platform fees" value={formatCents(summary?.feeCents)} hint="Master fee ledger" />
        <Kpi label="Creator share" value={formatCents(summary?.creatorShareCents)} hint="80% of list" />
        <Kpi label="Platform keep" value={formatCents(summary?.platformShareCents)} hint="Fee + 20% of list" />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search id, handle, kind…"
          className="h-9 min-w-[14rem] rounded-lg bg-black border border-white/10 px-3 text-sm text-white"
        />
        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button
              key={k.id || 'all'}
              type="button"
              onClick={() => setKind(k.id)}
              className={`h-8 px-2.5 text-[11px] font-semibold border rounded-lg ${
                kind === k.id ? 'border-white text-white' : 'border-white/10 text-zinc-500'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111113] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Kind</th>
                  <th className="px-3 py-2 font-medium">Gross</th>
                  <th className="px-3 py-2 font-medium">Fee</th>
                  <th className="px-3 py-2 font-medium">Creator</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-zinc-600">
                      No settlements yet. They appear after a successful Stripe Checkout webhook.
                    </td>
                  </tr>
                ) : rows.map((r) => (
                  <tr
                    key={r.sessionId}
                    className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.03] ${
                      selected === r.sessionId ? 'bg-white/[0.06]' : ''
                    }`}
                    onClick={() => openDetail(r.sessionId)}
                  >
                    <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{String(r.createdAt || '').slice(0, 19)}</td>
                    <td className="px-3 py-2 text-white">{r.kind || '—'}</td>
                    <td className="px-3 py-2 text-white">{formatCents(r.amountCents)}</td>
                    <td className="px-3 py-2 text-sky-300">{formatCents(r.feeCents)}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {r.creatorHandle ? `@${r.creatorHandle}` : (r.creatorId ? r.creatorId.slice(0, 8) : '—')}
                      {' · '}
                      {formatCents(r.creatorShareCents)}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{r.status}/{r.transferStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111113] p-4 space-y-2 text-xs text-zinc-400 min-h-[240px]">
          <p className="text-sm font-medium text-white">Investigate</p>
          {!detail ? (
            <p className="text-zinc-600">Select a transaction to inspect amounts, fee, and parties.</p>
          ) : (
            <>
              <p className="text-[10px] uppercase text-zinc-500">Session</p>
              <p className="text-white break-all font-mono text-[11px]">{detail.sessionId}</p>
              <p><span className="text-zinc-500">Kind</span> · {detail.kind}</p>
              <p><span className="text-zinc-500">Status</span> · {detail.status} / {detail.transferStatus}</p>
              <div className="border-t border-white/10 pt-2 space-y-1">
                <p>List {formatCents(detail.listCents)}</p>
                <p className="text-sky-300">Platform fee {formatCents(detail.feeCents)}</p>
                <p className="text-white font-semibold">Gross {formatCents(detail.amountCents)}</p>
                <p>Creator share {formatCents(detail.creatorShareCents)}</p>
                <p>Platform keep {formatCents(detail.platformShareCents)}</p>
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1">
                <p>Payer · @{detail.payerHandle || '—'} · {detail.payerUserId || '—'}</p>
                <p>Creator · @{detail.creatorHandle || '—'} · {detail.creatorId || '—'}</p>
                {detail.contentId ? <p>Content · {detail.contentId}</p> : null}
                {detail.orderId ? <p>Order · {detail.orderId}</p> : null}
                {detail.tierId ? <p>Tier · {detail.tierId}</p> : null}
              </div>
              <p className="text-[10px] text-zinc-600 pt-2">
                Created {String(detail.createdAt || '')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
