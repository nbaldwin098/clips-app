import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { creatorBalance, getPayoutContact, setPayoutContact, listPayoutLedger } from '../lib/payouts'
import PageHeader from './PageHeader'

export default function CreatorWallet({ onNavigate }) {
  const { user } = useAuth()
  const approved = user?.creatorStatus === 'approved'
  const b = creatorBalance(user?.id, user?.handle)
  const [contact, setContact] = useState(() => getPayoutContact(user?.id))
  const mine = listPayoutLedger().filter((r) => r.userId === user?.id)

  useEffect(() => {
    if (!user?.id || !approved) return
    setPayoutContact(user.id, contact)
  }, [user?.id, approved, contact])

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <PageHeader title="Wallet" subtitle="Payouts are sent by hand after you apply and are approved." onBack={() => onNavigate?.('dashboard')} />
      {!approved ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 text-sm text-zinc-300">
          <p>You can post and go live without this. Earning is a separate application.</p>
          <button type="button" className="mt-3 h-10 px-4 rounded-lg bg-white text-black text-sm font-semibold" onClick={() => onNavigate?.('creator-apply')}>
            Apply to earn
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
              <p className="text-[10px] uppercase text-zinc-500">Paid</p>
              <p className="text-xl font-semibold text-white">${b.paid.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
              <p className="text-[10px] uppercase text-zinc-500">Views</p>
              <p className="text-xl font-semibold text-white">{b.views}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Views do not turn into a dollar rate. Nicholas marks money sent from Admin after you save a pay-to handle. There is no withdraw button.</p>
          <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-3">
            <p className="text-sm font-medium text-white">Where to send money</p>
            <p className="text-[11px] text-zinc-500">Saved as you type.</p>
            <select value={contact.method} onChange={(e) => setContact((c) => ({ ...c, method: e.target.value }))} className="w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white">
              <option value="paypal">PayPal</option>
              <option value="venmo">Venmo</option>
              <option value="cashapp">Cash App</option>
              <option value="other">Other</option>
            </select>
            <input value={contact.handle} onChange={(e) => setContact((c) => ({ ...c, handle: e.target.value }))} placeholder="PayPal email / Venmo / Cash tag" className="w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
            <input value={contact.note} onChange={(e) => setContact((c) => ({ ...c, note: e.target.value }))} placeholder="Note for the owner" className="w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
          </div>
        </>
      )}
      <div className="mt-6">
        <p className="text-sm text-white mb-2">Payout history</p>
        {mine.length === 0 ? <p className="text-xs text-zinc-500">Nothing marked sent yet.</p> : mine.map((r) => (
          <p key={r.id} className="text-xs text-zinc-400 py-1">${r.amount.toFixed(2)} · {r.sentVia} · {r.at?.slice(0, 10)}</p>
        ))}
      </div>
    </div>
  )
}
