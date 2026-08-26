import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import CalabiCashShop from '../CalabiCashShop'
import CoinIcon from '../CoinIcon'
import { listCoinLedger, listCoinPacks, refreshWalletFromCloud } from '../../lib/calabiCash'
import { SettingsPageHeader, SettingsTabs } from './SettingsTemplates'

function formatWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(iso)
  }
}

function orderLabel(row, packsById) {
  const pack = row.tierId ? packsById.get(row.tierId) : null
  if (pack) return pack.label
  if (row.note) return row.note
  if (row.kind === 'pack' || row.kind === 'coin_credit') return 'Coin pack'
  if (row.kind === 'redeem' || row.kind === 'coin_debit') return 'Spent'
  return row.kind || 'Order'
}

function CoinOrdersPanel() {
  const { user } = useAuth()
  const [, bump] = useState(0)
  const packsById = new Map(listCoinPacks().map((p) => [p.id, p]))
  const rows = listCoinLedger(user?.id)

  useEffect(() => {
    if (!user?.id) return
    refreshWalletFromCloud(user.id).then(() => bump((n) => n + 1)).catch(() => {})
  }, [user?.id])

  if (!user?.id) {
    return <p className="text-sm text-zinc-500">Sign in to see coin orders.</p>
  }

  if (!rows.length) {
    return <p className="text-sm text-zinc-500">No coin orders yet. Buy a pack on the Coins tab.</p>
  }

  return (
    <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
      {rows.map((row, i) => {
        const delta = Number(row.delta) || 0
        const usd = Number(row.usd) || 0
        const credit = delta > 0
        return (
          <li
            key={`${row.at || i}_${row.kind}_${delta}`}
            className="flex items-center gap-3 px-4 py-3 bg-[#0c0c10]"
          >
            <CoinIcon className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">{orderLabel(row, packsById)}</p>
              <p className="text-[11px] text-zinc-500">{formatWhen(row.at)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-semibold tabular-nums ${credit ? 'text-amber-300' : 'text-zinc-300'}`}>
                {credit ? '+' : ''}{delta.toLocaleString()} coins
              </p>
              {usd > 0 ? (
                <p className="text-[11px] text-zinc-500 tabular-nums">${usd.toFixed(2)}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Site-settings Coins — buy packs + order history. */
export default function WalletSettings({ onNavigate, initialTab = null }) {
  const start = initialTab === 'orders' ? 'orders' : 'coins'
  const [tab, setTab] = useState(start)

  useEffect(() => {
    setTab(initialTab === 'orders' ? 'orders' : 'coins')
  }, [initialTab])

  const onTab = (next) => {
    setTab(next)
    onNavigate?.('settings', 'wallet', next === 'orders' ? { tab: 'orders' } : {})
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader title="Coins" />
      <SettingsTabs
        tabs={[
          { id: 'coins', label: 'Coins' },
          { id: 'orders', label: 'Orders' },
        ]}
        active={tab}
        onChange={onTab}
      />
      {tab === 'orders' ? <CoinOrdersPanel /> : <CalabiCashShop />}
    </div>
  )
}
