import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listCoinPacks,
  getCoinBalance,
  refreshWalletFromCloud,
  COIN_REDEEMS,
  spendCoins,
} from '../lib/calabiCash'
import { startCalabiCashCheckout } from '../lib/tips'
import { redirectSafeUrl } from '../lib/safeUrl'
import { cn } from '../lib/utils'
import CoinIcon from './CoinIcon'

export default function CalabiCashShop({ compact = false }) {
  const { user, isAuthenticated } = useAuth()
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [, bump] = useState(0)
  const coins = getCoinBalance(user?.id)
  const packs = listCoinPacks()

  useEffect(() => {
    if (!user?.id) return
    refreshWalletFromCloud(user.id).then(() => bump((n) => n + 1)).catch(() => {})
  }, [user?.id])

  const buy = async (tierId) => {
    if (!isAuthenticated) {
      setNote('Sign in with your calabi cloud account to buy Coins.')
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
    setNote(res.message || 'Checkout unavailable. Deploy create-checkout-session and sign in.')
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
        <h2 className="text-lg font-semibold text-white inline-flex items-center gap-2">
          <CoinIcon className="h-5 w-5" /> Coins
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Buy Coins for chat — bigger messages, creator emojis &amp; GIFs, highlights. Tips / TTS use card checkout or creator pricing.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-amber-300 font-semibold">
            <CoinIcon className="h-4 w-4" />
            {coins} Coins
          </span>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1">Balances sync through your cloud account.</p>
      </div>

      <div className="grid gap-3 grid-cols-2">
        {packs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!!busy}
            onClick={() => buy(t.id)}
            className="relative text-center rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-4 hover:border-amber-500/50 transition disabled:opacity-60"
          >
            {t.badge ? (
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide text-zinc-300 bg-black/50 px-2 py-0.5 rounded-md">
                {t.badge}
              </span>
            ) : null}
            <div className="mx-auto flex h-16 w-16 items-center justify-center">
              <CoinIcon className="h-12 w-12" />
            </div>
            <p className="mt-2 text-sm font-bold text-white leading-snug">{t.label}</p>
            <div className="mt-3 w-full rounded-xl bg-zinc-800/90 py-2.5 text-base font-bold text-amber-300">
              {busy === t.id ? '…' : `$${Number(t.usd).toFixed(2)}`}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5">Card checkout</p>
          </button>
        ))}
      </div>

      {note ? <p className="text-xs text-amber-400">{note}</p> : null}

      {!compact ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400 inline-flex items-center gap-1.5">
            <CoinIcon className="h-3.5 w-3.5" /> Spend Coins (chat)
          </p>
          <p className="text-[11px] text-zinc-500 -mt-1">Bigger chat, creator custom emojis/GIFs, highlights.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {COIN_REDEEMS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => redeem(r.id)}
                className="text-left rounded-xl border border-zinc-800 bg-[#121218] px-3 py-2.5 hover:border-amber-700/50"
              >
                <p className="text-sm text-white">{r.label}</p>
                <p className="text-[11px] text-amber-400 mt-0.5 inline-flex items-center gap-1">
                  <CoinIcon className="h-3 w-3" /> {r.coins} coins
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
