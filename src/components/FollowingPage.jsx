import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSubscriptionsForUser } from '../lib/engagement'
import { getFollowingFeed } from '../lib/contentService'
import { listIndexedUsers } from '../lib/moderation'
import { useContentSyncTick } from '../lib/useContentSync'
import PageHeader from './PageHeader'
import MediaShelves from './MediaShelves'

export default function FollowingPage({ onNavigate, onOpenAuth, onPlayItem, onOpenPic, onOpenProfile }) {
  const { user, isAuthenticated } = useAuth()
  const syncTick = useContentSyncTick()
  const channels = useMemo(() => {
    if (!user?.id) return []
    const ids = getSubscriptionsForUser(user.id)
    const index = Object.fromEntries(listIndexedUsers().map((u) => [u.id, u]))
    return ids.map((id) => index[id] || { id, displayName: 'Creator', handle: id.slice(0, 8) })
  }, [user?.id, syncTick])
  const uploads = useMemo(() => (user?.id ? getFollowingFeed(user.id) : []), [user?.id, syncTick])

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto text-sm text-zinc-400">
        <button type="button" onClick={onOpenAuth} className="text-white font-medium">Sign in</button> to see live creators you follow.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-8">
      <PageHeader title="Following" subtitle="Live first, then offline" onBack={() => onNavigate?.('home')} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Live</h2>
        <div className="border border-zinc-800 bg-[#121218] px-6 py-10 text-center">
          <p className="text-sm text-zinc-200">No one you follow is live</p>
          <p className="mt-1 text-xs text-zinc-500">Lives appear from ingest. We do not invent channels.</p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Offline</h2>
        {channels.length === 0 ? (
          <div className="border border-zinc-800 bg-[#121218] px-6 py-12 text-center">
            <Users className="h-8 w-8 text-white mx-auto" />
            <p className="mt-4 text-sm text-zinc-200">Not following anyone yet</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {channels.map((c) => (
              <button key={c.id} type="button" onClick={() => onOpenProfile?.(c.handle, c.id)} className="shrink-0 w-28 text-center">
                <div className="h-12 w-12 mx-auto rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                  {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" /> : (c.displayName || '?')[0].toUpperCase()}
                </div>
                <p className="mt-1.5 text-xs text-zinc-100 truncate">{c.displayName}</p>
                <p className="text-[10px] text-zinc-500 truncate">@{c.handle}</p>
              </button>
            ))}
          </div>
        )}
      </section>
      {uploads.length === 0 ? (
        channels.length > 0 ? (
          <div className="border border-zinc-800 bg-[#121218] px-6 py-12 text-center">
            <p className="text-sm text-zinc-200">No public posts from people you follow yet</p>
          </div>
        ) : null
      ) : (
        <MediaShelves items={uploads} onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
      )}
    </div>
  )
}
