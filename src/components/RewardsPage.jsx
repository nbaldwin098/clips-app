import { useMemo } from 'react'
import { Gift } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'
import PageHeader from './PageHeader'
import AuthRequired from './AuthRequired'

/**
 * Reward coins ledger per user.
 * Cashback accrues at 5% of USD spent:
 *   coins = Math.floor(usd * 100 * 0.05)  // or floor(coinsPurchased * 0.05)
 * Key: calabi_rewards_${userId} → { balance, entries: [{ id, at, coins, note, usd? }] }
 */
const CASHBACK_RATE = 0.05

function rewardsKey(userId) {
  return `calabi_rewards_${userId}`
}

function emptyLedger() {
  return { balance: 0, entries: [] }
}

export function getRewardsLedger(userId) {
  if (!userId) return emptyLedger()
  const raw = lsGet(rewardsKey(userId), null)
  if (!raw || typeof raw !== 'object') return emptyLedger()
  return {
    balance: Math.max(0, Math.floor(Number(raw.balance) || 0)),
    entries: Array.isArray(raw.entries) ? raw.entries : [],
  }
}

/** Record 5% cashback for a purchase. usd = list dollars spent. */
export function accruePurchaseCashback(userId, usd, note = 'Purchase cashback') {
  if (!userId) return emptyLedger()
  const amount = Number(usd) || 0
  const coins = Math.floor(amount * 100 * CASHBACK_RATE)
  if (coins <= 0) return getRewardsLedger(userId)
  const ledger = getRewardsLedger(userId)
  const entry = {
    id: `rw_${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    coins,
    usd: amount,
    note,
  }
  const next = {
    balance: ledger.balance + coins,
    entries: [entry, ...ledger.entries].slice(0, 200),
  }
  lsSet(rewardsKey(userId), next)
  return next
}

export default function RewardsPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const ledger = useMemo(() => getRewardsLedger(user?.id), [user?.id])

  if (!isAuthenticated) {
    return (
      <AuthRequired
        title="Rewards"
        description="Sign in to see reward coins."
        onOpenAuth={onOpenAuth}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <PageHeader
        title="Rewards"
        subtitle="5% coins back on purchases"
        onBack={() => onNavigate?.('home')}
      />

      <div className="border border-zinc-800 bg-[#0c0c10] p-5">
        <div className="flex items-center gap-2 text-white">
          <Gift className="h-5 w-5 text-amber-400" />
          <p className="text-sm font-semibold">Reward balance</p>
        </div>
        <p className="mt-3 text-3xl font-semibold text-amber-300 tabular-nums">
          {ledger.balance}
          <span className="ml-2 text-sm font-normal text-zinc-500">coins</span>
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Cashback is 5% of USD spent (floor of cents × 0.05). Entries appear after purchases credit this ledger.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Cashback history</p>
        {!ledger.entries.length ? (
          <p className="text-sm text-zinc-500">No cashback yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 border border-zinc-800">
            {ledger.entries.map((e) => (
              <li key={e.id} className="px-3 py-3 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-zinc-200 truncate">{e.note || 'Cashback'}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    {e.at?.slice?.(0, 16)?.replace('T', ' ') || ''}
                    {e.usd != null ? ` · $${Number(e.usd).toFixed(2)}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-amber-300 tabular-nums">+{e.coins}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
