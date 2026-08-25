import { useMemo, useEffect, useState, useRef } from 'react'
import { ChevronLeft, Clapperboard, Heart, MessageCircle, Search, Share2, Volume2, VolumeX, X, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStableShortsFeed, getStableFollowingFeed, getWatchItem, getCreatorPublicContent } from '../lib/contentService'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { recordView, toggleVote, getVotes, getUserVote, isSubscribed, toggleSubscribe } from '../lib/engagement'
import { getWatchProgress, recordWatchProgress } from '../lib/watchProgress'
import { listComments } from '../lib/youtubeParity'
import { recordInteraction } from '../lib/algorithmEngine'
import { copyShareUrl } from '../lib/routes'
import CommentsPanel from './CommentsPanel'
import ShortsStage, { ShortsCard } from './ShortsStage'
import ShortsGrid from './ShortsGrid'
import ExoClickDisplay, { clipBannerAllowed, EXOCLICK_BANNER_ZONE, EXOCLICK_BANNER_CLASS } from './ExoClickDisplay'
import { mixFeedAds } from '../lib/adEngine'
import { shuffleFeed } from '../lib/shuffleFeed'
import { preloadPostedItems } from '../lib/preloadMedia'

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
  item, active, warm = false, muted, onToggleMute, user, onOpenAuth, onOpenProfile, onOpenSound, onStitch, onBack, onSearch,
  showBanner = false,
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
  const viewCountedRef = useRef(false)
  const creatorId = item.creatorId || item.userId
  const commentCount = listComments(item.id).length
  const [finished, setFinished] = useState(() => Boolean(user?.id && getWatchProgress(user.id, item.id)?.completed))

  useEffect(() => {
    setFinished(Boolean(user?.id && getWatchProgress(user.id, item.id)?.completed))
  }, [user?.id, item.id, progress])

  const watchAgain = (e) => {
    e?.stopPropagation?.()
    const el = vidRef.current
    if (!el) return
    try { el.currentTime = 0 } catch {}
    el.play?.().catch(() => {
      el.muted = true
      el.play()?.catch(() => {})
    })
    if (user?.id) {
      recordWatchProgress(user.id, {
        contentId: item.id,
        title: item.title,
        sourceUrl: item.sourceUrl || item.mediaUrl,
        watchRatio: 0,
        durationSec: el.duration || item.durationSec || 0,
        positionSec: 0,
        creatorId,
        handle: item.handle,
      })
    }
  }

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
    viewCountedRef.current = false
  }, [item.id])

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
      {finished ? (
        <RailBtn circled={circled} onClick={watchAgain} label="Again">
          <RotateCcw className="h-6 w-6" />
        </RailBtn>
      ) : null}
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
            preload={active || warm ? 'auto' : 'metadata'}
            onTimeUpdate={(e) => {
              const el = e.target
              if (!el?.duration) return
              setProgress(el.currentTime / el.duration)
              if (active && el.currentTime >= 1 && !viewCountedRef.current) {
                viewCountedRef.current = true
                recordView(item.id)
              }
              if (active && user?.id && el.duration && el.currentTime / el.duration >= 0.92) {
                recordWatchProgress(user.id, {
                  contentId: item.id,
                  title: item.title,
                  sourceUrl: item.sourceUrl || item.mediaUrl,
                  watchRatio: el.currentTime / el.duration,
                  durationSec: el.duration,
                  positionSec: el.currentTime,
                  creatorId,
                  handle: item.handle,
                })
                setFinished(true)
              }
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
          {item.description && String(item.description).trim() !== String(item.title || '').trim() ? (
            <p className="text-[12px] text-white/80 mt-1 line-clamp-2 drop-shadow pr-16 md:pr-4">{item.description}</p>
          ) : null}
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
          {showBanner ? (
            <div className="mt-2 mr-16 md:mr-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <ExoClickDisplay zoneId={EXOCLICK_BANNER_ZONE} insClass={EXOCLICK_BANNER_CLASS} className="min-h-[90px]" />
            </div>
          ) : null}
        </div>
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

function ClipFeedAdSlide({ active }) {
  const [empty, setEmpty] = useState(false)
  if (empty) {
    return (
      <div className="h-full w-full max-w-md mx-auto bg-black flex items-center justify-center px-4">
        <p className="text-[11px] text-white/50">Swipe for the next clip</p>
      </div>
    )
  }
  return (
    <div className="h-full w-full max-w-md mx-auto bg-black flex flex-col items-center justify-center px-4">
      <p className="shrink-0 px-3 py-2 text-[11px] text-white/70">Sponsored · swipe for the next clip</p>
      <ExoClickDisplay
        active={active}
        zoneId={EXOCLICK_BANNER_ZONE}
        insClass={EXOCLICK_BANNER_CLASS}
        className="max-h-[70vh] w-full rounded-xl min-h-[250px]"
        onFill={(ok) => { if (!ok) setEmpty(true) }}
      />
    </div>
  )
}

export default function ShortsFeed({
  onOpenAuth, onOpenProfile, onOpenSound, onStitch, onNavigate, focusId,
}) {
  const { user } = useAuth()
  const [tab, setTab] = useState('recommended')
  const recommended = useMemo(() => getStableShortsFeed(user?.id || null), [user?.id])
  const following = useMemo(() => getStableFollowingFeed(user?.id, { shortsOnly: true }), [user?.id])
  const items = useMemo(() => {
    const base = tab === 'following' ? following : recommended
    if (!focusId) return base

    // Click stash / catalog — same resolver watch uses. Profile and "Also on"
    // open clips that are often missing from the frozen home shorts feed.
    const focused = getWatchItem(focusId)
    if (!focused || focused.type !== 'short') {
      // Still try to keep the player usable if the id is already in the feed.
      if (base.some((i) => i.id === focusId)) return base
      return base
    }

    // Prefer that creator's clips so a channel-page tap stays on their reel
    // instead of dumping into a random global shuffle.
    const creatorId = focused.creatorId || focused.userId
    const creatorClips = getCreatorPublicContent(creatorId, focused.handle)
      .filter((i) => i.type === 'short')
    const pool = creatorClips.length ? creatorClips : base
    const rest = pool.filter((i) => i.id !== focused.id)
    return [focused, ...rest]
  }, [tab, following, recommended, focusId])
  // In the player, keep the focused clip first — never reshuffle it away.
  const mixed = useMemo(
    () => mixFeedAds(focusId ? items : shuffleFeed(items), 'clip-feed'),
    [items, focusId],
  )
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(true)
  const [bannerSlide, setBannerSlide] = useState(null)
  const sinceBanner = useRef(0)
  const shownAt = useRef(Date.now())
  const prevIdx = useRef(0)
  const inPlayer = Boolean(focusId)
  const startIdx = useMemo(() => {
    if (!focusId || !mixed.length) return 0
    const idx = mixed.findIndex((row) => row.item?.id === focusId)
    // Focused clip is prepended before ads are mixed; if an ad landed first,
    // still land on the clip. Never fall back to 0 when the id is missing —
    // that used to open a random sponsored slide.
    return idx >= 0 ? idx : 0
  }, [focusId, mixed])

  useEffect(() => { setActiveIdx(startIdx) }, [startIdx])
  useEffect(() => {
    const from = inPlayer ? activeIdx + 1 : 0
    preloadPostedItems(mixed.slice(from), inPlayer ? 3 : 2)
  }, [mixed, activeIdx, inPlayer])

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
      count={mixed.length}
      activeIndex={activeIdx}
      onActiveIndex={(i) => {
        const prev = mixed[prevIdx.current]?.item
        const waited = Date.now() - shownAt.current
        if (prev && user?.id && i !== prevIdx.current) {
          recordInteraction(user.id, {
            contentId: prev.id,
            type: waited < 2000 ? 'early_skip' : 'skip',
            tags: prev.tags || [],
            creatorId: prev.creatorId || prev.userId,
          })
        }
        if (i !== prevIdx.current && mixed[i]?.kind === 'item') {
          sinceBanner.current += 1
          if (clipBannerAllowed(mixed, i, sinceBanner.current)) {
            sinceBanner.current = 0
            setBannerSlide(i)
          } else {
            setBannerSlide(null)
          }
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
      renderSlide={(index, active, warm) => {
        const row = mixed[index]
        if (row?.kind === 'ad') {
          return (
            <ClipFeedAdSlide active={active} />
          )
        }
        return row?.item ? (
          <ClipSlide
            item={row.item}
            active={active}
            warm={warm}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            user={user}
            onOpenAuth={onOpenAuth}
            onOpenProfile={onOpenProfile}
            onOpenSound={onOpenSound}
            onStitch={onStitch}
            onBack={backToGrid}
            onSearch={() => onNavigate?.('explore')}
            showBanner={active && (bannerSlide === index || clipBannerAllowed(mixed, index))}
          />
        ) : null
      }}
    />
  )
}
