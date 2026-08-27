import { useCallback, useEffect, useState } from 'react'
import {
  listPendingWithdrawals,
  markWithdrawalPaid,
  rejectWithdrawal,
} from '../../lib/adminWithdraw'

function secretHint(secret) {
  if (!secret || typeof secret !== 'object') return '—'
  if (secret.kind === 'paypal') return secret.email || 'PayPal'
  if (secret.kind === 'venmo') return secret.handle ? `@${secret.handle}` : 'Venmo'
  if (secret.kind === 'cashapp') return secret.tag ? `$${secret.tag}` : 'Cash App'
  if (secret.kind === 'bank') {
    return `Bank · ${secret.accountName || ''} · …${String(secret.accountNumber || '').slice(-4)}`
  }
  if (secret.kind === 'crypto') {
    return `${String(secret.chain || '').toUpperCase()} · ${String(secret.address || '').slice(0, 8)}…`
  }
  return JSON.stringify(secret).slice(0, 80)
}

export default function AdminWithdrawPanel() {
  const [rows, setRows] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    const res = await listPendingWithdrawals()
    if (!res.ok) {
      setNote(res.message || 'Could not load withdrawals')
      setRows([])
      return
    }
    setNote('')
    setRows(res.requests || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (id, kind) => {
    setBusy(id)
    const res = kind === 'paid'
      ? await markWithdrawalPaid(id)
      : await rejectWithdrawal(id)
    setBusy('')
    setNote(res.ok ? `${kind === 'paid' ? 'Marked paid' : 'Rejected'} · ${id}` : (res.message || 'Failed'))
    await load()
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111113] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">Pending withdrawals</p>
          <p className="text-[11px] text-zinc-500">
            calabi-owned payouts — pay the creator, then mark paid. No Stripe Express.
          </p>
        </div>
        <button type="button" onClick={load} className="text-xs text-zinc-400 underline hover:text-white">
          Refresh
        </button>
      </div>
      {note ? <p className="text-xs text-zinc-400">{note}</p> : null}
      {!rows.length ? (
        <p className="text-xs text-zinc-600">No pending requests.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="border border-white/5 rounded-lg px-3 py-2 space-y-1 text-xs text-zinc-400">
            <p className="text-sm text-white">
              ${Number(r.amountUsd || 0).toFixed(2)}
              {' · '}
              @{r.handle || r.creatorId}
              {r.displayName ? ` · ${r.displayName}` : ''}
            </p>
            <p>
              Method: {r.methodLabel || r.methodId}
              {' · '}
              {secretHint(r.payoutSecret)}
            </p>
            <p className="text-zinc-600">{String(r.createdAt || '').slice(0, 19)}</p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={!!busy}
                className="underline text-emerald-400 disabled:opacity-40"
                onClick={() => act(r.id, 'paid')}
              >
                {busy === r.id ? '…' : 'Mark paid'}
              </button>
              <button
                type="button"
                disabled={!!busy}
                className="underline text-rose-400 disabled:opacity-40"
                onClick={() => act(r.id, 'reject')}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
