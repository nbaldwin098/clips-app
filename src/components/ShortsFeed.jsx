import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, Clapperboard, Heart, MessageCircle, Search, Share2, Volume2, VolumeX, X, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStableShortsFeed, getWatchItem, getCreatorPublicContent, resolvePublicCreator } from '../lib/contentService'
import { isFeedable } from '../lib/catalogHealth'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { recordView, toggleVote, getVotes, getUserVote, isSubscribed, toggleSubscribe } from '../lib/engagement'
import { getWatchProgress, recordWatchProgress } from '../lib/watchProgress'
import { listComments } from '../lib/youtubeParity'
import { recordInteraction } from '../lib/algorithmEngine'
import { copyShareUrl, replaceHash } from '../lib/routes'
import CommentsPanel from './CommentsPanel'
import ShortsStage, { ShortsCard } from './ShortsStage'
import { preloadPostedItems } from '../lib/preloadMedia'
import { useContentSyncTick } from '../lib/useContentSync'
import { filterCss } from '../lib/streamFilters'
import ChannelAvatar from './ChannelAvatar'

function resolvePlayUrl(item) {
  return item?.mediaUrl || item?.sourceUrl || ''
}

/** Only one clip <video> may play. Off-screen copies (triple-buffer) must stay paused. */
let playingClipEl = null
function pauseOthers(el) {
  if (typeof document === 'undefined') return
  document.querySelectorAll('video').forEach((v) => {
    if (v !== el) {
      try { v.pause() } catch { /* ok */ }
    }
  })
}
function playOnly(el) {
  if (!el) return
  pauseOthers(el)
  playingClipEl = el
  const p = el.play?.()
  if (p && typeof p.then === 'function') {
    p.then(() => {
      if (playingClipEl !== el) {
        try { el.pause() } catch { /* ok */ }
      } else {
        pauseOthers(el)
      }
    }).catch(() => {
      if (playingClipEl !== el) return
      el.muted = true
      el.play?.().then(() => {
        if (playingClipEl !== el) {
          try { el.pause() } catch { /* ok */ }
        }
      }).catch(() => {})
    })
  }
}
function pauseIfPlaying(el) {
  if (!el) return
  try { el.pause() } catch { /* ok */ }
  if (playingClipEl === el) playingClipEl = null
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
  onPrev, onNext, showNav = false,
}) {
  const vidRef = useRef(null)
  const [src, setSrc] = useState(() => resolvePlayUrl(item))
  const [embed, setEmbed] = useState(() => parseEmbedUrl(resolvePlayUrl(item)))
  const [resolving, setResolving] = useState(() => {
    const raw = resolvePlayUrl(item)
    return !(raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:'))
  })
  const [votes, setVotes] = useState(() => getVotes(item.id))
  const [myVote, setMyVote] = useState(() => getUserVote(user?.id, item.id))
  const [heartBurst, setHeartBurst] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [following, setFollowing] = useState(() => isSubscribed(user?.id, item.creatorId || item.userId))
  const [shareCopied, setShareCopied] = useState(false)
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
    playOnly(el)
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

    const http = raw.startsWith('http://') || raw.startsWith('https://')
    if (http) {
      setSrc(parsed?.src || raw)
      setResolving(false)
      return () => { cancelled = true }
    }

    setResolving(true)
    ;(async () => {
      try {
        const idb = await getMediaBlobUrl(item.id)
        if (cancelled) return
        if (idb) {
          setSrc(idb)
          setEmbed({ type: 'video', src: idb, platform: 'direct' })
          setResolving(false)
          return
        }
      } catch {}
      if (!cancelled) {
        setSrc(parsed?.src || raw || '')
        setResolving(false)
      }
    })()
    return () => { cancelled = true }
  }, [item.id, item.mediaUrl, item.sourceUrl])

  useEffect(() => {
    const el = vidRef.current
    if (!el || embed?.type === 'iframe') return undefined
    if (active) playOnly(el)
    else pauseIfPlaying(el)
    return () => pauseIfPlaying(el)
  }, [active, src, embed?.type])

  const bindVideoRef = useCallback((node) => {
    vidRef.current = node
  }, [])

  const onSurfaceClick = () => {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      if (user?.id) {
        const next = toggleVote(user.id, item.id, 'up', {
          creatorId,
          title: item.title,
          surface: 'clips',
          contentType: 'short',
        })
        setVotes(getVotes(item.id))
        setMyVote(getUserVote(user.id, item.id))
        setHeartBurst(true)
        window.setTimeout(() => setHeartBurst(false), 600)
      } else {
        onOpenAuth?.()
      }
    }
    lastTap.current = now
  }

  const holdTimer = useRef(0)
  const holdStart = () => {
    holdTimer.current = window.setTimeout(() => {
      const el = vidRef.current
      if (el) el.pause?.()
    }, 180)
  }
  const holdEnd = () => {
    window.clearTimeout(holdTimer.current)
    if (active) playOnly(vidRef.current)
  }

  const like = (e) => {
    e?.stopPropagation?.()
    if (!user?.id) return onOpenAuth?.()
    toggleVote(user.id, item.id, 'up', {
      creatorId,
      title: item.title,
      surface: 'clips',
      contentType: 'short',
    })
    setVotes(getVotes(item.id))
    setMyVote(getUserVote(user.id, item.id))
  }

  const follow = (e) => {
    e?.stopPropagation?.()
    if (!user?.id) return onOpenAuth?.()
    if (!creatorId) return
    setFollowing(toggleSubscribe(user.id, creatorId))
  }

  const share = async (e) => {
    e?.stopPropagation?.()
    const ok = await copyShareUrl('clip', item.id)
    setShareCopied(ok)
    window.setTimeout(() => setShareCopied(false), 1500)
    if (ok && user?.id && creatorId) {
      recordInteraction(user.id, {
        contentId: item.id,
        type: 'share',
        tags: item.tags || [],
        creatorId,
        title: item.title,
        surface: 'clips',
        contentType: 'short',
      })
    }
  }

  const handle = item.handle ? `@${String(item.handle).replace(/^@/, '')}` : 'creator'
  const isIframe = embed?.type === 'iframe'
  const videoSrc = src || embed?.src || ''

  const actions = (circled) => (
    <>
      <RailBtn onClick={like} label={votes.up || 0} active={myVote === 'up'} circled={circled}>
        <Heart className={`h-6 w-6 ${myVote === 'up' ? 'fill-current' : ''}`} />
      </RailBtn>
      <RailBtn onClick={(e) => { e.stopPropagation(); setCommentsOpen(true) }} label={commentCount || 0} circled={circled}>
        <MessageCircle className="h-6 w-6" />
      </RailBtn>
      <RailBtn onClick={share} label={shareCopied ? 'Copied' : 'Share'} circled={circled}>
        <Share2 className="h-6 w-6" />
      </RailBtn>
      {onStitch ? (
        <RailBtn onClick={(e) => { e.stopPropagation(); onStitch(item) }} label="Stitch" circled={circled}>
          <Clapperboard className="h-6 w-6" />
        </RailBtn>
      ) : null}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenProfile?.(item.handle, creatorId) }}
        data-avatar-btn
        className="h-11 w-11 rounded-full overflow-hidden bg-white/20 text-white text-sm font-semibold flex items-center justify-center ring-2 ring-white/80"
        aria-label={handle}
      >
        <ChannelAvatar
          src={item.avatarUrl || resolvePublicCreator(item.handle, creatorId)?.avatarUrl}
          name={item.displayName || item.handle || 'C'}
          size={44}
        />
      </button>
    </>
  )

  return (
    <ShortsCard actions={actions(true)} fillMobile showNav={showNav} onPrev={onPrev} onNext={onNext}>
      <div className="absolute inset-0 z-[1] pointer-events-none touch-pan-y">
        {isIframe && (active || warm) && safeIframeSrc(videoSrc) ? (
          <iframe
            src={active ? safeIframeSrc(videoSrc) : undefined}
            title={item.title || 'Clip'}
            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (active || warm) && safeMediaUrl(videoSrc) ? (
          <video
            ref={bindVideoRef}
            src={safeMediaUrl(videoSrc)}
            className="absolute inset-0 w-full h-full object-cover bg-black pointer-events-none"
            style={filterCss(item.filterId || item.engagement?.filterId) ? { filter: filterCss(item.filterId || item.engagement?.filterId) } : undefined}
            playsInline
            loop
            muted={muted}
            preload={active ? 'auto' : 'metadata'}
            onTimeUpdate={(e) => {
              const el = e.target
              if (!el?.duration) return
              setProgress(el.currentTime / el.duration)
              if (active && el.currentTime >= 1 && !viewCountedRef.current) {
                viewCountedRef.current = true
                recordView(item.id, {
                  creatorId,
                  title: item.title,
                  actorId: user?.id || null,
                  surface: 'clips',
                  contentType: 'short',
                })
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
                  title: item.title,
                  surface: 'clips',
                  contentType: 'short',
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
        ) : item.thumbUrl ? (
          <img src={item.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : resolving ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">No media</div>
        )}
      </div>
      {/* Hit layer: scroll/wheel reaches the stage; taps still work */}
      <div
        className="absolute inset-0 z-[2] touch-pan-y"
        onClick={onSurfaceClick}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerCancel={holdEnd}
        onPointerLeave={holdEnd}
      />

      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 pt-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBack?.() }}
          className="h-10 w-10 rounded-full text-white flex items-center justify-center"
          aria-label="Back"
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
              {following ? 'Following' : 'Follow'}
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
          {finished ? (
            <button
              type="button"
              onClick={watchAgain}
              className="mt-2 h-8 px-3 rounded-full bg-white/15 text-[12px] text-white inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Watch again
            </button>
          ) : null}
          <div className="mt-2 h-0.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white/80" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="md:hidden absolute right-2 top-20 z-20 flex flex-col items-center gap-4">
        {actions(true)}
      </div>

      {commentsOpen && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[50%] rounded-t-2xl bg-[#121218] border-t border-zinc-800 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-white">Comments</p>
            <button type="button" onClick={() => setCommentsOpen(false)} className="text-zinc-400" aria-label="Close">
              <X className="h-5 w-5" />
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
  const syncTick = useContentSyncTick()
  const recommended = useMemo(() => getStableShortsFeed(user?.id || null), [user?.id, syncTick])
  // Freeze reel order for the session so catalog sync cannot remount / jump the stage.
  const sessionRef = useRef(null)
  const items = useMemo(() => {
    const base = recommended.filter(isFeedable)
    let next = base
    if (focusId && !base.some((i) => i.id === focusId)) {
      const focused = getWatchItem(focusId)
      if (focused && focused.type === 'short' && isFeedable(focused)) {
        const creatorId = focused.creatorId || focused.userId
        const creatorClips = getCreatorPublicContent(creatorId, focused.handle)
          .filter((i) => i.type === 'short' && isFeedable(i) && i.id !== focused.id)
        next = [focused, ...creatorClips, ...base.filter((i) => i.id !== focused.id && !creatorClips.some((c) => c.id === i.id))]
      }
    }
    if (sessionRef.current?.length) {
      const byId = new Map(next.map((i) => [i.id, i]))
      const frozen = sessionRef.current.map((i) => byId.get(i.id) || i).filter(Boolean)
      for (const i of next) {
        if (!frozen.some((f) => f.id === i.id)) frozen.push(i)
      }
      sessionRef.current = frozen
      return frozen
    }
    if (next.length) sessionRef.current = next
    return next
  }, [recommended, focusId])
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(true)
  const goToRef = useRef(null)
  const prevIdx = useRef(0)
  const shownAt = useRef(Date.now())
  const selfNav = useRef(false)
  const landedRef = useRef(false)
  // Clips tab opens straight into the reel — no Recommended grid gate.

  const startIdx = useMemo(() => {
    if (!focusId) return 0
    const i = items.findIndex((item) => item.id === focusId)
    return i >= 0 ? i : 0
  }, [items, focusId])

  useEffect(() => {
    if (selfNav.current) {
      selfNav.current = false
      return
    }
    setActiveIdx(startIdx)
    prevIdx.current = startIdx
    shownAt.current = Date.now()
    goToRef.current?.(startIdx, 'auto')
  }, [focusId]) // only when focus id changes — not on every catalog tick

  // Land on a real clip URL when opening /clips with no id (replace, no remount).
  useEffect(() => {
    if (focusId || landedRef.current) return
    const first = items[0]?.id
    if (!first) return
    landedRef.current = true
    selfNav.current = true
    replaceHash('content', first)
  }, [focusId, items])

  useEffect(() => {
    const from = Math.max(0, activeIdx)
    preloadPostedItems(items.slice(from), 5)
  }, [activeIdx, items])

  const onActiveIndex = useCallback((i) => {
    const prev = items[prevIdx.current]
    const waited = Date.now() - shownAt.current
    if (prev && user?.id && i !== prevIdx.current) {
      recordInteraction(user.id, {
        contentId: prev.id,
        type: waited < 2000 ? 'early_skip' : 'skip',
        tags: prev.tags || [],
        creatorId: prev.creatorId || prev.userId,
        title: prev.title,
        surface: 'clips',
        contentType: 'short',
      })
    }
    shownAt.current = Date.now()
    prevIdx.current = i
    setActiveIdx(i)
    const next = items[i]
    if (next?.id && next.id !== focusId) {
      selfNav.current = true
      replaceHash('content', next.id)
    }
  }, [items, user?.id, focusId])

  const backHome = () => {
    onNavigate?.('home')
  }

  if (!items.length) {
    return (
      <div className="h-full min-h-0 flex flex-col items-center justify-center gap-4 bg-[#000000] px-6 text-center">
        <p className="text-sm text-zinc-300">
          {focusId ? 'This clip is unavailable — it may have been deleted or set to private.' : 'No clips yet.'}
        </p>
        <button
          type="button"
          onClick={backHome}
          className="h-10 px-5 rounded-full bg-white text-black text-sm font-semibold"
        >
          Back home
        </button>
      </div>
    )
  }

  return (
    <ShortsStage
      key="clips-reel"
      count={items.length}
      activeIndex={activeIdx}
      goToRef={goToRef}
      loop={items.length >= 1}
      onActiveIndex={onActiveIndex}
      initialIndex={startIdx}
      bleedMobile
      empty={(
        <div className="h-full flex items-center justify-center text-sm text-zinc-400">No clips</div>
      )}
      renderSlide={(index, active, warm) => {
        const item = items[index]
        return item ? (
          <ClipSlide
            item={item}
            active={active}
            warm={warm}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            user={user}
            onOpenAuth={onOpenAuth}
            onOpenProfile={onOpenProfile}
            onOpenSound={onOpenSound}
            onStitch={onStitch}
            onBack={backHome}
            onSearch={() => onNavigate?.('explore')}
            showNav={items.length > 1}
            onPrev={() => goToRef.current?.((activeIdx - 1 + items.length) % items.length)}
            onNext={() => goToRef.current?.((activeIdx + 1) % items.length)}
          />
        ) : null
      }}
    />
  )
}
