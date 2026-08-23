import { useMemo, useEffect, useState, useRef } from 'react'
import { Clapperboard, Heart, MessageCircle, Share2, Volume2, VolumeX, Music, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getShortsFeed, getFollowingFeed } from '../lib/contentService'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { safeIframeSrc, safeMediaUrl } from '../lib/safeUrl'
import { recordView, getViews, toggleVote, getVotes, getUserVote } from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { copyShareUrl } from '../lib/routes'
import { useContentSyncTick } from '../lib/useContentSync'
import { cn } from '../lib/utils'
import CommentsPanel from './CommentsPanel'
import ShortsStage, { ShortsCard } from './ShortsStage'

function resolvePlayUrl(item) {
  return item?.mediaUrl || item?.sourceUrl || ''
}

function ActionBtn({ onClick, label, children, active = false }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <span className={`h-11 w-11 rounded-full bg-[#272727] hover:bg-[#3d3d3d] flex items-center justify-center ${active ? 'text-red-400' : 'text-white'}`}>
        {children}
      </span>
      {label != null ? <span className="text-[11px] text-white font-medium">{label}</span> : null}
    </button>
  )
}

function ClipSlide({
  item, active, muted, onToggleMute, user, onOpenAuth, onOpenProfile, onOpenSound, onStitch,
}) {
  const vidRef = useRef(null)
  const [src, setSrc] = useState(() => resolvePlayUrl(item))
  const [embed, setEmbed] = useState(() => parseEmbedUrl(resolvePlayUrl(item)))
  const [votes, setVotes] = useState(() => getVotes(item.id))
  const [myVote, setMyVote] = useState(() => getUserVote(user?.id, item.id))
  const [views, setViews] = useState(() => getViews(item.id))
  const [heartBurst, setHeartBurst] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const lastTap = useRef(0)
  const lastTime = useRef(0)
  const looped = useRef(false)

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
      const n = recordView(item.id)
      setViews(n)
      if (user?.id) {
        recordInteraction(user.id, {
          contentId: item.id,
          type: 'impression',
          tags: item.tags || [],
          creatorId: item.creatorId || item.userId,
        })
      }
    } else {
      el.pause()
      try { el.currentTime = 0 } catch {}
    }
  }, [active, muted, item.id, embed?.type, user?.id])

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
      creatorId: item.creatorId || item.userId,
    })
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
      await copyShareUrl('watch', item.id)
      if (user?.id) {
        recordInteraction(user.id, {
          contentId: item.id,
          type: 'share',
          tags: item.tags || [],
          creatorId: item.creatorId || item.userId,
        })
      }
    } catch {}
  }

  const handle = item.handle ? `@${String(item.handle).replace(/^@/, '')}` : '@creator'
  const videoSrc = embed?.src || src
  const isIframe = embed?.type === 'iframe'

  const actions = (
    <>
      <ActionBtn onClick={like} label={votes.up || 0} active={myVote === 'up'}>
        <Heart className={`h-6 w-6 ${myVote === 'up' ? 'fill-current' : ''}`} />
      </ActionBtn>
      <ActionBtn onClick={() => setCommentsOpen(true)}>
        <MessageCircle className="h-5 w-5" />
      </ActionBtn>
      <ActionBtn onClick={share}>
        <Share2 className="h-5 w-5" />
      </ActionBtn>
      <ActionBtn
        onClick={(e) => { e?.stopPropagation?.(); if (!user?.id) { onOpenAuth?.(); return } onStitch?.(item) }}
        label="Stitch"
      >
        <Clapperboard className="h-5 w-5" />
      </ActionBtn>
    </>
  )

  return (
    <ShortsCard
      actions={actions}
    >
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
            className="absolute inset-0 w-full h-full object-contain bg-black pointer-events-none"
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
                  creatorId: item.creatorId || item.userId,
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

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleMute?.() }}
        className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {heartBurst && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <Heart className="h-20 w-20 text-white fill-white drop-shadow-lg" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 pt-20 pb-5 px-3 bg-gradient-to-t from-black/80 to-transparent z-10">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenProfile?.(item.handle, item.creatorId || item.userId) }}
          className="text-sm font-semibold text-white drop-shadow"
        >
          {handle}
        </button>
        <p className="text-sm text-white/95 mt-1 line-clamp-2 drop-shadow">{item.title || 'Untitled'}</p>
        {item.soundTitle ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenSound?.(item.soundId || item.soundTitle) }}
            className="mt-2 text-[11px] text-white/80 inline-flex items-center gap-1"
          >
            <Music className="h-3 w-3" />{item.soundTitle}
          </button>
        ) : null}
        <p className="text-[10px] text-white/50 mt-2">{views} views</p>
      </div>

      <div className="md:hidden absolute right-2 bottom-28 flex flex-col items-center gap-3 z-10">
        {actions}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-white/15">
        <div className="h-full bg-white" style={{ width: `${Math.round((progress || 0) * 100)}%` }} />
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
            <CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} />
          </div>
        </div>
      )}
    </ShortsCard>
  )
}

export default function ShortsFeed({ onOpenAuth, onOpenProfile, onOpenSound, onStitch, focusId }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const [tab, setTab] = useState('recommended')
  const recommended = useMemo(() => getShortsFeed(user?.id || null), [user?.id, syncTick])
  const following = useMemo(() => getFollowingFeed(user?.id, { shortsOnly: true }), [user?.id, syncTick])
  const items = tab === 'following' ? following : recommended
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(true)
  const startIdx = useMemo(() => {
    if (!focusId || !items.length) return 0
    const idx = items.findIndex((i) => i.id === focusId)
    return idx >= 0 ? idx : 0
  }, [focusId, items])

  useEffect(() => { setActiveIdx(startIdx) }, [startIdx])

  const empty = (
    <div className="h-full min-h-[60vh] flex items-center justify-center p-6">
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center max-w-md">
        <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
          <Clapperboard className="h-6 w-6 text-white" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-200">
          {tab === 'following' && recommended.length > 0 ? 'Follow creators to fill this feed.' : 'No clips yet'}
        </p>
        <p className="mt-1.5 text-xs text-zinc-500">Upload a Clip from +.</p>
      </div>
    </div>
  )

  return (
    <ShortsStage
      key={`clips-${tab}`}
      count={items.length}
      activeIndex={activeIdx}
      onActiveIndex={setActiveIdx}
      initialIndex={startIdx}
      empty={empty}
      header={(
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <div className="flex gap-1 rounded-full bg-black/40 p-1">
            {['recommended', 'following'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setActiveIdx(0) }}
                className={cn(
                  'h-7 px-3 rounded-full text-[11px] font-semibold',
                  tab === id ? 'bg-white text-black' : 'text-white/70'
                )}
              >
                {id === 'recommended' ? 'Recommended' : 'Following'}
              </button>
            ))}
          </div>
        </div>
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
        />
        ) : null
      )}
    />
  )
}
