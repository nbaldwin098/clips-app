import { useMemo } from 'react'
import { Gift } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getRewardsLedger } from '../lib/rewards'
import PageHeader from './PageHeader'
import AuthRequired from './AuthRequired'

export { getRewardsLedger, accruePurchaseCashback } from '../lib/rewards'

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
        subtitle="Reward coins from purchases"
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
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">History</p>
        {!ledger.entries.length ? (
          <p className="text-sm text-zinc-500">No rewards yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 border border-zinc-800">
            {ledger.entries.map((e) => (
              <li key={e.id} className="px-3 py-3 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-zinc-200 truncate">{e.note || 'Reward'}</p>
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
