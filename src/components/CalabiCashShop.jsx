import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listCashTiersForUser,
  getCalabiCashBalance,
  listCashLedger,
  CALABI_CASH_PER_USD,
} from '../lib/calabiCash'
import { startCalabiCashCheckout } from '../lib/tips'
import { redirectSafeUrl } from '../lib/safeUrl'
import { getStripePaymentLink } from '../lib/stripeConfig'
import { REV_SPLIT_COPY } from '../lib/revenueSplit'

export default function CalabiCashShop({ compact = false }) {
  const { user, isAuthenticated } = useAuth()
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [, bump] = useState(0)
  const bal = getCalabiCashBalance(user?.id)
  const tiers = listCashTiersForUser(user?.id)
  const ledger = listCashLedger(user?.id, 8)

  const buy = async (tierId) => {
    if (!isAuthenticated) {
      setNote('Sign in to buy Calabi Cash.')
      return
    }
    setBusy(tierId)
    setNote('')
    const res = await startCalabiCashCheckout({ user, tierId })
    setBusy('')
    if (res.url) {
      redirectSafeUrl(res.url)
      return
    }
    setNote(res.message || 'Checkout unavailable. Add a Stripe Payment Link to finish purchases.')
    bump((n) => n + 1)
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      <div>
        <h2 className="text-lg font-semibold text-white">Calabi Cash</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {CALABI_CASH_PER_USD} Cash = $1.00. Tip lives, videos, clips, and pics. Balance:{' '}
          <span className="text-white font-semibold">{bal}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">{REV_SPLIT_COPY.body}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!!busy}
            onClick={() => buy(t.id)}
            className="text-left rounded-xl border border-zinc-800 bg-[#121218] p-4 hover:border-zinc-600 transition"
          >
            <p className="text-sm font-semibold text-white">{t.label}</p>
            <p className="text-xs text-zinc-400 mt-1">
              ${t.usd.toFixed(2)}
              {t.bonusPct ? ` · +${t.bonusPct}% bonus` : ''}
              {t.once ? ' · one-time' : ''}
            </p>
            <p className="text-[11px] text-zinc-500 mt-2">
              {busy === t.id ? 'Opening checkout…' : getStripePaymentLink() ? 'Buy with card' : 'Needs Payment Link'}
            </p>
          </button>
        ))}
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {!compact && ledger.length ? (
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-2">Recent Cash activity</p>
          <ul className="space-y-1 text-xs text-zinc-500">
            {ledger.map((r, i) => (
              <li key={`${r.at}-${i}`}>
                {r.delta > 0 ? '+' : ''}{r.delta} · {r.kind} · bal {r.balance}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
