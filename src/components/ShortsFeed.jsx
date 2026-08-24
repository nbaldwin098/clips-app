import { useMemo, useEffect, useState, useRef } from 'react'
import { ChevronLeft, Clapperboard, Heart, MessageCircle, Search, Share2, Volume2, VolumeX, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStableShortsFeed, getStableFollowingFeed } from '../lib/contentService'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { recordView, toggleVote, getVotes, getUserVote, isSubscribed, toggleSubscribe } from '../lib/engagement'
import { listComments } from '../lib/youtubeParity'
import { recordInteraction } from '../lib/algorithmEngine'
import { copyShareUrl } from '../lib/routes'
import CommentsPanel from './CommentsPanel'
import ShortsStage, { ShortsCard } from './ShortsStage'
import ShortsGrid from './ShortsGrid'
import { PlacementBanner } from './AdUnits'

function resolvePlayUrl(item) {
  return item?.mediaUrl || item?.sourceUrl || ''
}

function RailBtn({ onClick, label, children, active = false, circled = true }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      {circled ? (
        <span className={`h-11 w-11 rounded-full bg-[#272727] hover:bg-[#3d3d3d] flex items-center justify-center ${active ? 'text-red-400' : 'text-white'}`}>
          {children}
        </span>
      ) : (
        <span className={`drop-shadow-md ${active ? 'text-red-400' : 'text-white'}`}>{children}</span>
      )}
      {label != null ? <span className="text-[11px] text-white font-medium drop-shadow">{label}</span> : null}
    </button>
  )
}

function ClipSlide({
  item, active, muted, onToggleMute, user, onOpenAuth, onOpenProfile, onOpenSound, onStitch, onBack, onSearch,
}) {
  const vidRef = useRef(null)
  const [src, setSrc] = useState(() => resolvePlayUrl(item))
  const [embed, setEmbed] = useState(() => parseEmbedUrl(resolvePlayUrl(item)))
  const [votes, setVotes] = useState(() => getVotes(item.id))
  const [myVote, setMyVote] = useState(() => getUserVote(user?.id, item.id))
  const [heartBurst, setHeartBurst] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [following, setFollowing] = useState(() => isSubscribed(user?.id, item.creatorId || item.userId))
  const lastTap = useRef(0)
  const lastTime = useRef(0)
  const looped = useRef(false)
  const creatorId = item.creatorId || item.userId
  const commentCount = listComments(item.id).length

  useEffect(() => {
    let cancelled = false
    const raw = resolvePlayUrl(item)
    const parsed = parseEmbedUrl(raw)
    setEmbed(parsed)

    ;(async () => {
      try {
        const idb = await getMediaBlobUrl(item.id)
        if (cancelled) return
        if (idb) {
          setSrc(idb)
          setEmbed({ type: 'video', src: idb, platform: 'direct' })
          return
        }
      } catch {}
      if (!cancelled) setSrc(parsed?.src || raw)
    })()

    return () => { cancelled = true }
  }, [item.id, item.mediaUrl, item.sourceUrl])

  useEffect(() => {
    const el = vidRef.current
    if (!el || embed?.type === 'iframe') return
    if (active) {
      el.muted = muted
      el.playbackRate = 1
      const p = el.play()
      if (p?.catch) p.catch(() => {
        el.muted = true
        el.play()?.catch(() => {})
      })
      recordView(item.id)
      if (user?.id) {
        recordInteraction(user.id, {
          contentId: item.id,
          type: 'impression',
          tags: item.tags || [],
          creatorId,
        })
      }
    } else {
      el.pause()
      try { el.currentTime = 0 } catch {}
    }
  }, [active, muted, item.id, embed?.type, user?.id, creatorId, item.tags])

  const like = (e) => {
    e?.stopPropagation?.()
    if (!user?.id) { onOpenAuth?.(); return }
    const next = toggleVote(user.id, item.id, 'up')
    setVotes({ ...next })
    setMyVote(getUserVote(user.id, item.id))
    setHeartBurst(true)
    setTimeout(() => setHeartBurst(false), 500)
    recordInteraction(user.id, {
      contentId: item.id,
      type: 'upvote',
      tags: item.tags || [],
      creatorId,
    })
  }

  const follow = (e) => {
    e?.stopPropagation?.()
    if (!user?.id) { onOpenAuth?.(); return }
    if (!creatorId) return
    setFollowing(toggleSubscribe(user.id, creatorId))
  }

  const onSurfaceClick = () => {
    const now = Date.now()
    if (now - lastTap.current < 280) like()
    lastTap.current = now
  }

  const holdStart = () => {
    const el = vidRef.current
    if (el) el.playbackRate = 2
  }
  const holdEnd = () => {
    const el = vidRef.current
    if (el) el.playbackRate = 1
  }

  const share = async (e) => {
    e?.stopPropagation?.()
    try {
      await copyShareUrl('clips', item.id)
      if (user?.id) {
        recordInteraction(user.id, {
          contentId: item.id,
          type: 'share',
          tags: item.tags || [],
          creatorId,
        })
      }
    } catch {}
  }

  const handle = item.handle ? `@${String(item.handle).replace(/^@/, '')}` : '@creator'
  const initial = String(item.handle || 'C').replace(/^@/, '').slice(0, 1).toUpperCase()
  const videoSrc = embed?.src || src
  const isIframe = embed?.type === 'iframe'

  const actions = (circled) => (
    <>
      <RailBtn circled={circled} onClick={like} label={votes.up || 0} active={myVote === 'up'}>
        <Heart className={`h-7 w-7 ${myVote === 'up' ? 'fill-current' : ''}`} />
      </RailBtn>
      <RailBtn circled={circled} onClick={() => setCommentsOpen(true)} label={commentCount}>
        <MessageCircle className="h-7 w-7" />
      </RailBtn>
      <RailBtn circled={circled} onClick={share} label="Share">
        <Share2 className="h-7 w-7" />
      </RailBtn>
      <RailBtn
        circled={circled}
        onClick={(e) => { e?.stopPropagation?.(); if (!user?.id) { onOpenAuth?.(); return } onStitch?.(item) }}
        label="Stitch"
      >
        <Clapperboard className="h-6 w-6" />
      </RailBtn>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenProfile?.(item.handle, creatorId) }}
        className="h-11 w-11 rounded-full overflow-hidden bg-white/20 text-white text-sm font-semibold flex items-center justify-center ring-2 ring-white/80"
        aria-label={handle}
      >
        {item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
      </button>
    </>
  )

  return (
    <ShortsCard actions={actions(true)} fillMobile>
      <div
        className="absolute inset-0"
        onClick={onSurfaceClick}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerCancel={holdEnd}
        onPointerLeave={holdEnd}
      >
        {isIframe && safeIframeSrc(videoSrc) ? (
          <iframe
            src={active ? safeIframeSrc(videoSrc) : undefined}
            title={item.title || 'Clip'}
            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : safeMediaUrl(videoSrc) ? (
          <video
            ref={(el) => { vidRef.current = el }}
            src={safeMediaUrl(videoSrc)}
            className="absolute inset-0 w-full h-full object-cover md:object-contain bg-black pointer-events-none"
            playsInline
            loop
            muted={muted}
            preload={active ? 'auto' : 'metadata'}
            onTimeUpdate={(e) => {
              const el = e.target
              if (!el?.duration) return
              setProgress(el.currentTime / el.duration)
              if (el.currentTime + 0.35 < lastTime.current && user?.id && !looped.current) {
                looped.current = true
                recordInteraction(user.id, {
                  contentId: item.id,
                  type: 'loop',
                  tags: item.tags || [],
                  creatorId,
                })
                setTimeout(() => { looped.current = false }, 400)
              }
              lastTime.current = el.currentTime
            }}
            onError={() => {
              getMediaBlobUrl(item.id).then((idb) => {
                if (idb) {
                  setSrc(idb)
                  setEmbed({ type: 'video', src: idb, platform: 'direct' })
                }
              }).catch(() => {})
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">No media</div>
        )}
      </div>

      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 pt-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBack?.() }}
          className="h-10 w-10 rounded-full text-white flex items-center justify-center"
          aria-label="Back to clips"
        >
          <ChevronLeft className="h-7 w-7 drop-shadow" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleMute?.() }}
            className="h-10 w-10 rounded-full text-white flex items-center justify-center"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-5 w-5 drop-shadow" /> : <Volume2 className="h-5 w-5 drop-shadow" />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSearch?.() }}
            className="h-10 w-10 rounded-full text-white flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="h-5 w-5 drop-shadow" />
          </button>
        </div>
      </div>

      {heartBurst && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <Heart className="h-20 w-20 text-white fill-white drop-shadow-lg" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="pt-24 pb-2 px-3 bg-gradient-to-t from-black/80 via-black/25 to-transparent">
          <div className="flex items-center gap-2 pr-16 md:pr-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenProfile?.(item.handle, creatorId) }}
              className="text-sm font-semibold text-white drop-shadow"
            >
              {item.displayName || handle}
            </button>
            <button
              type="button"
              onClick={follow}
              className={`h-7 px-3 rounded-full text-xs font-semibold ${
                following ? 'bg-white/15 text-white' : 'bg-white text-black'
              }`}
            >
              {following ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
          <p className="text-sm text-white mt-2 line-clamp-2 drop-shadow pr-16 md:pr-4">{item.title || 'Untitled'}</p>
          {item.soundTitle ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenSound?.(item.soundId || item.soundTitle) }}
              className="mt-2 max-w-[80%] h-8 px-3 rounded-full bg-black/45 text-[12px] text-white inline-flex items-center gap-2"
            >
              <span className="h-4 w-4 rounded-full bg-white/90" />
              <span className="truncate">{item.soundTitle}</span>
            </button>
          ) : null}
        </div>
        <PlacementBanner placement="clip-banner" itemId={item.id} />
        <div className="h-0.5 bg-white/20">
          <div className="h-full bg-white" style={{ width: `${Math.round((progress || 0) * 100)}%` }} />
        </div>
      </div>

      <div className="md:hidden absolute right-2 bottom-36 flex flex-col items-center gap-5 z-10">
        {actions(false)}
      </div>

      {commentsOpen && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[50%] rounded-t-2xl bg-[#121218] border-t border-zinc-800 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-white">Comments</p>
            <button type="button" onClick={() => setCommentsOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 pb-6">
            <CommentsPanel contentId={item.id} creatorId={creatorId} />
          </div>
        </div>
      )}
    </ShortsCard>
  )
}

export default function ShortsFeed({
  onOpenAuth, onOpenProfile, onOpenSound, onStitch, onNavigate, focusId,
}) {
  const { user } = useAuth()
  const [tab, setTab] = useState('recommended')
  const recommended = useMemo(() => getStableShortsFeed(user?.id || null), [user?.id])
  const following = useMemo(() => getStableFollowingFeed(user?.id, { shortsOnly: true }), [user?.id])
  const items = tab === 'following' ? following : recommended
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(true)
  const shownAt = useRef(Date.now())
  const prevIdx = useRef(0)
  const inPlayer = Boolean(focusId)
  const startIdx = useMemo(() => {
    if (!focusId || !items.length) return 0
    const idx = items.findIndex((i) => i.id === focusId)
    return idx >= 0 ? idx : 0
  }, [focusId, items])

  useEffect(() => { setActiveIdx(startIdx) }, [startIdx])

  const openClip = (item) => onNavigate?.('clips', item.id)
  const backToGrid = () => {
    setTab('recommended')
    onNavigate?.('clips')
  }

  if (!inPlayer) {
    return (
      <ShortsGrid
        items={tab === 'following' ? following : recommended}
        onOpen={openClip}
        tab={tab}
        onTab={setTab}
      />
    )
  }

  return (
    <ShortsStage
      key={`clips-player-${tab}`}
      count={items.length}
      activeIndex={activeIdx}
      onActiveIndex={(i) => {
        const prev = items[prevIdx.current]
        const waited = Date.now() - shownAt.current
        if (prev && user?.id && i !== prevIdx.current) {
          recordInteraction(user.id, {
            contentId: prev.id,
            type: waited < 2000 ? 'early_skip' : 'skip',
            tags: prev.tags || [],
            creatorId: prev.creatorId || prev.userId,
          })
        }
        shownAt.current = Date.now()
        prevIdx.current = i
        setActiveIdx(i)
      }}
      initialIndex={startIdx}
      bleedMobile
      empty={(
        <div className="h-full flex items-center justify-center text-sm text-zinc-400">No clips</div>
      )}
      renderSlide={(index, active) => (
        items[index] ? (
          <ClipSlide
            item={items[index]}
            active={active}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            user={user}
            onOpenAuth={onOpenAuth}
            onOpenProfile={onOpenProfile}
            onOpenSound={onOpenSound}
            onStitch={onStitch}
            onBack={backToGrid}
            onSearch={() => onNavigate?.('explore')}
          />
        ) : null
      )}
    />
  )
}
