import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PageHeader from './PageHeader'

export default function CreatorWallet({ onNavigate }) {
  const { user } = useAuth()
  const [threshold] = useState(50)
  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Wallet" subtitle="You keep list price minus processor fees" onBack={() => onNavigate?.('dashboard')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <div><p className="text-xs text-zinc-500">Available balance</p><p className="text-3xl font-semibold text-[#007ACC] mt-1">$0.00</p></div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-[#0b0b0f] border border-zinc-800 p-3"><p className="text-zinc-500">Pending</p><p className="text-zinc-100 mt-1">$0.00</p></div>
          <div className="rounded-lg bg-[#0b0b0f] border border-zinc-800 p-3"><p className="text-zinc-500">Lifetime</p><p className="text-zinc-100 mt-1">$0.00</p></div>
        </div>
        <p className="text-[11px] text-zinc-500">Payouts at ${threshold} via Stripe Connect when live. {user?.email}</p>
        <button type="button" disabled className="w-full h-10 rounded-lg bg-[#007ACC]/40 text-white text-sm">Withdraw (connect Stripe)</button>
        <button type="button" onClick={() => onNavigate?.('checkout')} className="w-full h-10 rounded-lg border border-zinc-700 text-[#007ACC] text-sm">Membership pricing</button>
      </div>
    </div>
  )
}
