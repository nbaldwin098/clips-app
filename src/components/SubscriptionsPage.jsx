import { useMemo } from 'react'
import { Crown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isPremiumSub } from '../lib/engagement'
import { listIndexedUsers } from '../lib/moderation'
import { useContentSyncTick } from '../lib/useContentSync'
import { lsGet } from '../lib/storage'
import AuthRequired from './AuthRequired'
import StudioShell, { StudioCard, StudioKpi } from './dash/StudioShell'

/** Creators where this user holds a premium live membership. */
function listPremiumMemberships(userId) {
  if (!userId) return []
  const index = listIndexedUsers() || []
  const byId = new Map(index.map((u) => [u.id, u]))
  const ids = new Set()

  for (const u of index) {
    if (u?.id && isPremiumSub(userId, u.id)) ids.add(u.id)
  }

  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('premium_')) continue
      const creatorId = key.slice('premium_'.length)
      if (!creatorId || ids.has(creatorId)) continue
      const list = lsGet(key, []) || []
      if (list.includes(userId)) ids.add(creatorId)
    }
  }

  return [...ids].map((id) => byId.get(id) || { id, displayName: 'Creator', handle: id.slice(0, 8) })
}

export default function SubscriptionsPage({ onNavigate, onOpenAuth, onOpenProfile }) {
  const { user, isAuthenticated } = useAuth()
  const syncTick = useContentSyncTick()
  const memberships = useMemo(
    () => (user?.id ? listPremiumMemberships(user.id) : []),
    [user?.id, syncTick],
  )

  if (!isAuthenticated) {
    return (
      <StudioShell tone="light" title="Subscriptions" onBack={() => onNavigate?.('home')} onNotify={() => onNavigate?.('notifications')} onHelp={() => onNavigate?.('help')}>
        <AuthRequired
          light
          title="Subscriptions"
          description="Sign in to see your premium live memberships."
          onOpenAuth={onOpenAuth}
        />
      </StudioShell>
    )
  }

  return (
    <StudioShell
      tone="light"
      title="Subscriptions"
      nav={[{ id: 'subs', label: 'Memberships', icon: Crown, group: 'Account' }]}
      activeId="subs"
      onNav={() => {}}
      onBack={() => onNavigate?.('home')}
      onNotify={() => onNavigate?.('notifications')}
      onHelp={() => onNavigate?.('help')}
    >
      <div className="space-y-5 max-w-2xl">
        <StudioKpi label="Active memberships" value={String(memberships.length)} icon={Crown} />
        <StudioCard title="Premium live memberships">
          {memberships.length === 0 ? (
            <div className="py-8 text-center">
              <Crown className="h-8 w-8 text-neutral-300 mx-auto" />
              <p className="mt-4 text-sm text-neutral-800">No premium memberships yet.</p>
              <p className="mt-1 text-xs text-neutral-500">
                Premium is for livestream channels. Follow stays free on the Following feed.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {memberships.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onOpenProfile?.(c.handle, c.id)}
                    className="w-full flex items-center gap-3 px-1 py-3 text-left hover:bg-neutral-50 rounded-lg"
                  >
                    <div className="h-10 w-10 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                      {c.avatarUrl
                        ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                        : (c.displayName || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-900 truncate">{c.displayName}</p>
                      <p className="text-[11px] text-neutral-500 truncate">@{c.handle}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-[#fe2c55] shrink-0">Premium</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </StudioCard>
      </div>
    </StudioShell>
  )
}
