import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSubscriptionsForUser } from '../lib/engagement'
import { listIndexedUsers } from '../lib/moderation'
import PageHeader from './PageHeader'

export default function SubscriptionsPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const channels = useMemo(() => {
    if (!user?.id) return []
    const ids = getSubscriptionsForUser(user.id)
    const index = Object.fromEntries(listIndexedUsers().map((u) => [u.id, u]))
    return ids.map((id) => index[id] || { id, displayName: 'Creator', handle: id.slice(0, 8) })
  }, [user?.id])

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto text-sm text-zinc-400">
        <button type="button" onClick={onOpenAuth} className="text-white font-medium">Sign in</button> to see subscriptions.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <PageHeader title="Subscriptions" onBack={() => onNavigate?.('home')} />
      {channels.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-12 text-center">
          <Users className="h-8 w-8 text-white mx-auto" />
          <p className="mt-4 text-sm text-zinc-200">No subscriptions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3">
              <div className="h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" /> : (c.displayName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 truncate">{c.displayName}</p>
                <p className="text-xs text-zinc-500">@{c.handle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
