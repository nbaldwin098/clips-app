import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CalabiCashShop from '../CalabiCashShop'
import CoinIcon from '../CoinIcon'
import { listCoinLedger, listCoinPacks, refreshWalletFromCloud, getCoinBalance } from '../../lib/calabiCash'
import {
  listPaymentMethods,
  savePaymentMethod,
  removePaymentMethod,
  shouldPromptSavePayment,
  clearPaymentSavePrompt,
} from '../../lib/paymentMethods'
import StudioShell, { StudioCard, StudioKpi } from '../dash/StudioShell'
import AuthRequired from '../AuthRequired'

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

const NAV = [
  { id: 'coins', label: 'Coins', icon: Wallet, group: 'Wallet' },
  { id: 'orders', label: 'Orders', icon: Wallet, group: 'Wallet' },
  { id: 'payments', label: 'Payment methods', icon: CreditCard, group: 'Wallet' },
]

/** Coins + Orders + payment methods — TikTok-white studio shell (profile menu). */
export default function WalletSettings({ onNavigate, onOpenAuth, initialTab = null }) {
  const { user, isAuthenticated } = useAuth()
  const start = initialTab === 'orders' || initialTab === 'payments' ? initialTab : 'coins'
  const [tab, setTab] = useState(start)
  const [, bump] = useState(0)
  const [savePrompt, setSavePrompt] = useState(false)

  useEffect(() => {
    setTab(initialTab === 'orders' || initialTab === 'payments' ? initialTab : 'coins')
  }, [initialTab])

  useEffect(() => {
    if (!user?.id) return
    refreshWalletFromCloud(user.id).then(() => bump((n) => n + 1)).catch(() => {})
    if (shouldPromptSavePayment(user.id)) setSavePrompt(true)
  }, [user?.id])

  const packsById = useMemo(() => new Map(listCoinPacks().map((p) => [p.id, p])), [])
  const rows = listCoinLedger(user?.id)
  const methods = listPaymentMethods(user?.id)
  const coins = getCoinBalance(user?.id)

  if (!isAuthenticated) {
    const packs = listCoinPacks()
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Wallet</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to buy coins and manage payment methods.</p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {packs.map((p) => (
            <div key={p.id} className="border border-neutral-200 bg-white p-4 text-center rounded-xl">
              <p className="text-sm font-bold text-neutral-900">{p.label}</p>
              <p className="mt-2 text-base font-bold text-neutral-900">${Number(p.usd).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <AuthRequired
          title="Sign in to buy"
          description="Cloud account required to purchase Coins."
          onOpenAuth={onOpenAuth}
        />
      </div>
    )
  }

  const onTab = (next) => {
    setTab(next)
    onNavigate?.('wallet', '', next === 'coins' ? {} : { tab: next })
  }

  const acceptSave = () => {
    savePaymentMethod(user.id, { brand: 'Visa', last4: '4242', expMonth: 12, expYear: new Date().getFullYear() + 3 })
    clearPaymentSavePrompt(user.id)
    setSavePrompt(false)
    bump((n) => n + 1)
    setTab('payments')
  }

  return (
    <StudioShell
      title="Wallet"
      nav={NAV}
      activeId={tab}
      onNav={onTab}
      onBack={() => onNavigate?.('home')}
    >
      <div className="space-y-5 max-w-4xl">
        <div className="grid sm:grid-cols-3 gap-3">
          <StudioKpi label="Coin balance" value={coins.toLocaleString()} icon={Wallet} />
          <StudioKpi label="Orders" value={String(rows.length)} icon={Wallet} />
          <StudioKpi label="Saved methods" value={String(methods.length)} icon={CreditCard} />
        </div>

        {savePrompt ? (
          <StudioCard title="Save payment method?">
            <p className="text-sm text-slate-600 mb-3">Use this card again in Shop and Wallet.</p>
            <div className="flex gap-2">
              <button type="button" onClick={acceptSave} className="h-9 px-3 bg-neutral-900 text-white text-xs font-semibold rounded-lg">Save</button>
              <button type="button" onClick={() => { clearPaymentSavePrompt(user.id); setSavePrompt(false) }} className="h-9 px-3 border border-slate-300 text-xs rounded-lg">Not now</button>
            </div>
          </StudioCard>
        ) : null}

        {tab === 'coins' ? (
          <StudioCard title="Buy coins">
            <CalabiCashShop />
          </StudioCard>
        ) : null}

        {tab === 'orders' ? (
          <StudioCard title="Coin orders">
            {!rows.length ? (
              <div className="text-center space-y-3 py-4">
                <p className="text-sm text-slate-500">No coin orders yet.</p>
                <button type="button" onClick={() => onTab('coins')} className="h-9 px-4 bg-neutral-900 text-white text-xs font-semibold rounded-lg">Buy Coins</button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {rows.map((row, i) => {
                  const delta = Number(row.delta) || 0
                  const usd = Number(row.usd) || 0
                  const credit = delta > 0
                  return (
                    <li key={`${row.at || i}_${row.kind}_${delta}`} className="flex items-center gap-3 px-4 py-3 bg-white">
                      <CoinIcon className="h-5 w-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900 truncate">{orderLabel(row, packsById)}</p>
                        <p className="text-[11px] text-slate-500">{formatWhen(row.at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold tabular-nums ${credit ? 'text-amber-600' : 'text-slate-700'}`}>
                          {credit ? '+' : ''}{delta.toLocaleString()} coins
                        </p>
                        {usd > 0 ? <p className="text-[11px] text-slate-500 tabular-nums">${usd.toFixed(2)}</p> : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </StudioCard>
        ) : null}

        {tab === 'payments' ? (
          <StudioCard title="Payment methods">
            <p className="text-xs text-slate-500 mb-3">Shared with Shop. Brand + last four only.</p>
            {!methods.length ? (
              <p className="text-sm text-slate-500">No saved methods yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {methods.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900">{m.label}</p>
                      <p className="text-[11px] text-slate-500">Exp {m.expMonth}/{m.expYear}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { removePaymentMethod(user.id, m.id); bump((n) => n + 1) }}
                      className="text-[11px] text-slate-500 hover:text-slate-900"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => onNavigate?.('shop')} className="mt-3 text-xs text-sky-600 hover:text-sky-700">
              Open Shop →
            </button>
          </StudioCard>
        ) : null}
      </div>
    </StudioShell>
  )
}
