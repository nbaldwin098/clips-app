import { useMemo } from 'react'
import { Crown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isPremiumSub } from '../lib/engagement'
import { listIndexedUsers } from '../lib/moderation'
import { useContentSyncTick } from '../lib/useContentSync'
import { lsGet } from '../lib/storage'
import PageHeader from './PageHeader'
import AuthRequired from './AuthRequired'

/** Creators where this user holds a premium live membership. */
function listPremiumMemberships(userId) {
  if (!userId) return []
  const index = listIndexedUsers() || []
  const byId = new Map(index.map((u) => [u.id, u]))
  const ids = new Set()

  for (const u of index) {
    if (u?.id && isPremiumSub(userId, u.id)) ids.add(u.id)
  }

  // Scan local premium_* keys in case creator is not in the index yet.
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
      <AuthRequired
        title="Subscriptions"
        description="Sign in to see your premium live memberships."
        onOpenAuth={onOpenAuth}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[800px] mx-auto space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Premium live memberships"
        onBack={() => onNavigate?.('home')}
      />

      {memberships.length === 0 ? (
        <div className="border border-zinc-800 bg-[#121218] px-6 py-12 text-center">
          <Crown className="h-8 w-8 text-zinc-500 mx-auto" />
          <p className="mt-4 text-sm text-zinc-200">No premium memberships yet.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Premium is for livestream channels. Follow stays free on the Following feed.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800 border border-zinc-800">
          {memberships.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpenProfile?.(c.handle, c.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#181820]"
              >
                <div className="h-10 w-10 rounded-full bg-white/15 text-white flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                  {c.avatarUrl
                    ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : (c.displayName || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{c.displayName}</p>
                  <p className="text-[11px] text-zinc-500 truncate">@{c.handle}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-amber-400 shrink-0">Premium</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
