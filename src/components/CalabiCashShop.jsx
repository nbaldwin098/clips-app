import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listCashTiersForUser,
  getCalabiCashBalance,
  getCoinBalance,
  listCashLedger,
  CALABI_CASH_PER_USD,
  formatCash,
  purchaseCashPack,
  refreshWalletFromCloud,
  COIN_REDEEMS,
  spendCoins,
} from '../lib/calabiCash'
import { startCalabiCashCheckout } from '../lib/tips'
import { redirectSafeUrl } from '../lib/safeUrl'
import { getStripePaymentLink } from '../lib/stripeConfig'
import { REV_SPLIT_COPY } from '../lib/revenueSplit'
import { cn } from '../lib/utils'

function CashStack({ stack = 1 }) {
  const n = Math.max(1, Math.min(6, Number(stack) || 1))
  return (
    <div className="relative mx-auto h-24 w-28 flex items-end justify-center">
      <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-2xl" />
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="absolute w-16 h-10 rounded-md border border-emerald-400/40 bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg"
          style={{
            bottom: 8 + i * 7,
            left: `calc(50% - 2rem + ${(i - (n - 1) / 2) * 4}px)`,
            transform: `rotate(${(i - (n - 1) / 2) * 4}deg)`,
            zIndex: i,
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/90 tracking-widest">
            C
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CalabiCashShop({ compact = false }) {
  const { user, isAuthenticated } = useAuth()
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [, bump] = useState(0)
  const bal = getCalabiCashBalance(user?.id)
  const coins = getCoinBalance(user?.id)
  const tiers = listCashTiersForUser(user?.id)
  const ledger = listCashLedger(user?.id, 8)

  useEffect(() => {
    if (!user?.id) return
    refreshWalletFromCloud(user.id).then(() => bump((n) => n + 1)).catch(() => {})
  }, [user?.id])

  const buy = async (tierId) => {
    if (!isAuthenticated) {
      setNote('Sign in with your calabi cloud account to buy Cash.')
      return
    }
    setBusy(tierId)
    setNote('')
    const res = await startCalabiCashCheckout({ user, tierId })
    if (res.url) {
      setBusy('')
      redirectSafeUrl(res.url)
      return
    }
    // No Payment Link — credit on cloud so packs still work in prod setup
    const local = await purchaseCashPack(user.id, tierId)
    setBusy('')
    if (local.ok) {
      setNote(`Added ${formatCash(local.addedCash)} Cash + ${local.addedCoins} Gold Coins (cloud wallet).`)
      bump((n) => n + 1)
      return
    }
    setNote(local.error || res.message || 'Checkout unavailable. Add a Stripe Payment Link or run migration 0016.')
    bump((n) => n + 1)
  }

  const redeem = async (id) => {
    if (!user?.id) return
    const item = COIN_REDEEMS.find((r) => r.id === id)
    if (!item) return
    const res = spendCoins(user.id, item.coins, { kind: 'redeem', note: item.label })
    setNote(res.ok ? `Spent ${item.coins} coins · ${item.label}` : (res.error || 'Could not redeem'))
    bump((n) => n + 1)
  }

  return (
    <div className={cn(compact ? 'space-y-3' : 'space-y-6')}>
      <div>
        <h2 className="text-lg font-semibold text-white">Calabi Cash</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {CALABI_CASH_PER_USD} Cash = $1.00. Packs come with Gold Coins too.
        </p>
        <p className="text-xs text-zinc-500 mt-1.5">
          <span className="text-emerald-400/90 font-medium">Cash</span> — donations, TTS, premium, and paid features.
          {' '}
          <span className="text-amber-400/90 font-medium">Coins</span> — chat: bigger messages, creator emojis &amp; GIFs, and more later.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-emerald-300 font-semibold">
            {formatCash(bal)} Cash
          </span>
          <span className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-amber-300 font-semibold">
            {coins} Gold Coins
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">{REV_SPLIT_COPY.body}</p>
        <p className="text-[11px] text-zinc-600 mt-1">Balances sync through your cloud account — not this device alone.</p>
      </div>

      <div className="grid gap-3 grid-cols-2">
        {tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!!busy}
            onClick={() => buy(t.id)}
            className="relative text-center rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 hover:border-emerald-500/50 transition disabled:opacity-60"
          >
            {t.badge || t.once ? (
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide text-zinc-300 bg-black/50 px-2 py-0.5 rounded-md">
                {t.badge || 'Free deal'}
              </span>
            ) : null}
            <CashStack stack={t.stack || 1} />
            <p className="mt-2 text-sm font-bold text-white leading-snug">{t.label}</p>
            {(t.coins || 0) > 0 ? (
              <p className="text-[11px] text-amber-300/90 mt-1">+{t.coins} Gold Coins</p>
            ) : null}
            <div className="mt-3 w-full rounded-xl bg-slate-800/90 py-2.5 text-base font-bold text-emerald-400">
              {busy === t.id ? '…' : `$${Number(t.usd).toFixed(2)}`}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5">
              {getStripePaymentLink() ? 'Card checkout' : 'Cloud wallet credit'}
            </p>
          </button>
        ))}
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {!compact ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400">Spend Gold Coins (chat)</p>
          <p className="text-[11px] text-zinc-500 -mt-1">Bigger chat, creator custom emojis/GIFs, highlights — more chat perks later.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {COIN_REDEEMS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => redeem(r.id)}
                className="text-left rounded-xl border border-zinc-800 bg-[#121218] px-3 py-2.5 hover:border-amber-700/50"
              >
                <p className="text-sm text-white">{r.label}</p>
                <p className="text-[11px] text-amber-400 mt-0.5">{r.coins} coins</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
