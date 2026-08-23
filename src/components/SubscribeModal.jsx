import React, { useState } from 'react'
import {
  X,
  Gift,
  Check,
  Sparkles,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

export default function SubscribeModal({ open, onClose, channel }) {
  const { accent, accentKey } = useTheme()
  const [selectedTier, setSelectedTier] = useState(1)
  const [isSubbed, setIsSubbed] = useState(false)

  if (!open) return null

  const tiers = [
    {
      tier: 1,
      name: 'Tier 1 Sub',
      price: '$4.99/mo',
      perks: [
        'Ad-free viewing on this channel',
        'Custom channel sub badge & 15 emotes',
        'Chat in Subscriber-Only mode',
        'Access to subscriber discord role',
      ],
    },
    {
      tier: 2,
      name: 'Tier 2 Sub',
      price: '$9.99/mo',
      perks: [
        'All Tier 1 Perks included',
        'Exclusive animated golden emotes',
        '2x Channel Point multiplier',
        'VIP highlight in live chat stream',
      ],
    },
    {
      tier: 3,
      name: 'Tier 3 Sub',
      price: '$24.99/mo',
      perks: [
        'All Tier 1 & Tier 2 Perks',
        'Direct shoutout on stream',
        'Ultra founder animated badge',
        '3x Channel Point multiplier',
        'Custom monthly sub sound alert',
      ],
    },
  ]

  const handleSubscribe = () => {
    setIsSubbed(true)
    setTimeout(() => {
      setIsSubbed(false)
      onClose()
    }, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[#2e2e3d] bg-[#12121a] shadow-2xl overflow-hidden z-10 animate-in zoom-in-95">
        
        {/* Header with Channel Banner */}
        <div className="relative p-6 bg-gradient-to-br from-[#1b1b26] to-[#121218] border-b border-[#252533]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src={channel?.avatar}
              alt={channel?.displayName}
              className="h-14 w-14 rounded-full object-cover border-2 shadow-lg"
              style={{ borderColor: accent.primary }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Support Creator
                </span>
              </div>
              <h2 className="text-lg font-black text-white">
                Subscribe to {channel?.displayName}
              </h2>
              <p className="text-xs text-zinc-400">
                Support the broadcast and unlock exclusive chat badges & emotes!
              </p>
            </div>
          </div>
        </div>

        {/* Tier Selection */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {tiers.map((t) => (
              <button
                key={t.tier}
                type="button"
                onClick={() => setSelectedTier(t.tier)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative',
                  selectedTier === t.tier
                    ? 'bg-[#1e1e2d] border-[var(--color-accent-primary)] shadow-md'
                    : 'bg-[#161622] border-[#252535] text-zinc-400 hover:border-zinc-500'
                )}
              >
                {selectedTier === t.tier && (
                  <span
                    className="absolute -top-2 right-2 h-4 w-4 rounded-full flex items-center justify-center text-black"
                    style={{ backgroundColor: accent.primary }}
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <span className="text-xs font-bold text-white block">
                  {t.name}
                </span>
                <span className="text-sm font-extrabold text-[var(--color-accent-primary)] mt-1 block">
                  {t.price}
                </span>
              </button>
            ))}
          </div>

          {/* Perks list for selected tier */}
          <div className="p-4 rounded-xl bg-[#161622] border border-[#242433] space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Included Perks:
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {tiers.find((t) => t.tier === selectedTier)?.perks.map((p, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Checkout / Confirm Button */}
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isSubbed}
            className="w-full h-11 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-98"
            style={{
              backgroundColor: accent.primary,
              color: accentKey === 'green' ? '#000000' : '#ffffff',
              boxShadow: `0 0 20px ${accent.glow}`,
            }}
          >
            {isSubbed ? (
              <>
                <Check className="h-4 w-4" />
                <span>Subscription Confirmed! 🎉</span>
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                <span>Subscribe for {tiers.find((t) => t.tier === selectedTier)?.price}</span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-zinc-500">
            Cancel anytime in Account Settings. Recurring billing.
          </p>
        </div>
      </div>
    </div>
  )
}
