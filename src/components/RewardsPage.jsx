import { useMemo } from 'react'
import { Gift } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getRewardsLedger } from '../lib/rewards'
import AuthRequired from './AuthRequired'
import DashboardShell, { DashCard, DashKpi } from './dash/DashboardShell'

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
    <DashboardShell
      title="Rewards"
      nav={[{ id: 'rewards', label: 'Rewards', icon: Gift, group: 'Account' }]}
      activeId="rewards"
      onNav={() => {}}
      onBack={() => onNavigate?.('home')}
    >
      <div className="space-y-5 max-w-lg">
        <DashKpi label="Reward balance" value={ledger.balance.toLocaleString()} icon={Gift} hint="coins" />
        <DashCard title="History">
          {!ledger.entries.length ? (
            <p className="text-sm text-slate-500">No rewards yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {ledger.entries.map((e) => (
                <li key={e.id} className="px-3 py-3 text-sm flex items-start justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <p className="text-slate-800 truncate">{e.note || 'Reward'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {e.at?.slice?.(0, 16)?.replace('T', ' ') || ''}
                      {e.usd != null ? ` · $${Number(e.usd).toFixed(2)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-amber-600 tabular-nums font-semibold">+{e.coins}</span>
                </li>
              ))}
            </ul>
          )}
        </DashCard>
      </div>
    </DashboardShell>
  )
}
