import { useMemo, useState, useEffect, useRef } from 'react'
import MediaShelves from './MediaShelves'
import { useAuth } from '../context/AuthContext'
import { getCreatorPublicContent, togglePin, isPinned, resolvePublicCreator } from '../lib/contentService'
import { listPlaylists } from '../lib/youtubeParity'
import { lsGet } from '../lib/storage'
import { getPicsFeed } from '../lib/picsService'
import { getSubscriberCount } from '../lib/engagement'
import { useContentSyncTick } from '../lib/useContentSync'
import { Pin } from 'lucide-react'
import { cn } from '../lib/utils'
import ChannelAvatar from './ChannelAvatar'
import VerifiedBadge from './VerifiedBadge'
import FollowButton from './FollowButton'
import { followersLabel, isOfficialCreator } from '../lib/uiFormat'
import { isVerifiedChannel } from '../lib/verification'

export default function ProfilePage({ onNavigate, profileHandle, profileUserId, onPlayItem, onOpenPic, onOpenProfile, onOpenAuth, onOpenCheckout }) {
  const { user } = useAuth()
  const handle = String(profileHandle || '').toLowerCase().replace(/^@/, '')
  const found = resolvePublicCreator(handle, profileUserId)
  const isSelf = Boolean(
    user && (
      (found?.id && user.id === found.id)
      || (handle && String(user.handle || '').toLowerCase().replace(/^@/, '') === handle)
    )
  )
  const creatorId = found?.id || profileUserId || null
  const [tick, setTick] = useState(0)
  const syncTick = useContentSyncTick()
  const items = useMemo(() => getCreatorPublicContent(creatorId, handle), [creatorId, handle, tick, syncTick])
  const resolvedId = creatorId || items[0]?.creatorId || items[0]?.userId || null
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
  const pickedTab = useRef(false)
  useEffect(() => {
    if (pickedTab.current) return
    if (videos.length) { pickedTab.current = true; return }
    if (clips.length) { setTab('clips'); pickedTab.current = true; return }
    if (pics.length) { setTab('pics'); pickedTab.current = true }
  }, [videos.length, clips.length, pics.length])
  const tabItems = tab === 'pics' ? pics : tab === 'clips' ? clips : tab === 'playlists' || tab === 'live' ? [] : videos
  const displayName = found?.displayName || handle || 'Creator'
  const avatar = found?.avatarUrl || (isSelf ? user?.avatarUrl : null)
  const banner = found?.bannerUrl || (isSelf ? user?.bannerUrl : null)
  const bio = found?.bio || (isSelf ? user?.bio : '') || ''
  const subs = resolvedId ? getSubscriberCount(resolvedId) : 0
  const official = isOfficialCreator(creatorId, handle)
  const verified = isVerifiedChannel(creatorId, handle)

  const onPin = (contentId) => {
    if (!isSelf || !creatorId) return
    togglePin(creatorId, contentId)
    setTick((t) => t + 1)
  }

  return (
    <div className="max-w-[1280px] mx-auto pb-16">
      <div className="relative mx-4 mt-4 h-40 sm:h-52 rounded-2xl overflow-hidden bg-[#272727]">
        {banner ? <img src={banner} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (
          <div className="h-full w-full bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#3a3a3a]" />
        )}
      </div>
      <div className="px-4 -mt-12 relative z-10 flex flex-wrap items-end gap-4">
        <div className="rounded-full ring-4 ring-black">
          <ChannelAvatar src={avatar} name={displayName} size={96} />
        </div>
        <div className="flex-1 min-w-[160px] pb-1">
          <h1 className="text-2xl font-bold text-white inline-flex items-center gap-2">
            {displayName}
            {verified ? <VerifiedBadge className="h-4 w-4" title={official ? 'Official channel' : 'Verified'} /> : null}
          </h1>
          <p className="text-sm text-[#aaa]">@{handle || found?.handle || 'user'}</p>
          <p className="text-xs text-[#aaa] mt-1">
            {[followersLabel(subs), videos.length ? `${videos.length} videos` : '', clips.length ? `${clips.length} clips` : '', pics.length ? `${pics.length} pics` : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-2 pb-1">
          {isSelf ? (
            <button type="button" onClick={() => onNavigate?.('channel')} className="h-9 px-4 rounded-full border border-zinc-700 text-xs text-zinc-200">Customize channel</button>
          ) : (
            <>
              <FollowButton creatorId={resolvedId} handle={handle || found?.handle} onOpenAuth={onOpenAuth} />
              {onOpenCheckout && resolvedId ? (
                <button type="button" onClick={() => onOpenCheckout(resolvedId, handle || found?.handle)} className="h-9 px-4 rounded-full bg-white text-black text-xs font-semibold">
                  Premium
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
      {bio && <p className="px-4 mt-4 text-sm text-zinc-400 max-w-2xl">{bio}</p>}
      <div className="px-4 mt-6 flex gap-6 border-b border-[#272727]">
        {[
          { id: 'videos', label: 'Videos' },
          { id: 'clips', label: 'Shorts' },
          { id: 'pics', label: 'Pics' },
          { id: 'live', label: liveEntry ? '● Live' : 'Live' },
          { id: 'playlists', label: 'Playlists' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'h-10 text-sm font-medium border-b-2 -mb-px',
              tab === t.id ? 'text-white border-white' : 'text-[#aaa] border-transparent hover:text-white',
              t.id === 'live' && liveEntry && tab !== 'live' && 'text-red-400'
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
            filter={tab === 'clips' ? 'clip' : tab === 'pics' ? 'pic' : 'video'}
            onPlayItem={onPlayItem}
            onOpenPic={onOpenPic}
            onOpenProfile={onOpenProfile}
            pinOverlay={(item) => (
              <>
                {(item.pinned || isPinned(creatorId, item.id)) && (
                  <span className="pointer-events-none absolute top-2 left-2 z-10 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white flex items-center gap-0.5"><Pin className="h-3 w-3" /> Pinned</span>
                )}
                {isSelf && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(item.id) }}
                    className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/70 border border-zinc-700 flex items-center justify-center text-white"
                    title="Pin / unpin"
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          />
        )}
      </div>
    </div>
  )
}
