import { useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import MediaShelves from './MediaShelves'
import { useAuth } from '../context/AuthContext'
import { listIndexedUsers } from '../lib/moderation'
import { getCreatorPublicContent, togglePin, isPinned } from '../lib/contentService'
import { listPlaylists } from '../lib/youtubeParity'
import { lsGet } from '../lib/storage'
import { getPicsFeed } from '../lib/picsService'
import { getSubscriberCount, getCreatorRanking, toggleSubscribe, isSubscribed } from '../lib/engagement'
import { useContentSyncTick } from '../lib/useContentSync'
import { Pin } from 'lucide-react'
import { cn } from '../lib/utils'

export default function ProfilePage({ onNavigate, profileHandle, profileUserId, onPlayItem, onOpenPic }) {
  const { user, isAuthenticated } = useAuth()
  const handle = String(profileHandle || '').toLowerCase().replace(/^@/, '')
  const users = listIndexedUsers()
  const found =
    users.find((u) => String(u.handle || '').toLowerCase() === handle) ||
    users.find((u) => u.id === profileUserId) ||
    null
  const isSelf = user && found && user.id === found.id
  const creatorId = found?.id || profileUserId || null
  const [tick, setTick] = useState(0)
  const syncTick = useContentSyncTick()
  const items = useMemo(() => getCreatorPublicContent(creatorId, handle), [creatorId, handle, tick, syncTick])
  const playlists = useMemo(() => (creatorId ? listPlaylists(creatorId) : []), [creatorId, tick, syncTick])
  const liveEntry = useMemo(() => {
    const board = (lsGet('live_board', []) || []).filter((b) => b.isLive)
    return board.find((b) => (creatorId && b.userId === creatorId) || (handle && String(b.handle || '').toLowerCase() === handle)) || null
  }, [creatorId, handle, tick, syncTick])
  const pics = useMemo(() => {
    return getPicsFeed().filter((p) => {
      if (creatorId && (p.creatorId === creatorId)) return true
      if (handle && String(p.handle || '').toLowerCase() === handle) return true
      return false
    })
  }, [creatorId, handle, tick, syncTick])
  const [tab, setTab] = useState('videos')
  const videos = items.filter((i) => i.type === 'video')
  const clips = items.filter((i) => i.type === 'short')
  const tabItems = tab === 'pics' ? pics : tab === 'clips' ? clips : tab === 'playlists' || tab === 'live' ? [] : videos
  const displayName = found?.displayName || handle || 'Creator'
  const avatar = found?.avatarUrl || (isSelf ? user?.avatarUrl : null)
  const banner = found?.bannerUrl || (isSelf ? user?.bannerUrl : null)
  const bio = found?.bio || (isSelf ? user?.bio : '') || ''
  const subs = creatorId ? getSubscriberCount(creatorId) : 0
  const rank = creatorId ? getCreatorRanking(creatorId) : null
  const subscribed = user && creatorId ? isSubscribed(user.id, creatorId) : false

  const onPin = (contentId) => {
    if (!isSelf || !creatorId) return
    togglePin(creatorId, contentId)
    setTick((t) => t + 1)
  }

  return (
    <div className="max-w-[1000px] mx-auto pb-16">
      <div className="px-4 pt-4">
        <PageHeader title="Profile" onBack={() => onNavigate?.('home')} />
      </div>
      <div className="relative mx-4 h-36 sm:h-44 rounded-xl overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-800 to-white/30 border border-zinc-800">
        {banner ? <img src={banner} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
      </div>
      <div className="px-4 -mt-10 relative z-10 flex flex-wrap items-end gap-4">
        <div className="h-24 w-24 rounded-full border-4 border-[#000000] bg-white/30 flex items-center justify-center text-3xl font-semibold text-white overflow-hidden">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (displayName[0] || '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-[160px] pb-1">
          <h1 className="text-xl font-semibold text-zinc-100">{displayName}</h1>
          <p className="text-sm text-zinc-500">@{handle || found?.handle || 'user'}</p>
          <p className="text-xs text-zinc-500 mt-1">{subs} followers{rank != null ? ` · Rank #${rank}` : ''} · {videos.length} videos · {clips.length} clips · {pics.length} pics</p>
        </div>
        <div className="flex gap-2 pb-1">
          {isSelf ? (
            <button type="button" onClick={() => onNavigate?.('channel')} className="h-9 px-4 rounded-full border border-zinc-700 text-xs text-zinc-200">Customize channel</button>
          ) : (
            isAuthenticated && creatorId && (
              <button type="button" onClick={() => { toggleSubscribe(user.id, creatorId); setTick((t) => t + 1) }} className={`h-9 px-4 rounded-full text-xs font-medium ${subscribed ? 'border border-zinc-700 text-zinc-300' : 'bg-white text-black'}`}>
                {subscribed ? 'Following' : 'Follow'}
              </button>
            )
          )}
        </div>
      </div>
      {bio && <p className="px-4 mt-4 text-sm text-zinc-400 max-w-2xl">{bio}</p>}
      <div className="px-4 mt-6 flex gap-1.5">
        {[
          { id: 'videos', label: `Videos ${videos.length}` },
          { id: 'clips', label: `Clips ${clips.length}` },
          { id: 'pics', label: `Pics ${pics.length}` },
          { id: 'live', label: liveEntry ? 'Live now' : 'Live' },
          { id: 'playlists', label: `Playlists ${playlists.length}` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-medium border',
              tab === t.id ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="px-4 mt-4">
        {tab === 'live' ? (
          liveEntry ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">Live</p>
              <p className="text-sm text-white mt-2">{liveEntry.title}</p>
              {liveEntry.category ? <p className="text-xs text-zinc-500 mt-1">{liveEntry.category}</p> : null}
              <p className="text-xs text-zinc-600 mt-3">Live video ingest is not connected. This is a presence listing only.</p>
              <button type="button" onClick={() => onNavigate?.('live')} className="mt-4 h-9 px-4 rounded-lg bg-white text-black text-xs font-bold">Open Live</button>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 py-12 text-center border border-zinc-800 rounded-2xl bg-[#121218]">Not live right now.</p>
          )
        ) : tab === 'playlists' ? (
          playlists.length === 0 ? (
            <p className="text-sm text-zinc-500 py-12 text-center border border-zinc-800 rounded-2xl bg-[#121218]">No playlists yet.</p>
          ) : (
            <div className="space-y-2">
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onNavigate?.('playlists', p.id)}
                  className="w-full text-left rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3"
                >
                  <p className="text-sm text-white">{p.title}</p>
                  <p className="text-xs text-zinc-500">{(p.items || []).length} items</p>
                </button>
              ))}
            </div>
          )
        ) : tabItems.length === 0 ? (
          <p className="text-sm text-zinc-500 py-12 text-center border border-zinc-800 rounded-2xl bg-[#121218]">Nothing in this tab yet.</p>
        ) : (
          <MediaShelves
            items={tabItems}
            onPlayItem={onPlayItem}
            onOpenPic={onOpenPic}
            pinOverlay={(item) => (
              <>
                {(item.pinned || isPinned(creatorId, item.id)) && (
                  <span className="absolute top-2 left-2 z-10 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white flex items-center gap-0.5"><Pin className="h-3 w-3" /> Pinned</span>
                )}
                {isSelf && (
                  <button type="button" onClick={() => onPin(item.id)} className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/70 border border-zinc-700 flex items-center justify-center text-white" title="Pin / unpin"><Pin className="h-3.5 w-3.5" /></button>
                )}
              </>
            )}
          />
        )}
      </div>
    </div>
  )
}
