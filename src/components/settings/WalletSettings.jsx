import { useEffect, useState } from 'react'
import { CreditCard, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CalabiCashShop from '../CalabiCashShop'
import { listCoinPacks, refreshWalletFromCloud, getCoinBalance } from '../../lib/calabiCash'
import {
  listPaymentMethods,
  savePaymentMethod,
  removePaymentMethod,
  shouldPromptSavePayment,
  clearPaymentSavePrompt,
} from '../../lib/paymentMethods'
import StudioShell, { StudioCard, StudioKpi } from '../dash/StudioShell'
import AuthRequired from '../AuthRequired'

const NAV = [
  { id: 'coins', label: 'Coins', icon: Wallet, group: 'Wallet' },
  { id: 'payments', label: 'Payment methods', icon: CreditCard, group: 'Wallet' },
]

export default function WalletSettings({ onNavigate, onOpenAuth, initialTab = null }) {
  const { user, isAuthenticated } = useAuth()
  const start = initialTab === 'payments' ? 'payments' : 'coins'
  const [tab, setTab] = useState(start)
  const [, bump] = useState(0)
  const [savePrompt, setSavePrompt] = useState(false)

  useEffect(() => {
    setTab(initialTab === 'payments' ? 'payments' : 'coins')
  }, [initialTab])

  useEffect(() => {
    if (!user?.id) return
    refreshWalletFromCloud(user.id).then(() => bump((n) => n + 1)).catch(() => {})
    if (shouldPromptSavePayment(user.id)) setSavePrompt(true)
  }, [user?.id])

  const methods = listPaymentMethods(user?.id)
  const coins = getCoinBalance(user?.id)

  if (!isAuthenticated) {
    const packs = listCoinPacks()
    return (
      <StudioShell tone="dark" title="Wallet" nav={NAV} activeId="coins" onNav={() => {}} onBack={() => onNavigate?.('home')} onNotify={() => onNavigate?.('notifications')} onHelp={() => onNavigate?.('help')}>
        <div className="space-y-6 max-w-3xl">
          <p className="text-sm text-zinc-500">Sign in to buy coins and manage payment methods.</p>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {packs.map((p) => (
              <div key={p.id} className="border border-white/10 bg-[#141414] p-4 text-center">
                <p className="text-sm font-bold text-white">{p.label}</p>
                <p className="mt-2 text-base font-bold text-white">${Number(p.usd).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <AuthRequired
            title="Sign in to buy"
            description="Cloud account required to purchase Coins."
            onOpenAuth={onOpenAuth}
          />
        </div>
      </StudioShell>
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
      tone="dark"
      title="Wallet"
      nav={NAV}
      activeId={tab}
      onNav={onTab}
      onBack={() => onNavigate?.('home')}
      onNotify={() => onNavigate?.('notifications')}
      onHelp={() => onNavigate?.('help')}
    >
      <div className="space-y-5 max-w-4xl">
        <div className="grid sm:grid-cols-2 gap-3">
          <StudioKpi label="Coin balance" value={coins.toLocaleString()} icon={Wallet} />
          <StudioKpi label="Saved methods" value={String(methods.length)} icon={CreditCard} />
        </div>

        {savePrompt ? (
          <StudioCard title="Save payment method?">
            <p className="text-sm text-zinc-400 mb-3">Use this card again in Shop and Wallet.</p>
            <div className="flex gap-2">
              <button type="button" onClick={acceptSave} className="h-9 px-3 bg-white text-black text-xs font-semibold">Save</button>
              <button type="button" onClick={() => { clearPaymentSavePrompt(user.id); setSavePrompt(false) }} className="h-9 px-3 border border-white/20 text-xs">Not now</button>
            </div>
          </StudioCard>
        ) : null}

        {tab === 'coins' ? (
          <StudioCard title="Buy coins">
            <CalabiCashShop />
          </StudioCard>
        ) : null}

        {tab === 'payments' ? (
          <StudioCard title="Payment methods">
            <p className="text-xs text-zinc-500 mb-3">Shared with Shop. Brand + last four only.</p>
            {!methods.length ? (
              <p className="text-sm text-zinc-500">No saved methods yet.</p>
            ) : (
              <ul className="divide-y divide-white/10 border border-white/10 overflow-hidden">
                {methods.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <CreditCard className="h-4 w-4 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{m.label}</p>
                      <p className="text-[11px] text-zinc-500">Exp {m.expMonth}/{m.expYear}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { removePaymentMethod(user.id, m.id); bump((n) => n + 1) }}
                      className="text-[11px] text-zinc-500 hover:text-white"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => onNavigate?.('shop')} className="mt-3 text-xs text-zinc-300 hover:text-white">
              Open Shop →
            </button>
          </StudioCard>
        ) : null}
      </div>
    </StudioShell>
  )
}
